import * as ort from "onnxruntime-node";
import { join } from "node:path";
import { createSegmentationSession, calculateDownsampleRatio } from "../onnx/session.js";
import { imageToTensor } from "../onnx/preprocess.js";
import { alphaToBuffer, saveAlphaPng, extractRecurrentState } from "../onnx/postprocess.js";
import type { FrameInfo, ProgressCallback } from "../types/pipeline.js";

/**
 * Stage 3: Run RVM segmentation on each frame sequentially.
 *
 * Sequential processing is mandatory — RVM's ConvGRU recurrent state
 * carries temporal context from frame to frame.
 *
 * @returns Array of alpha matte PNG paths (one per frame, in order)
 */
export async function segmentFrames(
  frames: FrameInfo[],
  alphaDir: string,
  modelPath: string,
  sourceWidth: number,
  sourceHeight: number,
  onProgress?: ProgressCallback
): Promise<string[]> {
  onProgress?.({
    stage: "segment",
    message: "Loading segmentation model...",
  });

  const { session, recurrentState } = await createSegmentationSession(modelPath);
  let currentState = recurrentState;

  const downsampleRatio = calculateDownsampleRatio(sourceWidth, sourceHeight);
  const downsampleTensor = new ort.Tensor("float32", new Float32Array([downsampleRatio]), [1]);

  const alphaPaths: string[] = [];

  for (let i = 0; i < frames.length; i++) {
    onProgress?.({
      stage: "segment",
      message: "Processing frames...",
      progress: i / frames.length,
      frameIndex: i,
      totalFrames: frames.length,
    });

    // Preprocess: image → tensor
    const { tensor: srcTensor, width, height } = await imageToTensor(frames[i].path);

    // Build feeds with recurrent state
    const feeds: Record<string, ort.Tensor> = {
      src: srcTensor,
      r1i: currentState.r1,
      r2i: currentState.r2,
      r3i: currentState.r3,
      r4i: currentState.r4,
      downsample_ratio: downsampleTensor,
    };

    // Run inference
    const results = await session.run(feeds);

    // Extract alpha matte (ignore fgr — it has color artifacts)
    const alphaBuffer = alphaToBuffer(results["pha"], width, height);

    // Save alpha matte
    const alphaPath = join(alphaDir, `alpha_${String(i).padStart(4, "0")}.png`);
    await saveAlphaPng(alphaBuffer, width, height, alphaPath);
    alphaPaths.push(alphaPath);

    // Update recurrent state for next frame
    currentState = extractRecurrentState(results);
  }

  onProgress?.({
    stage: "segment",
    message: `Segmented ${frames.length} frames`,
    progress: 1,
  });

  return alphaPaths;
}
