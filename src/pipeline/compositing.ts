import { join } from "node:path";
import { mergeRgbAlpha } from "../image/alpha.js";
import type { FrameInfo, ProgressCallback } from "../types/pipeline.js";

/**
 * Stage 5: Composite original RGB frames with refined alpha mattes to produce RGBA PNGs.
 *
 * @param frames - Original extracted RGB frames
 * @param alphaPaths - Refined alpha matte paths (must match frames 1:1)
 * @param compositedDir - Output directory for RGBA PNGs
 * @returns Array of composited RGBA PNG paths
 */
export async function compositeFrames(
  frames: FrameInfo[],
  alphaPaths: string[],
  compositedDir: string,
  onProgress?: ProgressCallback
): Promise<string[]> {
  if (frames.length !== alphaPaths.length) {
    throw new Error(
      `Frame count mismatch: ${frames.length} frames vs ${alphaPaths.length} alpha mattes`
    );
  }

  const compositedPaths: string[] = [];

  for (let i = 0; i < frames.length; i++) {
    onProgress?.({
      stage: "composite",
      message: "Merging RGB + alpha...",
      progress: i / frames.length,
      frameIndex: i,
      totalFrames: frames.length,
    });

    // Output uses frame_%04d.png naming for FFmpeg compatibility
    const outputPath = join(compositedDir, `frame_${String(i + 1).padStart(4, "0")}.png`);

    await mergeRgbAlpha(frames[i].path, alphaPaths[i], outputPath);
    compositedPaths.push(outputPath);
  }

  onProgress?.({
    stage: "composite",
    message: `Composited ${frames.length} frames`,
    progress: 1,
  });

  return compositedPaths;
}
