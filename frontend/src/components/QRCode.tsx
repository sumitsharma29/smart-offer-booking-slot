import { useMemo } from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
}

/**
 * A lightweight, self-contained QR Code generator (Type 2/3/4) in TypeScript.
 * Renders a real QR Code matrix into an SVG.
 * Supports alphanumeric strings (e.g. booking references like "BK-A8B9C0D1").
 */
export default function QRCode({ value, size = 120 }: QRCodeProps) {
  // Generate the real QR Code matrix
  const qrMatrix = useMemo(() => {
    try {
      return generateQRMatrix(value);
    } catch (e) {
      console.error("Failed to generate QR Matrix, falling back to mock", e);
      // Fallback matrix if generator fails
      return Array(21).fill(0).map(() => Array(21).fill(false));
    }
  }, [value]);

  const moduleCount = qrMatrix.length;

  return (
    <div 
      className="relative flex items-center justify-center bg-white dark:bg-white p-2.5 rounded-2xl border border-slate-200/50 shadow-inner group overflow-hidden" 
      style={{ width: size + 20, height: size + 20 }}
    >
      {/* Corner Bracket Focus UI Indicators */}
      <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-violet-500 rounded-tl"></div>
      <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-violet-500 rounded-tr"></div>
      <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-violet-500 rounded-bl"></div>
      <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-violet-500 rounded-br"></div>
      
      {/* Laser Scanning Beam */}
      <div className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-violet-500 to-transparent animate-laser-scan z-10 shadow-[0_0_8px_rgba(139,92,246,0.5)]"></div>

      <svg 
        className="w-full h-full text-slate-900 select-none opacity-95 group-hover:scale-[1.02] transition-transform duration-300" 
        viewBox={`0 0 ${moduleCount} ${moduleCount}`}
        fill="currentColor"
        shapeRendering="crispEdges"
      >
        {qrMatrix.map((row, r) => 
          row.map((cell, c) => 
            cell ? (
              <rect 
                key={`${r}-${c}`} 
                x={c} 
                y={r} 
                width={1.05} 
                height={1.05} 
                className="fill-slate-900" 
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
}

// ==========================================
// PURE TS QR CODE GENERATOR IMPLEMENTATION
// ==========================================

// Lightweight implementation of standard QR Code encoding for Type 4 (33x33)
// Supports alphanumeric data, error correction, and mask patterns.
function generateQRMatrix(text: string): boolean[][] {
  const version = 3; // 29x29 matrix, can hold up to 35 alphanumeric characters with M error correction
  const size = 29;
  const matrix = Array(size).fill(0).map(() => Array(size).fill(false));
  const reserved = Array(size).fill(0).map(() => Array(size).fill(false));

  // 1. Draw Finder Patterns at corners
  drawFinderPattern(matrix, reserved, 0, 0);
  drawFinderPattern(matrix, reserved, size - 7, 0);
  drawFinderPattern(matrix, reserved, 0, size - 7);

  // 2. Draw Timing Patterns (row 6 and col 6)
  for (let i = 8; i < size - 8; i++) {
    const bit = i % 2 === 0;
    matrix[6][i] = bit;
    matrix[i][6] = bit;
    reserved[6][i] = true;
    reserved[i][6] = true;
  }

  // 3. Draw Alignment Pattern for Version 3 (at x=22, y=22)
  drawAlignmentPattern(matrix, reserved, 22, 22);

  // 4. Dark module
  matrix[4 * version + 9][8] = true;
  reserved[4 * version + 9][8] = true;

  // 5. Generate and pack alphanumeric data bits
  const bits: boolean[] = [];
  
  // Alphanumeric Mode Indicator: 0010
  bits.push(false, false, true, false);

  // Character Count Indicator (9 bits for versions 1-9 in alphanumeric mode)
  const charCount = text.length;
  for (let i = 8; i >= 0; i--) {
    bits.push(((charCount >> i) & 1) === 1);
  }

  // Encode alphanumeric characters in pairs
  const ALPHANUM_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
  const getCode = (c: string) => ALPHANUM_CHARS.indexOf(c.toUpperCase());

  for (let i = 0; i < charCount; i += 2) {
    if (i + 1 < charCount) {
      const val = getCode(text[i]) * 45 + getCode(text[i + 1]);
      for (let b = 10; b >= 0; b--) {
        bits.push(((val >> b) & 1) === 1);
      }
    } else {
      const val = getCode(text[i]);
      for (let b = 5; b >= 0; b--) {
        bits.push(((val >> b) & 1) === 1);
      }
    }
  }

  // Terminator (up to 4 bits of 0)
  for (let i = 0; i < 4 && bits.length < 272; i++) {
    bits.push(false);
  }

  // Pad to multiple of 8 bits
  while (bits.length % 8 !== 0) {
    bits.push(false);
  }

  // Pad bytes (0xEC, 0x11 alternating)
  const padBytes = [0xEC, 0x11];
  let padIdx = 0;
  // Total data capacity for Version 3-M is 44 bytes = 352 bits
  while (bits.length < 352) {
    const padByte = padBytes[padIdx % 2];
    for (let b = 7; b >= 0; b--) {
      bits.push(((padByte >> b) & 1) === 1);
    }
    padIdx++;
  }

  // 6. Error Correction (Reed-Solomon)
  // For Version 3-M, we have 44 data codewords and 26 EC codewords.
  const dataBytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      if (bits[i + b]) byte |= (1 << (7 - b));
    }
    dataBytes.push(byte);
  }

  const ecBytes = calculateReedSolomon(dataBytes, 26);
  const totalCodewords = [...dataBytes, ...ecBytes];

  // 7. Place data codewords into the matrix using standard scanning
  let idx = 0;
  let dir = -1; // Going up
  let r = size - 1;
  let c = size - 1;

  while (c > 0) {
    // Column index 6 is timing pattern, skip it
    if (c === 6) {
      c--;
      continue;
    }

    for (let i = 0; i < 2; i++) {
      const col = c - i;
      if (!reserved[r][col]) {
        let bit = false;
        if (idx < totalCodewords.length * 8) {
          const byteIdx = Math.floor(idx / 8);
          const bitIdx = 7 - (idx % 8);
          bit = ((totalCodewords[byteIdx] >> bitIdx) & 1) === 1;
          idx++;
        }

        // Apply a basic mask pattern (Pattern 0: (r + col) % 2 == 0)
        const mask = (r + col) % 2 === 0;
        matrix[r][col] = bit !== mask;
      }
    }

    r += dir;
    if (r < 0 || r >= size) {
      r -= dir;
      dir = -dir;
      c -= 2;
    }
  }

  // 8. Format Information (Mask 0, Error Correction M (00))
  // Format string for EC M, Mask 0 with XOR is: 101010000010010 (pre-calculated standard format bits)
  const formatBits = [true, false, true, false, true, false, false, false, false, false, true, false, false, true, false];
  
  // Draw format info around finders
  // Horizontal format bits
  for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i];
  matrix[8][7] = formatBits[6];
  matrix[8][8] = formatBits[7];
  matrix[7][8] = formatBits[8];
  for (let i = 0; i < 6; i++) matrix[5 - i][8] = formatBits[9 + i];

  // Vertical format bits
  for (let i = 0; i < 8; i++) matrix[size - 1 - i][8] = formatBits[i];
  for (let i = 0; i < 7; i++) matrix[8][size - 7 + i] = formatBits[8 + i];

  return matrix;
}

function drawFinderPattern(matrix: boolean[][], reserved: boolean[][], x: number, y: number) {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
      const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      matrix[y + r][x + c] = isBorder || isCenter;
      reserved[y + r][x + c] = true;
    }
  }
  // Draw light border separator (quiet space around finder)
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const py = y + r;
      const px = x + c;
      if (py >= 0 && py < matrix.length && px >= 0 && px < matrix.length) {
        reserved[py][px] = true;
      }
    }
  }
}

function drawAlignmentPattern(matrix: boolean[][], reserved: boolean[][], x: number, y: number) {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
      const isCenter = r === 0 && c === 0;
      matrix[y + r][x + c] = isBorder || isCenter;
      reserved[y + r][x + c] = true;
    }
  }
}

// Reed-Solomon Error Correction Code generation using standard Galois Field arithmetic
function calculateReedSolomon(data: number[], numEC: number): number[] {
  // Galois Field GF(256) tables
  const exp = Array(512).fill(0);
  const log = Array(256).fill(0);
  let val = 1;
  for (let i = 0; i < 255; i++) {
    exp[i] = val;
    log[val] = i;
    val <<= 1;
    if (val & 0x100) val ^= 0x11D; // Primitive polynomial
  }
  for (let i = 255; i < 512; i++) {
    exp[i] = exp[i - 255];
  }

  // Generate generator polynomial
  let poly = [1];
  for (let i = 0; i < numEC; i++) {
    // multiply poly by (x + alpha^i)
    const nextPoly = Array(poly.length + 1).fill(0);
    const alpha = exp[i];
    for (let j = 0; j < poly.length; j++) {
      // multiply poly[j] * x
      nextPoly[j] ^= poly[j];
      // multiply poly[j] * alpha^i
      if (poly[j] !== 0) {
        const logVal = log[poly[j]] + log[alpha];
        nextPoly[j + 1] ^= exp[logVal];
      }
    }
    poly = nextPoly;
  }

  // Pad data with zeroes for division
  const result = [...data, ...Array(numEC).fill(0)];
  
  // Perform polynomial division
  for (let i = 0; i < data.length; i++) {
    const coef = result[i];
    if (coef !== 0) {
      const logCoef = log[coef];
      for (let j = 0; j < poly.length; j++) {
        if (poly[j] !== 0) {
          const logProduct = logCoef + log[poly[j]];
          result[i + j] ^= exp[logProduct];
        }
      }
    }
  }

  return result.slice(data.length);
}
