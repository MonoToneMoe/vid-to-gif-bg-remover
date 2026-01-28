import { access, constants } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/** Default model filename */
const MODEL_FILENAME = "rvm_mobilenetv3_fp32.onnx";

/** Model download URL */
const MODEL_URL =
  "https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3_fp32.onnx";

/**
 * Resolve the ONNX model path.
 * Search order:
 * 1. Explicit path from config
 * 2. ./models/ directory relative to project root
 * 3. Throws actionable error with download instructions
 */
export async function resolveModelPath(
  explicitPath?: string
): Promise<string> {
  if (explicitPath) {
    await assertFileExists(explicitPath);
    return resolve(explicitPath);
  }

  // Try models/ directory relative to project root (2 levels up from src/utils/)
  const projectModelsDir = join(__dirname, "..", "..", "..", "models");
  const projectModelPath = join(projectModelsDir, MODEL_FILENAME);
  try {
    await assertFileExists(projectModelPath);
    return projectModelPath;
  } catch {
    // Fall through
  }

  // Try models/ directory relative to CWD
  const cwdModelPath = join(process.cwd(), "models", MODEL_FILENAME);
  try {
    await assertFileExists(cwdModelPath);
    return cwdModelPath;
  } catch {
    // Fall through
  }

  throw new Error(
    `ONNX model not found. Download it:\n` +
      `  mkdir models\n` +
      `  curl -L -o models/${MODEL_FILENAME} \\\n` +
      `    ${MODEL_URL}\n\n` +
      `Or specify a path: --model-path /path/to/${MODEL_FILENAME}`
  );
}

async function assertFileExists(filePath: string): Promise<void> {
  await access(filePath, constants.R_OK);
}
