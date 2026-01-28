import { extractFrames as ffmpegExtract } from "../ffmpeg/extract.js";
import type { PipelineConfig, FrameInfo, ProgressCallback } from "../types/pipeline.js";

/**
 * Stage 2: Extract video frames as PNG files.
 */
export async function extractFrames(
  config: PipelineConfig,
  extractedDir: string,
  fps: number,
  onProgress?: ProgressCallback
): Promise<FrameInfo[]> {
  onProgress?.({
    stage: "extract",
    message: `Extracting frames at ${fps} FPS...`,
  });

  const frames = await ffmpegExtract({
    inputPath: config.inputPath,
    outputDir: extractedDir,
    fps,
    start: config.start,
    end: config.end,
  });

  if (frames.length === 0) {
    throw new Error(
      "No frames extracted. The clip may be too short or the time range is empty.\n" +
        "Try adjusting --start, --end, or --fps."
    );
  }

  onProgress?.({
    stage: "extract",
    message: `Extracted ${frames.length} frames`,
    progress: 1,
  });

  return frames;
}
