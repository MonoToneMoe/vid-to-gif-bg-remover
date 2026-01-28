import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveFFprobePath } from "../utils/ffmpeg-path.js";
import type { VideoMetadata } from "../types/pipeline.js";

const execFileAsync = promisify(execFile);

/**
 * Probe a video file using ffprobe and return structured metadata.
 */
export async function probeVideo(filePath: string): Promise<VideoMetadata> {
  const ffprobe = await resolveFFprobePath();

  const { stdout } = await execFileAsync(ffprobe, [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);

  const data = JSON.parse(stdout);
  const videoStream = data.streams?.find(
    (s: Record<string, unknown>) => s.codec_type === "video"
  );

  if (!videoStream) {
    throw new Error(`No video stream found in ${filePath}`);
  }

  const width = videoStream.width as number;
  const height = videoStream.height as number;
  const duration = parseFloat(data.format?.duration ?? videoStream.duration ?? "0");
  const codec = (videoStream.codec_name as string) ?? "unknown";

  // Parse FPS from r_frame_rate (e.g. "30000/1001" or "30/1")
  let fps = 30;
  const rFrameRate = videoStream.r_frame_rate as string | undefined;
  if (rFrameRate) {
    const parts = rFrameRate.split("/");
    if (parts.length === 2) {
      const num = parseInt(parts[0], 10);
      const den = parseInt(parts[1], 10);
      if (den > 0) fps = num / den;
    }
  }

  return { width, height, duration, fps, codec, filePath };
}
