import sharp from "sharp";
import { TEMPORAL_WEIGHTS, EDGE_BLUR_SIGMA } from "../constants.js";

/**
 * Apply temporal smoothing to a sequence of alpha matte paths.
 * Each frame's alpha is blended with its neighbors:
 *   output[i] = prev_weight * alpha[i-1] + current_weight * alpha[i] + next_weight * alpha[i+1]
 *
 * Also applies a light Gaussian blur for edge refinement.
 *
 * @param alphaPaths - Ordered array of alpha matte PNG paths
 * @param outputPaths - Ordered array of output paths for smoothed mattes
 */
export async function temporalSmooth(
  alphaPaths: string[],
  outputPaths: string[]
): Promise<void> {
  const count = alphaPaths.length;
  if (count === 0) return;

  // Load all alpha buffers into memory (grayscale, small images)
  const buffers: { data: Buffer; width: number; height: number }[] = [];
  for (const p of alphaPaths) {
    const meta = await sharp(p).metadata();
    const data = await sharp(p).grayscale().raw().toBuffer();
    buffers.push({ data, width: meta.width!, height: meta.height! });
  }

  const { prev, current, next } = TEMPORAL_WEIGHTS;

  for (let i = 0; i < count; i++) {
    const { width, height } = buffers[i];
    const pixels = width * height;
    const blended = Buffer.alloc(pixels);

    const curBuf = buffers[i].data;
    const prevBuf = i > 0 ? buffers[i - 1].data : curBuf;
    const nextBuf = i < count - 1 ? buffers[i + 1].data : curBuf;

    for (let p = 0; p < pixels; p++) {
      const value =
        prev * prevBuf[p] + current * curBuf[p] + next * nextBuf[p];
      blended[p] = Math.round(Math.max(0, Math.min(255, value)));
    }

    // Apply light edge blur and save
    await sharp(blended, { raw: { width, height, channels: 1 } })
      .blur(EDGE_BLUR_SIGMA)
      .png()
      .toFile(outputPaths[i]);
  }
}
