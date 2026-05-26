import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

const sourceDir = path.join(process.cwd(), 'public/assets/tiles');
const outputDir = path.join(process.cwd(), 'public/assets/tiles-processed');
const blackThreshold = Number(process.env.TILE_BLACK_THRESHOLD ?? 28);

const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function readChunks(buf) {
  let o = 8;
  const chunks = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o);
    const type = buf.slice(o + 4, o + 8).toString('ascii');
    const data = buf.slice(o + 8, o + 8 + len);
    chunks.push({ type, data });
    o += 12 + len;
    if (type === 'IEND') break;
  }
  return chunks;
}

function unfilter(data, w, h, bpp) {
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  let i = 0;
  for (let y = 0; y < h; y++) {
    const f = data[i++];
    for (let x = 0; x < stride; x++) {
      const raw = data[i++];
      const left = x >= bpp ? out[y * stride + x - bpp] : 0;
      const up = y > 0 ? out[(y - 1) * stride + x] : 0;
      const ul = y > 0 && x >= bpp ? out[(y - 1) * stride + x - bpp] : 0;
      let v = raw;
      if (f === 1) v = (raw + left) & 255;
      else if (f === 2) v = (raw + up) & 255;
      else if (f === 3) v = (raw + Math.floor((left + up) / 2)) & 255;
      else if (f === 4) v = (raw + paeth(left, up, ul)) & 255;
      out[y * stride + x] = v;
    }
  }
  return out;
}

function expandPaletteScanlines(unfiltered, w, h, bitDepth) {
  const bitsPerRow = w * bitDepth;
  const bytesPerRow = Math.ceil(bitsPerRow / 8);
  const out = Buffer.alloc(w * h);

  for (let y = 0; y < h; y++) {
    const rowStart = y * bytesPerRow;
    let outOffset = y * w;
    if (bitDepth === 8) {
      unfiltered.copy(out, outOffset, rowStart, rowStart + w);
      continue;
    }

    for (let x = 0; x < w; x++) {
      const bitPos = x * bitDepth;
      const byteIndex = rowStart + (bitPos >> 3);
      const shift = 8 - bitDepth - (bitPos & 7);
      const mask = (1 << bitDepth) - 1;
      out[outOffset++] = (unfiltered[byteIndex] >> shift) & mask;
    }
  }

  return out;
}

function paletteToRgba(indexedPixels, palette, transparency) {
  const out = Buffer.alloc(indexedPixels.length * 4);
  for (let i = 0, j = 0; i < indexedPixels.length; i++, j += 4) {
    const idx = indexedPixels[i];
    const p = idx * 3;
    out[j] = palette[p] ?? 0;
    out[j + 1] = palette[p + 1] ?? 0;
    out[j + 2] = palette[p + 2] ?? 0;
    out[j + 3] = transparency?.[idx] ?? 255;
  }
  return out;
}

function filterNone(pixels, w, h, bpp) {
  const stride = w * bpp;
  const out = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    out[y * (stride + 1)] = 0;
    pixels.copy(out, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return out;
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

async function processFile(file) {
  const input = await readFile(path.join(sourceDir, file));
  if (!input.subarray(0, 8).equals(pngSig)) throw new Error(`${file}: not PNG`);

  const chunks = readChunks(input);
  const ihdr = chunks.find((c) => c.type === 'IHDR')?.data;
  if (!ihdr) throw new Error(`${file}: missing IHDR`);

  const w = ihdr.readUInt32BE(0);
  const h = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  const interlace = ihdr[12];

  if (interlace !== 0) throw new Error(`${file}: interlaced PNG not supported`);

  const idat = Buffer.concat(chunks.filter((c) => c.type === 'IDAT').map((c) => c.data));
  const raw = zlib.inflateSync(idat);

  let pixels;

  if (bitDepth === 8 && (colorType === 2 || colorType === 6)) {
    const sourceBpp = colorType === 6 ? 4 : 3;
    const sourcePixels = unfilter(raw, w, h, sourceBpp);
    pixels = Buffer.alloc(w * h * 4);
    for (let i = 0, j = 0; i < sourcePixels.length; i += sourceBpp, j += 4) {
      pixels[j] = sourcePixels[i];
      pixels[j + 1] = sourcePixels[i + 1];
      pixels[j + 2] = sourcePixels[i + 2];
      pixels[j + 3] = sourceBpp === 4 ? sourcePixels[i + 3] : 255;
    }
  } else if ([1, 2, 4, 8].includes(bitDepth) && colorType === 3) {
    const palette = chunks.find((c) => c.type === 'PLTE')?.data;
    if (!palette) throw new Error(`${file}: indexed PNG missing PLTE chunk`);
    const transparency = chunks.find((c) => c.type === 'tRNS')?.data;
    const packedBpp = Math.max(1, Math.ceil(bitDepth / 8));
    const unfiltered = unfilter(raw, Math.ceil((w * bitDepth) / 8), h, packedBpp);
    const indexedPixels = expandPaletteScanlines(unfiltered, w, h, bitDepth);
    pixels = paletteToRgba(indexedPixels, palette, transparency);
  } else {
    throw new Error(`${file}: unsupported PNG format (supports RGB/RGBA + palette PNG)`);
  }

  for (let i = 0; i < pixels.length; i += 4) {
    if (
      pixels[i + 3] > 0 &&
      pixels[i] <= blackThreshold &&
      pixels[i + 1] <= blackThreshold &&
      pixels[i + 2] <= blackThreshold
    ) {
      pixels[i + 3] = 0;
    }
  }

  const refiltered = filterNone(pixels, w, h, 4);
  const newIdat = zlib.deflateSync(refiltered, { level: 9 });
  const out = Buffer.concat([pngSig, chunk('IHDR', ihdr), chunk('IDAT', newIdat), chunk('IEND', Buffer.alloc(0))]);
  await writeFile(path.join(outputDir, file), out);
}

await mkdir(outputDir, { recursive: true });
const files = (await readdir(sourceDir)).filter((f) => f.toLowerCase().endsWith('.png'));
let ok = 0;
let skipped = 0;
for (const f of files) {
  try {
    await processFile(f);
    ok++;
  } catch (e) {
    skipped++;
    console.warn(`Skipped ${f}: ${e.message}`);
  }
}
console.log(`Processed ${ok}/${files.length} file(s) -> public/assets/tiles-processed (threshold ${blackThreshold}). Skipped ${skipped}.`);
