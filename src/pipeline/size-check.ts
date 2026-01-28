import { encodeGif } from "../ffmpeg/gif.js";
import {
  MAX_EMOTE_BYTES,
  DEGRADATION_LADDER,
  TWITCH_SIZES,
} from "../constants.js";
import type { EncodingResult } from "../types/encoding.js";
import type { ProgressCallback } from "../types/pipeline.js";

/** Twitch sizes that need to meet the 1MB limit */
const DEGRADABLE_SIZES = new Set<number | string>(TWITCH_SIZES);

/**
 * Stage 7: Check each Twitch-sized GIF against the 1MB limit.
 * 512px and raw outputs are exempt — no degradation applied.
 */
export async function checkAndDegrade(
  results: EncodingResult[],
  compositedDir: string,
  baseOpts: { fps: number; maxColors: number; dither: string; gifsickleLossy: number; alphaThreshold: number },
  onProgress?: ProgressCallback
): Promise<EncodingResult[]> {
  const updatedResults: EncodingResult[] = [];

  for (const result of results) {
    // Skip degradation for non-Twitch sizes (512, raw)
    if (!DEGRADABLE_SIZES.has(result.size) || result.fileSizeBytes <= MAX_EMOTE_BYTES) {
      updatedResults.push(result);
      continue;
    }

    onProgress?.({
      stage: "size-check",
      message: `${result.label} is ${(result.fileSizeBytes / 1024).toFixed(0)}KB (>${(MAX_EMOTE_BYTES / 1024).toFixed(0)}KB). Degrading...`,
    });

    const opts = { ...baseOpts };
    const appliedSteps: string[] = [];
    let currentSize = result.fileSizeBytes;
    let currentPath = result.outputPath;

    for (const step of DEGRADATION_LADDER) {
      if (currentSize <= MAX_EMOTE_BYTES) break;

      step.apply(opts);
      appliedSteps.push(step.label);

      onProgress?.({
        stage: "size-check",
        message: `Applying: ${step.label}`,
      });

      const reEncoded = await encodeGif({
        inputDir: compositedDir,
        outputDir: result.outputPath.replace(/[^/\\]+$/, ""),
        size: result.size as number,
        tag: result.label,
        fps: opts.fps,
        maxColors: opts.maxColors,
        dither: opts.dither,
        alphaThreshold: opts.alphaThreshold,
        gifsickleLossy: opts.gifsickleLossy,
      });

      currentSize = reEncoded.fileSizeBytes;
      currentPath = reEncoded.outputPath;
    }

    if (currentSize > MAX_EMOTE_BYTES) {
      console.warn(
        `\nWarning: ${result.label} GIF is still ${(currentSize / 1024).toFixed(0)}KB after all degradation steps.` +
          `\nConsider shortening the clip with --start and --end.\n`
      );
    }

    updatedResults.push({
      ...result,
      outputPath: currentPath,
      fileSizeBytes: currentSize,
      degraded: appliedSteps.length > 0,
      degradationSteps: appliedSteps,
    });
  }

  return updatedResults;
}
