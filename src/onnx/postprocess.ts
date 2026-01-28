import * as ort from "onnxruntime-node";
import sharp from "sharp";
import type { RecurrentState } from "../types/segmentation.js";

/**
 * Extract the alpha matte from the RVM output tensor and convert to a grayscale PNG buffer.
 *
 * The `pha` output has shape [1, 1, H, W] with float32 values in 0..1.
 * We convert to uint8 (0..255) grayscale.
 */
export function alphaToBuffer(
  phaTensor: ort.Tensor,
  width: number,
  height: number
): Buffer {
  const phaData = phaTensor.data as Float32Array;
  const pixels = width * height;
  const alphaBuffer = Buffer.alloc(pixels);

  for (let i = 0; i < pixels; i++) {
    alphaBuffer[i] = Math.round(Math.max(0, Math.min(1, phaData[i])) * 255);
  }

  return alphaBuffer;
}

/**
 * Save an alpha matte buffer as a grayscale PNG file.
 */
export async function saveAlphaPng(
  alphaBuffer: Buffer,
  width: number,
  height: number,
  outputPath: string
): Promise<void> {
  await sharp(alphaBuffer, {
    raw: { width, height, channels: 1 },
  })
    .png()
    .toFile(outputPath);
}

/**
 * Extract the updated recurrent state from the model's output tensors.
 */
export function extractRecurrentState(
  outputs: ort.InferenceSession.OnnxValueMapType
): RecurrentState {
  return {
    r1: outputs["r1o"],
    r2: outputs["r2o"],
    r3: outputs["r3o"],
    r4: outputs["r4o"],
  };
}
