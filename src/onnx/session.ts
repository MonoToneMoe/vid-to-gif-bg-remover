import * as ort from "onnxruntime-node";
import type { RecurrentState, SegmentationSession } from "../types/segmentation.js";

/**
 * Create a zero-initialized recurrent state for the first frame.
 * RVM MobileNetV3 expects r1i..r4i tensors.
 * Initial shape is [1, 1, 1, 1] with zeros — the model dynamically expands them.
 */
function createInitialRecurrentState(): RecurrentState {
  return {
    r1: new ort.Tensor("float32", new Float32Array([0]), [1, 1, 1, 1]),
    r2: new ort.Tensor("float32", new Float32Array([0]), [1, 1, 1, 1]),
    r3: new ort.Tensor("float32", new Float32Array([0]), [1, 1, 1, 1]),
    r4: new ort.Tensor("float32", new Float32Array([0]), [1, 1, 1, 1]),
  };
}

/**
 * Load the RVM ONNX model and create an inference session.
 */
export async function createSegmentationSession(
  modelPath: string
): Promise<SegmentationSession> {
  const session = await ort.InferenceSession.create(modelPath, {
    executionProviders: ["cpu"],
    graphOptimizationLevel: "all",
  });

  return {
    session,
    recurrentState: createInitialRecurrentState(),
  };
}

/**
 * Calculate the optimal downsample_ratio for the given resolution.
 * Targets 256-512px on the short side.
 */
export function calculateDownsampleRatio(width: number, height: number): number {
  const shortSide = Math.min(width, height);
  return Math.max(0.125, Math.min(1.0, 384 / shortSide));
}
