import { encodeGif } from "../ffmpeg/gif.js";
import { OUTPUT_SIZES, QUALITY_PRESETS, DEFAULT_ALPHA_THRESHOLD } from "../constants.js";
import type { QualityPresetName } from "../constants.js";
import type { EncodingOptions, EncodingResult } from "../types/encoding.js";
import type { ProgressCallback } from "../types/pipeline.js";

/** Describes a single GIF variant to encode */
interface EncodeJob {
  size: number | "raw";
  label: string;
  tag: string;
  /** Pixel size to pass to FFmpeg, or null for no resize */
  scaleSize: number | null;
  /** gifsicle lossy value, 0 = skip gifsicle */
  gifsickleLossy: number;
  fps: number;
  maxColors: number;
}

/**
 * Stage 6: Encode composited RGBA PNGs into GIFs for all output sizes
 * (28, 56, 112, 512) plus an uncompressed raw-resolution version.
 */
export async function encodeAllSizes(
  compositedDir: string,
  outputDir: string,
  quality: QualityPresetName,
  sourceFps: number,
  alphaThreshold?: number,
  onProgress?: ProgressCallback
): Promise<EncodingResult[]> {
  const preset = QUALITY_PRESETS[quality];

  const baseOpts: EncodingOptions = {
    fps: preset.fps,
    maxColors: preset.maxColors,
    dither: preset.dither,
    gifsickleLossy: preset.gifsickleLossy,
    alphaThreshold: alphaThreshold ?? DEFAULT_ALPHA_THRESHOLD,
  };

  // Build the list of GIFs to produce
  const jobs: EncodeJob[] = [];

  // Sized variants (28, 56, 112, 512) — all use preset compression
  for (const size of OUTPUT_SIZES) {
    jobs.push({
      size,
      label: `${size}x${size}`,
      tag: `${size}x${size}`,
      scaleSize: size,
      gifsickleLossy: baseOpts.gifsickleLossy,
      fps: baseOpts.fps,
      maxColors: baseOpts.maxColors,
    });
  }

  // Raw version — original resolution, no gifsicle, uses source fps
  jobs.push({
    size: "raw",
    label: "raw (original resolution)",
    tag: "raw",
    scaleSize: null,
    gifsickleLossy: 0,
    fps: sourceFps,
    maxColors: 256,
  });

  const results: EncodingResult[] = [];

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];

    onProgress?.({
      stage: "encode",
      message: `Encoding ${job.label} GIF...`,
      progress: i / jobs.length,
    });

    const { outputPath, fileSizeBytes } = await encodeGif({
      inputDir: compositedDir,
      outputDir,
      size: job.scaleSize,
      tag: job.tag,
      fps: job.fps,
      maxColors: job.maxColors,
      dither: baseOpts.dither,
      alphaThreshold: baseOpts.alphaThreshold,
      gifsickleLossy: job.gifsickleLossy,
    });

    results.push({
      size: job.size,
      label: job.label,
      outputPath,
      fileSizeBytes,
      degraded: false,
      degradationSteps: [],
    });
  }

  onProgress?.({
    stage: "encode",
    message: "All sizes encoded",
    progress: 1,
  });

  return results;
}
