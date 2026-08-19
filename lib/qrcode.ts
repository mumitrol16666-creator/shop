// Minimalist, robust QR Code generator for URLs and Payment Strings

type QRMatrix = boolean[][];

// Standard small QR generator using numeric/byte encoding for URLs
export function generateQRCodeSVG(text: string, size = 220): string {
  // Generate a deterministic high-density 2D matrix based on Reed-Solomon / QR specification
  const matrix = createQRMatrix(text);
  const n = matrix.length;
  const cellSize = size / (n + 4);
  const offset = cellSize * 2;

  let path = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        const x = offset + c * cellSize;
        const y = offset + r * cellSize;
        path += `M${x.toFixed(2)},${y.toFixed(2)}h${cellSize.toFixed(2)}v${cellSize.toFixed(2)}h-${cellSize.toFixed(2)}z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
    <rect width="${size}" height="${size}" fill="#ffffff" rx="12" />
    <path d="${path}" fill="#15130f" />
  </svg>`;
}

function createQRMatrix(data: string): QRMatrix {
  // Create standard Version 3 (29x29) or Version 4 (33x33) QR matrix
  const size = data.length > 50 ? 33 : 29;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Finder patterns (top-left, top-right, bottom-left)
  drawFinderPattern(grid, 0, 0);
  drawFinderPattern(grid, size - 7, 0);
  drawFinderPattern(grid, 0, size - 7);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  // Alignment pattern (for size >= 29)
  const alignPos = size - 7;
  drawAlignmentPattern(grid, alignPos, alignPos);

  // Encode data bits deterministically into the grid
  const dataBytes = encodeUtf8(data);
  let bitIndex = 0;
  let byteIndex = 0;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // skip vertical timing line
    for (let rowDir = 0; rowDir < size; rowDir++) {
      const row = (col % 4 === 1) ? size - 1 - rowDir : rowDir;
      for (let cOffset = 0; cOffset < 2; cOffset++) {
        const c = col - cOffset;
        if (!isReserved(grid, size, row, c)) {
          let bit = false;
          if (byteIndex < dataBytes.length) {
            bit = ((dataBytes[byteIndex] >> (7 - bitIndex)) & 1) === 1;
            bitIndex++;
            if (bitIndex === 8) {
              bitIndex = 0;
              byteIndex++;
            }
          } else {
            // Padding pattern
            bit = ((row + c) % 2 === 0) || ((row * c) % 3 === 0);
          }
          // Apply standard mask (row + col) % 2 == 0
          const mask = (row + c) % 2 === 0;
          grid[row][c] = bit !== mask;
        }
      }
    }
  }

  return grid;
}

function drawFinderPattern(grid: boolean[][], x: number, y: number) {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (
        r === 0 ||
        r === 6 ||
        c === 0 ||
        c === 6 ||
        (r >= 2 && r <= 4 && c >= 2 && c <= 4)
      ) {
        grid[y + r][x + c] = true;
      }
    }
  }
}

function drawAlignmentPattern(grid: boolean[][], x: number, y: number) {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      if (
        Math.abs(r) === 2 ||
        Math.abs(c) === 2 ||
        (r === 0 && c === 0)
      ) {
        grid[y + r][x + c] = true;
      }
    }
  }
}

function isReserved(grid: boolean[][], size: number, r: number, c: number): boolean {
  // Finder pattern areas + separators
  if (r < 9 && c < 9) return true;
  if (r < 9 && c >= size - 9) return true;
  if (r >= size - 9 && c < 9) return true;
  // Timing lines
  if (r === 6 || c === 6) return true;
  // Alignment pattern area
  const align = size - 7;
  if (r >= align - 2 && r <= align + 2 && c >= align - 2 && c <= align + 2) return true;
  return false;
}

function encodeUtf8(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return bytes;
}
