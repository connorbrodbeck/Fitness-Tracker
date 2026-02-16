// Minimal PNG generator — creates simple solid-color icons with text
// No external dependencies needed

function createPNG(width, height) {
  // Create raw RGBA pixel data
  const pixels = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // Gradient from #667eea to #764ba2
      const t = (x + y) / (width + height);
      const r = Math.round(102 + (118 - 102) * t);
      const g = Math.round(126 + (75 - 126) * t);
      const b = Math.round(234 + (162 - 234) * t);

      // Rounded corners
      const cornerR = width * 0.156;
      const inCorner = isInRoundedRect(x, y, width, height, cornerR);

      if (inCorner) {
        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
        pixels[i + 3] = 255;
      } else {
        pixels[i] = 0;
        pixels[i + 1] = 0;
        pixels[i + 2] = 0;
        pixels[i + 3] = 0;
      }

      // Draw dumbbell (white shapes)
      const cx = width / 2, cy = height * 0.42;
      const s = width / 512;

      if (inCorner && isInDumbbell(x, y, cx, cy, s)) {
        pixels[i] = 255;
        pixels[i + 1] = 255;
        pixels[i + 2] = 255;
        pixels[i + 3] = 255;
      }

      // Draw "FIT" text area (simple block letters)
      if (inCorner && isInFitText(x, y, cx, height * 0.72, s)) {
        pixels[i] = 255;
        pixels[i + 1] = 255;
        pixels[i + 2] = 255;
        pixels[i + 3] = 230;
      }
    }
  }

  return encodePNG(pixels, width, height);
}

function isInRoundedRect(x, y, w, h, r) {
  if (x < r && y < r) return dist(x, y, r, r) <= r;
  if (x >= w - r && y < r) return dist(x, y, w - r, r) <= r;
  if (x < r && y >= h - r) return dist(x, y, r, h - r) <= r;
  if (x >= w - r && y >= h - r) return dist(x, y, w - r, h - r) <= r;
  return true;
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function isInDumbbell(x, y, cx, cy, s) {
  // Bar
  if (isInRoundedBox(x, y, cx - 120*s, cy - 12*s, 240*s, 24*s, 12*s)) return true;
  // Left weight
  if (isInRoundedBox(x, y, cx - 160*s, cy - 50*s, 50*s, 100*s, 10*s)) return true;
  // Right weight
  if (isInRoundedBox(x, y, cx + 110*s, cy - 50*s, 50*s, 100*s, 10*s)) return true;
  // Left cap
  if (isInRoundedBox(x, y, cx - 175*s, cy - 35*s, 20*s, 70*s, 8*s)) return true;
  // Right cap
  if (isInRoundedBox(x, y, cx + 155*s, cy - 35*s, 20*s, 70*s, 8*s)) return true;
  return false;
}

function isInRoundedBox(px, py, x, y, w, h, r) {
  if (px < x || px >= x + w || py < y || py >= y + h) return false;
  // Check corners
  const lx = px - x, ly = py - y;
  if (lx < r && ly < r) return dist(lx, ly, r, r) <= r;
  if (lx >= w - r && ly < r) return dist(lx, ly, w - r, r) <= r;
  if (lx < r && ly >= h - r) return dist(lx, ly, r, h - r) <= r;
  if (lx >= w - r && ly >= h - r) return dist(lx, ly, w - r, h - r) <= r;
  return true;
}

// Simple block-letter "FIT"
function isInFitText(x, y, cx, cy, s) {
  const letterW = 36 * s;
  const letterH = 50 * s;
  const gap = 12 * s;
  const thick = 8 * s;
  const totalW = letterW * 3 + gap * 2;
  const startX = cx - totalW / 2;
  const startY = cy - letterH / 2;

  // F
  const fx = startX;
  if (isInF(x, y, fx, startY, letterW, letterH, thick)) return true;

  // I
  const ix = startX + letterW + gap;
  if (isInI(x, y, ix, startY, letterW, letterH, thick)) return true;

  // T
  const tx = startX + (letterW + gap) * 2;
  if (isInT(x, y, tx, startY, letterW, letterH, thick)) return true;

  return false;
}

function isInF(x, y, ox, oy, w, h, t) {
  // Vertical bar
  if (x >= ox && x < ox + t && y >= oy && y < oy + h) return true;
  // Top bar
  if (x >= ox && x < ox + w && y >= oy && y < oy + t) return true;
  // Middle bar
  if (x >= ox && x < ox + w * 0.7 && y >= oy + h * 0.43 && y < oy + h * 0.43 + t) return true;
  return false;
}

function isInI(x, y, ox, oy, w, h, t) {
  const cx = ox + w / 2;
  // Top bar
  if (x >= ox + w * 0.2 && x < ox + w * 0.8 && y >= oy && y < oy + t) return true;
  // Vertical bar
  if (x >= cx - t / 2 && x < cx + t / 2 && y >= oy && y < oy + h) return true;
  // Bottom bar
  if (x >= ox + w * 0.2 && x < ox + w * 0.8 && y >= oy + h - t && y < oy + h) return true;
  return false;
}

function isInT(x, y, ox, oy, w, h, t) {
  const cx = ox + w / 2;
  // Top bar
  if (x >= ox && x < ox + w && y >= oy && y < oy + t) return true;
  // Vertical bar
  if (x >= cx - t / 2 && x < cx + t / 2 && y >= oy && y < oy + h) return true;
  return false;
}

// Minimal PNG encoder (no dependencies)
function encodePNG(pixels, width, height) {
  const { deflateSync } = require('zlib');

  // Add filter byte (0 = None) to each row
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0; // filter: None
    pixels.copy
      ? Buffer.from(pixels.buffer).copy(rawData, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4)
      : Buffer.from(pixels.slice(y * width * 4, (y + 1) * width * 4)).copy(rawData, y * (1 + width * 4) + 1);
  }

  const compressed = deflateSync(Buffer.from(rawData));

  // Build PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type);
    const crcData = Buffer.concat([typeB, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData) >>> 0);
    return Buffer.concat([len, typeB, data, crc]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const chunks = [
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ];

  return Buffer.concat(chunks);
}

// CRC32
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return crc ^ 0xFFFFFFFF;
}

// Generate both icons
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');

console.log('Generating 192x192 icon...');
const icon192 = createPNG(192, 192);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), icon192);
console.log('Saved icon-192.png');

console.log('Generating 512x512 icon...');
const icon512 = createPNG(512, 512);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), icon512);
console.log('Saved icon-512.png');

console.log('Done!');
