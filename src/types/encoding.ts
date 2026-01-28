import type { TwitchSize } from "../constants.js";

/** Mutable encoding options that can be adjusted by the degradation ladder */
export interface EncodingOptions {
  fps: number;
  maxColors: number;
  dither: string;
  gifsickleLossy: number;
  alphaThreshold: number;
}

/** Result of encoding a single GIF size variant */
export interface EncodingResult {
  /** Square size in pixels, or "raw" for the unresized version */
  size: TwitchSize | number | "raw";
  /** Human-readable label for display */
  label: string;
  outputPath: string;
  fileSizeBytes: number;
  /** Whether degradation was applied to meet size constraints */
  degraded: boolean;
  /** Labels of degradation steps applied */
  degradationSteps: string[];
}
