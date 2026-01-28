import { z } from "zod";
import type { QualityPresetName } from "../constants.js";

/** Zod schema for CLI/API pipeline configuration */
export const PipelineConfigSchema = z.object({
  inputPath: z.string().min(1, "Input video path is required"),
  outputDir: z.string().optional(),
  fps: z.number().int().min(1).max(30).optional(),
  start: z.number().min(0).optional(),
  end: z.number().min(0).optional(),
  quality: z
    .enum(["high", "balanced", "small"])
    .optional()
    .default("balanced"),
  alphaThreshold: z.number().int().min(0).max(255).optional(),
  keepTemp: z.boolean().optional().default(false),
  modelPath: z.string().optional(),
});

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;

/** Metadata extracted from input video via ffprobe */
export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  fps: number;
  codec: string;
  filePath: string;
}

/** Info about a single extracted frame on disk */
export interface FrameInfo {
  /** Frame index (0-based) */
  index: number;
  /** Absolute path to the PNG file */
  path: string;
}

/** Session paths for temp directory structure */
export interface SessionPaths {
  root: string;
  extracted: string;
  alpha: string;
  composited: string;
  output: string;
}

/** Pipeline progress event types */
export type PipelineStage =
  | "validate"
  | "extract"
  | "segment"
  | "mask-refine"
  | "composite"
  | "encode"
  | "size-check";

export interface PipelineProgress {
  stage: PipelineStage;
  message: string;
  /** 0..1 progress within the current stage */
  progress?: number;
  /** Current frame index (for per-frame stages) */
  frameIndex?: number;
  /** Total frames */
  totalFrames?: number;
}

export type ProgressCallback = (event: PipelineProgress) => void;
