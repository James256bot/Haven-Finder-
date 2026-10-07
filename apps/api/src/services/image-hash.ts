import sharp from 'sharp';
import { createHash } from 'node:crypto';

/**
 * Perceptual hash — robust to resize, mild compression, and minor edits.
 * Two images of the same property will have a small Hamming distance.
 */
export async function perceptualHash(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'HavenFinder/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());

    // Resize to 9x8 grayscale, compute dHash
    const pixels = await sharp(buffer)
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    let bits = '';
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const left = pixels[y * 9 + x];
        const right = pixels[y * 9 + x + 1];
        bits += left < right ? '1' : '0';
      }
    }

    // Convert 64 bits → 16-char hex
    return createHash('sha1').update(bits).digest('hex').slice(0, 16);
  } catch {
    return null;
  }
}

export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    dist += (xor.toString(2).match(/1/g) ?? []).length;
  }
  return dist;
}
