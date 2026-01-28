import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { resolveFFmpegPath } from "../utils/ffmpeg-path.js";
import type { FrameInfo } from "../types/pipeline.js";

const execFileAsync = promisify(execFile);

export interface ExtractOptions {
  inputPath: string;
  outputDir: string;
  fps: number;
  start?: number;
  end?: number;
}

/**
 * Extract frames from a video file as numbered PNG files.
 * Returns an array of FrameInfo sorted by index.
 */
export async function extractFrames(opts: ExtractOptions): Promise<FrameInfo[]> {
  const ffmpeg = await resolveFFmpegPath();

  const args: string[] = [];

  // Input seeking (fast seek before -i)
  if (opts.start !== undefined) {
    args.push("-ss", opts.start.toString());
  }

  args.push("-i", opts.inputPath);

  // Duration limit
  if (opts.end !== undefined) {
    const duration =
      opts.start !== undefined ? opts.end - opts.start : opts.end;
    args.push("-t", duration.toString());
  }

  // Output options
  args.push(
    "-vf",
    `fps=${opts.fps}`,
    "-pix_fmt",
    "rgb24",
    "-y",
    join(opts.outputDir, "frame_%04d.png")
  );

  await execFileAsync(ffmpeg, args, { maxBuffer: 50 * 1024 * 1024 });

  // Read back extracted frame files
  const files = await readdir(opts.outputDir);
  const frameFiles = files
    .filter((f) => f.startsWith("frame_") && f.endsWith(".png"))
    .sort();

  return frameFiles.map((file, index) => ({
    index,
    path: join(opts.outputDir, file),
  }));
}
