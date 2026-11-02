/**
 * Generates PNG icons for Privacy Shield in 16, 32, 48, 128 px sizes.
 * Pure Node.js implementation using built-in zlib (zero external dependencies).
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createPng(width, height, rgbaBuffer) {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // Deflate compression
  ihdrData.writeUInt8(0, 11); // Filter method
  ihdrData.writeUInt8(0, 12); // No interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0x00 at the start of each row
  const rowLength = 1 + width * 4;
  const rawScanlines = Buffer.alloc(height * rowLength);
  for (let y = 0; y < height; y++) {
    rawScanlines[y * rowLength] = 0; // Filter: None
    rgbaBuffer.copy(rawScanlines, y * rowLength + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressedData = zlib.deflateSync(rawScanlines, { level: 9 });
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// CRC32 calculation table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// Helper: draw an anti-aliased Apple-style privacy shield icon into an RGBA buffer
export function renderShieldIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.44;
  const cornerRadius = size * 0.22;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);

      const nx = Math.max(0, dx - (radius - cornerRadius));
      const ny = Math.max(0, dy - (radius - cornerRadius));
      const cornerDist = Math.sqrt(nx * nx + ny * ny);

      let alpha = 0;
      if (cornerDist <= cornerRadius) {
        alpha = Math.min(1, Math.max(0, cornerRadius - cornerDist + 0.5));
      }

      if (alpha > 0) {
        const t = y / size;
        const rBg = Math.round(36 * (1 - t) + 16 * t);
        const gBg = Math.round(36 * (1 - t) + 16 * t);
        const bBg = Math.round(40 * (1 - t) + 20 * t);

        const isBorder = (cornerDist >= cornerRadius - 1.2 && cornerDist <= cornerRadius);
        let r = isBorder ? 255 : rBg;
        let g = isBorder ? 255 : gBg;
        let b = isBorder ? 255 : bBg;
        let a = isBorder ? (0.28 * alpha) : alpha;

        const sx = (x - cx) / (size * 0.35);
        const sy = (y - cy) / (size * 0.35);

        const shieldTop = -0.75;
        const shieldBottom = 0.95;
        if (sy >= shieldTop && sy <= shieldBottom) {
          const widthAtY = (sy < 0) 
            ? (0.85 - 0.1 * Math.abs(sy)) 
            : (0.85 * (1 - Math.pow(sy / shieldBottom, 1.3)));

          if (Math.abs(sx) <= widthAtY) {
            const edgeDist = widthAtY - Math.abs(sx);
            const isShieldBorder = edgeDist < 0.22 || sy < shieldTop + 0.2 || sy > shieldBottom - 0.2;
            
            if (isShieldBorder) {
              r = Math.round(r * 0.2 + 52 * 0.8);
              g = Math.round(g * 0.2 + 209 * 0.8);
              b = Math.round(b * 0.2 + 88 * 0.8);
            } else {
              r = Math.round(r * 0.6 + 10 * 0.4);
              g = Math.round(g * 0.6 + 132 * 0.4);
              b = Math.round(b * 0.6 + 255 * 0.4);
            }
          }
        }

        const distToCenter = Math.sqrt((x - cx) ** 2 + (y - (cy + size * 0.02)) ** 2);
        if (distToCenter <= size * 0.10) {
          r = 52;
          g = 209;
          b = 88;
        }

        buf[idx] = r;
        buf[idx + 1] = g;
        buf[idx + 2] = b;
        buf[idx + 3] = Math.round(a * 255);
      } else {
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
      }
    }
  }

  return buf;
}

export function generateAllIcons() {
  const targetDir = path.join(__dirname, '..', 'src', 'assets', 'icons');
  [16, 32, 48, 128].forEach(size => {
    const rgba = renderShieldIcon(size);
    const pngBuf = createPng(size, size, rgba);
    const outPath = path.join(targetDir, `icon${size}.png`);
    fs.writeFileSync(outPath, pngBuf);
  });
}

generateAllIcons();
