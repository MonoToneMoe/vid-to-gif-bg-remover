import { access, constants } from "node:fs/promises";
import { extname } from "node:path";
import { probeVideo } from "../ffmpeg/probe.js";
import {
  SUPPORTED_VIDEO_EXTENSIONS,
  MAX_CLIP_DURATION,
} from "../constants.js";
import type { PipelineConfig, VideoMetadata, ProgressCallback } from "../types/pipeline.js";

/**
 * Stage 1: Validate input file and extract video metadata.
 *
 * Checks:
 * - File exists and is readable
 * - File extension is a known video format
 * - Video has a valid video stream
 * - Duration is reasonable (warns if long)
 * - start/end range is valid
 */
export async function validateInput(
  config: PipelineConfig,
  onProgress?: ProgressCallback
): Promise<VideoMetadata> {
  onProgress?.({
    stage: "validate",
    message: "Checking input file...",
  });

  // Check file exists
  try {
    await access(config.inputPath, constants.R_OK);
  } catch {
    throw new Error(
      `Input file not found or not readable: ${config.inputPath}`
    );
  }

  // Check extension
  const ext = extname(config.inputPath).toLowerCase();
  if (!SUPPORTED_VIDEO_EXTENSIONS.has(ext)) {
    throw new Error(
      `Unsupported video format: ${ext}\n` +
        `Supported: ${[...SUPPORTED_VIDEO_EXTENSIONS].join(", ")}`
    );
  }

  // Probe video
  onProgress?.({
    stage: "validate",
    message: "Probing video metadata...",
  });

  const metadata = await probeVideo(config.inputPath);

  if (metadata.duration <= 0) {
    throw new Error("Video has zero or unknown duration.");
  }

  // Validate start/end
  if (config.start !== undefined && config.start >= metadata.duration) {
    throw new Error(
      `--start (${config.start}s) is beyond video duration (${metadata.duration.toFixed(1)}s)`
    );
  }

  if (config.end !== undefined && config.end > metadata.duration) {
    throw new Error(
      `--end (${config.end}s) is beyond video duration (${metadata.duration.toFixed(1)}s)`
    );
  }

  if (
    config.start !== undefined &&
    config.end !== undefined &&
    config.start >= config.end
  ) {
    throw new Error(`--start (${config.start}s) must be before --end (${config.end}s)`);
  }

  // Warn about long clips
  const effectiveDuration =
    (config.end ?? metadata.duration) - (config.start ?? 0);

  if (effectiveDuration > MAX_CLIP_DURATION) {
    console.warn(
      `\nWarning: Clip is ${effectiveDuration.toFixed(1)}s long (>${MAX_CLIP_DURATION}s).` +
        `\nThis will produce many frames and may be slow.` +
        `\nConsider using --start and --end to trim the clip.\n`
    );
  }

  onProgress?.({
    stage: "validate",
    message: `Video: ${metadata.width}x${metadata.height}, ${metadata.duration.toFixed(1)}s, ${metadata.codec}`,
  });

  return metadata;
}
