import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Resolve the ffmpeg binary path. Uses the system PATH.
 * Throws an actionable error if not found.
 */
export async function resolveFFmpegPath(): Promise<string> {
  const name = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  try {
    await execFileAsync(name, ["-version"]);
    return name;
  } catch {
    throw new Error(
      `FFmpeg not found. Install it:\n` +
        `  Windows: winget install FFmpeg\n` +
        `  macOS:   brew install ffmpeg\n` +
        `  Linux:   sudo apt install ffmpeg`
    );
  }
}

/**
 * Resolve the ffprobe binary path. Uses the system PATH.
 * Throws an actionable error if not found.
 */
export async function resolveFFprobePath(): Promise<string> {
  const name = process.platform === "win32" ? "ffprobe.exe" : "ffprobe";
  try {
    await execFileAsync(name, ["-version"]);
    return name;
  } catch {
    throw new Error(
      `FFprobe not found. It is typically included with FFmpeg.\n` +
        `Install FFmpeg:\n` +
        `  Windows: winget install FFmpeg\n` +
        `  macOS:   brew install ffmpeg\n` +
        `  Linux:   sudo apt install ffmpeg`
    );
  }
}
