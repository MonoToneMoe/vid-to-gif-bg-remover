import sharp from "sharp";

/**
 * Merge an RGB frame with a grayscale alpha matte to produce an RGBA PNG.
 *
 * Constructs the RGBA buffer manually from raw RGB + alpha data to guarantee
 * a 4-channel output with a proper alpha channel.
 *
 * @param rgbPath - Path to the source RGB PNG frame
 * @param alphaPath - Path to the grayscale alpha matte PNG
 * @param outputPath - Path for the output RGBA PNG
 */
export async function mergeRgbAlpha(
  rgbPath: string,
  alphaPath: string,
  outputPath: string
): Promise<void> {
  // Get alpha dimensions (the target size)
  const alphaMeta = await sharp(alphaPath).metadata();
  const width = alphaMeta.width!;
  const height = alphaMeta.height!;

  // Load alpha matte as single-channel raw buffer
  const alphaBuffer = await sharp(alphaPath)
    .grayscale()
    .raw()
    .toBuffer();

  // Load RGB image, resize to match alpha, get raw RGB buffer
  const rgbBuffer = await sharp(rgbPath)
    .removeAlpha()
    .resize(width, height, { fit: "fill" })
    .raw()
    .toBuffer();

  // Manually interleave RGB + A into RGBA buffer
  const pixelCount = width * height;
  const rgbaBuffer = Buffer.alloc(pixelCount * 4);

  for (let i = 0; i < pixelCount; i++) {
    rgbaBuffer[i * 4] = rgbBuffer[i * 3];       // R
    rgbaBuffer[i * 4 + 1] = rgbBuffer[i * 3 + 1]; // G
    rgbaBuffer[i * 4 + 2] = rgbBuffer[i * 3 + 2]; // B
    rgbaBuffer[i * 4 + 3] = alphaBuffer[i];        // A
  }

  // Write RGBA PNG
  await sharp(rgbaBuffer, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toFile(outputPath);
}
