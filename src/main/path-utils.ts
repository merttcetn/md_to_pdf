import { access } from "node:fs/promises";
import path from "node:path";

export function deriveDefaultOutputPath(inputPath: string): string {
  const parsed = path.parse(inputPath);
  return path.join(parsed.dir, `${parsed.name}.pdf`);
}

export function normalizePdfPath(outputPath: string): string {
  const trimmed = outputPath.trim();
  if (trimmed.length === 0) {
    return "";
  }

  if (trimmed.toLowerCase().endsWith(".pdf")) {
    return trimmed;
  }

  return `${trimmed}.pdf`;
}

export async function validateInputMarkdownPath(inputPath: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const resolved = path.resolve(inputPath);

  if (!resolved.toLowerCase().endsWith(".md")) {
    return { ok: false, reason: "Input file must have a .md extension." };
  }

  try {
    await access(resolved);
    return { ok: true };
  } catch {
    return { ok: false, reason: `Input file not found or not readable: ${resolved}` };
  }
}
