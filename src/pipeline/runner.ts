import { resolve, dirname } from "node:path";
import { mkdir } from "node:fs/promises";
import { copyFile } from "node:fs/promises";
import { join } from "node:path";
import {
  QUALITY_PRESETS,
  DEFAULT_ALPHA_THRESHOLD,
} from "../constants.js";
import type { PipelineConfig, ProgressCallback } from "../types/pipeline.js";
import type { EncodingResult } from "../types/encoding.js";
import { createSessionDir, cleanupSessionDir } from "../utils/temp-dir.js";
import { resolveModelPath } from "../utils/model-path.js";

import { validateInput } from "./input-validation.js";
import { extractFrames } from "./frame-extraction.js";
import { segmentFrames } from "./segmentation.js";
import { refineMasks } from "./mask-postprocess.js";
import { compositeFrames } from "./compositing.js";
import { encodeAllSizes } from "./encoding.js";
import { checkAndDegrade } from "./size-check.js";

export interface PipelineResult {
  outputs: EncodingResult[];
  frameCount: number;
}

/**
 * Run the full video-to-emote pipeline.
 *
 * Stages:
 * 1. Validate input
 * 2. Extract frames
 * 3. AI segmentation (RVM)
 * 4. Mask refinement (temporal smoothing)
 * 5. Compositing (RGB + alpha → RGBA)
 * 6. GIF encoding (all 3 sizes)
 * 7. Size check + degradation
 */
export async function runPipeline(
  config: PipelineConfig,
  onProgress?: ProgressCallback
): Promise<PipelineResult> {
  const session = await createSessionDir();

  try {
    // Determine output directory
    const outputDir = config.outputDir
      ? resolve(config.outputDir)
      : resolve(dirname(config.inputPath), "emotes");
    await mkdir(outputDir, { recursive: true });

    // Stage 1: Validate
    const metadata = await validateInput(config, onProgress);

    // Determine FPS
    const preset = QUALITY_PRESETS[config.quality];
    const fps = config.fps ?? preset.fps;

    // Stage 2: Extract frames
    const frames = await extractFrames(config, session.extracted, fps, onProgress);

    // Stage 3: AI segmentation
    const modelPath = await resolveModelPath(config.modelPath);
    const alphaPaths = await segmentFrames(
      frames,
      session.alpha,
      modelPath,
      metadata.width,
      metadata.height,
      onProgress
    );

    // Stage 4: Mask refinement
    const refinedPaths = await refineMasks(alphaPaths, session.alpha, onProgress);

    // Stage 5: Compositing
    await compositeFrames(frames, refinedPaths, session.composited, onProgress);

    // Stage 6: GIF encoding
    const encodingResults = await encodeAllSizes(
      session.composited,
      session.output,
      config.quality,
      fps,
      config.alphaThreshold,
      onProgress
    );

    // Stage 7: Size check + degradation
    const baseOpts = {
      fps,
      maxColors: preset.maxColors,
      dither: preset.dither,
      gifsickleLossy: preset.gifsickleLossy,
      alphaThreshold: config.alphaThreshold ?? DEFAULT_ALPHA_THRESHOLD,
    };

    const finalResults = await checkAndDegrade(
      encodingResults,
      session.composited,
      baseOpts,
      onProgress
    );

    // Copy final outputs to the user's output directory
    const outputs: EncodingResult[] = [];
    for (const result of finalResults) {
      const filename = result.size === "raw"
        ? "emote_raw.gif"
        : `emote_${result.size}x${result.size}.gif`;
      const destPath = join(outputDir, filename);
      await copyFile(result.outputPath, destPath);
      outputs.push({
        ...result,
        outputPath: destPath,
      });
    }

    return { outputs, frameCount: frames.length };
  } finally {
    if (!config.keepTemp) {
      await cleanupSessionDir(session.root);
    } else {
      console.log(`Temp files kept at: ${session.root}`);
    }
  }
}
