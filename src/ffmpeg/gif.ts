import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { stat } from "node:fs/promises";
import { resolveFFmpegPath } from "../utils/ffmpeg-path.js";

const execFileAsync = promisify(execFile);

export interface GifEncodeOptions {
  /** Directory containing composited RGBA PNGs named frame_%04d.png */
  inputDir: string;
  /** Output directory for the final GIF */
  outputDir: string;
  /** Target size in pixels (square). Null = no resize (original resolution). */
  size: number | null;
  /** Label used for temp/output filenames */
  tag: string;
  fps: number;
  maxColors: number;
  dither: string;
  alphaThreshold: number;
  /** Set to 0 to skip gifsicle entirely */
  gifsickleLossy: number;
}

/**
 * Resolve the gifsicle binary path.
 * Uses the npm gifsicle package which provides the binary.
 */
async function resolveGifsiclePath(): Promise<string> {
  try {
    // The gifsicle npm package exports the binary path
    const mod = await import("gifsicle");
    return (mod.default ?? mod) as string;
  } catch {
    throw new Error(
      "gifsicle not found. Ensure it is installed: npm install gifsicle"
    );
  }
}

/**
 * Encode composited RGBA PNGs into a GIF.
 *
 * Pipeline:
 * 1. FFmpeg pass 1: generate optimal palette
 * 2. FFmpeg pass 2: apply palette with dithering
 * 3. gifsicle: final optimization (skipped when gifsickleLossy === 0)
 */
export async function encodeGif(opts: GifEncodeOptions): Promise<{
  outputPath: string;
  fileSizeBytes: number;
}> {
  const ffmpeg = await resolveFFmpegPath();

  const inputPattern = join(opts.inputDir, "frame_%04d.png");
  const palettePath = join(opts.outputDir, `palette_${opts.tag}.png`);
  const rawGifPath = join(opts.outputDir, `raw_${opts.tag}.gif`);
  const finalGifPath = join(opts.outputDir, `emote_${opts.tag}.gif`);

  const scaleFilter = opts.size !== null
    ? `scale=${opts.size}:${opts.size}:flags=lanczos,`
    : "";

  const scaleLavfi = opts.size !== null
    ? `scale=${opts.size}:${opts.size}:flags=lanczos[x];[x][1:v]`
    : `[0:v][1:v]`;

  // Pass 1: Generate palette
  await execFileAsync(
    ffmpeg,
    [
      "-framerate",
      opts.fps.toString(),
      "-i",
      inputPattern,
      "-vf",
      `${scaleFilter}palettegen=max_colors=${opts.maxColors}:reserve_transparent=1:stats_mode=diff`,
      "-y",
      palettePath,
    ],
    { maxBuffer: 50 * 1024 * 1024 }
  );

  // Pass 2: Apply palette with dithering and transparency
  await execFileAsync(
    ffmpeg,
    [
      "-framerate",
      opts.fps.toString(),
      "-i",
      inputPattern,
      "-i",
      palettePath,
      "-lavfi",
      `${scaleLavfi}paletteuse=dither=${opts.dither}:alpha_threshold=${opts.alphaThreshold}`,
      "-gifflags",
      "-offsetting",
      "-y",
      rawGifPath,
    ],
    { maxBuffer: 50 * 1024 * 1024 }
  );

  // Pass 3: gifsicle optimization (skip for raw/uncompressed output)
  if (opts.gifsickleLossy > 0) {
    const gifsicle = await resolveGifsiclePath();
    await execFileAsync(gifsicle, [
      "-O3",
      `--lossy=${opts.gifsickleLossy}`,
      "--no-comments",
      "--no-names",
      "-o",
      finalGifPath,
      rawGifPath,
    ]);
  } else {
    // No gifsicle — the raw FFmpeg output is the final output
    const { rename } = await import("node:fs/promises");
    await rename(rawGifPath, finalGifPath);
  }

  const stats = await stat(finalGifPath);

  return {
    outputPath: finalGifPath,
    fileSizeBytes: stats.size,
  };
}
