import ora, { type Ora } from "ora";
import type { PipelineProgress, ProgressCallback } from "../types/pipeline.js";

const STAGE_LABELS: Record<string, string> = {
  validate: "Validating input",
  extract: "Extracting frames",
  segment: "Removing background (AI segmentation)",
  "mask-refine": "Refining masks",
  composite: "Compositing RGBA frames",
  encode: "Encoding GIFs",
  "size-check": "Checking file sizes",
};

/**
 * Create a progress callback that drives an ora spinner.
 * Returns both the callback and a handle to stop the spinner.
 */
export function createSpinnerProgress(): {
  callback: ProgressCallback;
  spinner: Ora;
} {
  const spinner = ora({ text: "Starting pipeline...", spinner: "dots" }).start();

  const callback: ProgressCallback = (event: PipelineProgress) => {
    const label = STAGE_LABELS[event.stage] ?? event.stage;
    let text = label;

    if (event.progress !== undefined) {
      const pct = Math.round(event.progress * 100);
      text += ` (${pct}%)`;
    }
    if (event.frameIndex !== undefined && event.totalFrames !== undefined) {
      text += ` [${event.frameIndex + 1}/${event.totalFrames}]`;
    }
    if (event.message && event.message !== label) {
      text += ` - ${event.message}`;
    }

    spinner.text = text;
  };

  return { callback, spinner };
}
