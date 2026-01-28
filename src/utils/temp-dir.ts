import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import type { SessionPaths } from "../types/pipeline.js";

/**
 * Create a unique session temp directory with subdirectories for each stage.
 */
export async function createSessionDir(): Promise<SessionPaths> {
  const root = await mkdtemp(join(tmpdir(), `bg-remove-${randomUUID().slice(0, 8)}-`));
  const extracted = join(root, "extracted");
  const alpha = join(root, "alpha");
  const composited = join(root, "composited");
  const output = join(root, "output");

  await Promise.all([
    mkdir(extracted),
    mkdir(alpha),
    mkdir(composited),
    mkdir(output),
  ]);

  return { root, extracted, alpha, composited, output };
}

/**
 * Remove the session temp directory and all contents.
 */
export async function cleanupSessionDir(root: string): Promise<void> {
  await rm(root, { recursive: true, force: true });
}
