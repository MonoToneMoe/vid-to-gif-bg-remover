import * as ort from "onnxruntime-node";
import sharp from "sharp";

/**
 * Load a PNG frame and convert to an ONNX tensor for RVM input.
 *
 * Conversion steps:
 * 1. Load PNG with sharp, strip alpha, get raw RGB buffer (HWC interleaved)
 * 2. Convert HWC → CHW (planar: RRRGGGBBB)
 * 3. Normalize pixel values to 0..1
 * 4. Wrap in ort.Tensor with shape [1, 3, H, W]
 */
export async function imageToTensor(
  imagePath: string
): Promise<{ tensor: ort.Tensor; width: number; height: number }> {
  const image = sharp(imagePath).removeAlpha();
  const metadata = await image.metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  // Raw RGB buffer in HWC (interleaved) layout: RGBRGBRGB...
  const rawBuffer = await image.raw().toBuffer();

  const pixelCount = width * height;
  const chw = new Float32Array(3 * pixelCount);

  // Convert HWC → CHW and normalize 0..255 → 0..1
  for (let i = 0; i < pixelCount; i++) {
    chw[i] = rawBuffer[i * 3] / 255.0; // R plane
    chw[pixelCount + i] = rawBuffer[i * 3 + 1] / 255.0; // G plane
    chw[2 * pixelCount + i] = rawBuffer[i * 3 + 2] / 255.0; // B plane
  }

  const tensor = new ort.Tensor("float32", chw, [1, 3, height, width]);

  return { tensor, width, height };
}
