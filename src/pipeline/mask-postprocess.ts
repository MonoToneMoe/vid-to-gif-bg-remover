import { join } from "node:path";
import { temporalSmooth } from "../image/temporal-smooth.js";
import type { ProgressCallback } from "../types/pipeline.js";

/**
 * Stage 4: Post-process alpha mattes with temporal smoothing and edge refinement.
 *
 * @param alphaPaths - Ordered paths to raw alpha matte PNGs from segmentation
 * @param outputDir - Directory for refined alpha mattes
 * @returns Array of refined alpha matte paths
 */
export async function refineMasks(
  alphaPaths: string[],
  outputDir: string,
  onProgress?: ProgressCallback
): Promise<string[]> {
  onProgress?.({
    stage: "mask-refine",
    message: "Applying temporal smoothing...",
  });

  const outputPaths = alphaPaths.map((_, i) =>
    join(outputDir, `alpha_smooth_${String(i).padStart(4, "0")}.png`)
  );

  await temporalSmooth(alphaPaths, outputPaths);

  onProgress?.({
    stage: "mask-refine",
    message: `Refined ${alphaPaths.length} masks`,
    progress: 1,
  });

  return outputPaths;
}
