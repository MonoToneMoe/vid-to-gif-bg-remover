import type * as ort from "onnxruntime-node";

/**
 * RVM recurrent state — 4 tensors carried between frames.
 * Initialized to zeros for the first frame, then fed back from outputs.
 */
export interface RecurrentState {
  r1: ort.Tensor;
  r2: ort.Tensor;
  r3: ort.Tensor;
  r4: ort.Tensor;
}

/** Result from a single frame's segmentation inference */
export interface SegmentationResult {
  /** Alpha matte as a Buffer of grayscale uint8 pixels (H*W bytes) */
  alphaMatte: Buffer;
  /** Width of the alpha matte */
  width: number;
  /** Height of the alpha matte */
  height: number;
  /** Updated recurrent state to feed into the next frame */
  recurrentState: RecurrentState;
}

/** ONNX session wrapper with loaded model */
export interface SegmentationSession {
  session: ort.InferenceSession;
  recurrentState: RecurrentState;
}
