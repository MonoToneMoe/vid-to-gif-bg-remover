/** Twitch emote sizes in pixels */
export const TWITCH_SIZES = [28, 56, 112] as const;
export type TwitchSize = (typeof TWITCH_SIZES)[number];

/** All output sizes: Twitch emotes + 512px export */
export const OUTPUT_SIZES = [28, 56, 112, 512] as const;
export type OutputSize = (typeof OUTPUT_SIZES)[number];

/** Maximum file size for Twitch emotes (1 MB) */
export const MAX_EMOTE_BYTES = 1_048_576;

/** Maximum recommended clip duration in seconds */
export const MAX_CLIP_DURATION = 30;

/** Quality presets */
export const QUALITY_PRESETS = {
  high: {
    fps: 15,
    maxColors: 256,
    dither: "sierra2_4a" as const,
    gifsickleLossy: 30,
  },
  balanced: {
    fps: 12,
    maxColors: 256,
    dither: "sierra2_4a" as const,
    gifsickleLossy: 60,
  },
  small: {
    fps: 10,
    maxColors: 192,
    dither: "sierra2_4a" as const,
    gifsickleLossy: 80,
  },
} as const;

export type QualityPresetName = keyof typeof QUALITY_PRESETS;

/**
 * Degradation ladder — applied in order when output exceeds MAX_EMOTE_BYTES.
 * Each step is a function that mutates encoding options.
 */
export interface DegradationStep {
  label: string;
  apply(opts: { fps: number; maxColors: number; gifsickleLossy: number }): void;
}

export const DEGRADATION_LADDER: DegradationStep[] = [
  {
    label: "Reduce FPS by 2",
    apply(o) {
      o.fps = Math.max(8, o.fps - 2);
    },
  },
  {
    label: "Reduce max colors by 64",
    apply(o) {
      o.maxColors = Math.max(96, o.maxColors - 64);
    },
  },
  {
    label: "Increase gifsicle lossy by 30",
    apply(o) {
      o.gifsickleLossy = Math.min(200, o.gifsickleLossy + 30);
    },
  },
  {
    label: "Further reduce max colors by 32",
    apply(o) {
      o.maxColors = Math.max(64, o.maxColors - 32);
    },
  },
  {
    label: "Further reduce FPS by 2",
    apply(o) {
      o.fps = Math.max(6, o.fps - 2);
    },
  },
];

/** Supported video extensions */
export const SUPPORTED_VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".avi",
  ".mkv",
  ".webm",
  ".flv",
  ".wmv",
  ".m4v",
]);

/** Default alpha threshold for GIF binary transparency */
export const DEFAULT_ALPHA_THRESHOLD = 128;

/** Temporal smoothing weights */
export const TEMPORAL_WEIGHTS = {
  prev: 0.15,
  current: 0.7,
  next: 0.15,
} as const;

/** Edge refinement Gaussian blur sigma */
export const EDGE_BLUR_SIGMA = 0.5;
