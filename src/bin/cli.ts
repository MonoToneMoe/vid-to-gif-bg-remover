#!/usr/bin/env node

import { Command } from "commander";
import { resolve } from "node:path";
import { PipelineConfigSchema } from "../types/pipeline.js";
import { runPipeline } from "../pipeline/runner.js";
import { createSpinnerProgress } from "../utils/progress.js";

const program = new Command();

program
  .name("bg-remove")
  .description(
    "Remove video backgrounds and create transparent GIFs (28, 56, 112, 512 + raw)"
  )
  .version("1.0.0")
  .argument("<video>", "Path to input video file")
  .option("-o, --output <dir>", "Output directory (default: ./emotes/ next to input)")
  .option("--fps <number>", "Frames per second (overrides quality preset)", parseFloat)
  .option("--start <seconds>", "Start time in seconds", parseFloat)
  .option("--end <seconds>", "End time in seconds", parseFloat)
  .option(
    "-q, --quality <preset>",
    "Quality preset: high, balanced, small",
    "balanced"
  )
  .option(
    "--alpha-threshold <number>",
    "Alpha threshold for GIF transparency (0-255)",
    parseInt
  )
  .option("--model-path <path>", "Path to RVM ONNX model file")
  .option("--keep-temp", "Keep temporary files for debugging")
  .action(async (video: string, opts: Record<string, unknown>) => {
    try {
      // Parse and validate config
      const rawConfig = {
        inputPath: resolve(video),
        outputDir: opts.output ? resolve(opts.output as string) : undefined,
        fps: opts.fps as number | undefined,
        start: opts.start as number | undefined,
        end: opts.end as number | undefined,
        quality: (opts.quality as string) ?? "balanced",
        alphaThreshold: opts.alphaThreshold as number | undefined,
        modelPath: opts.modelPath ? resolve(opts.modelPath as string) : undefined,
        keepTemp: (opts.keepTemp as boolean) ?? false,
      };

      const config = PipelineConfigSchema.parse(rawConfig);

      // Set up progress spinner
      const { callback, spinner } = createSpinnerProgress();

      // Run pipeline
      const result = await runPipeline(config, callback);

      spinner.succeed("Pipeline complete!");

      // Print results
      console.log(`\nProcessed ${result.frameCount} frames\n`);
      console.log("Output files:");
      for (const output of result.outputs) {
        const sizeKB = (output.fileSizeBytes / 1024).toFixed(1);
        const sizeMB = output.fileSizeBytes / (1024 * 1024);
        const sizeStr = sizeMB >= 1 ? `${sizeMB.toFixed(1)}MB` : `${sizeKB}KB`;
        const degradeNote = output.degraded
          ? ` (degraded: ${output.degradationSteps.join(", ")})`
          : "";
        const pad = output.label.padEnd(24);
        console.log(`  ${pad} ${output.outputPath} (${sizeStr})${degradeNote}`);
      }
      console.log();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${message}\n`);
      process.exit(1);
    }
  });

program.parse();
