import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deriveDefaultOutputPath, normalizePdfPath, validateInputMarkdownPath } from "../main/path-utils";

test("deriveDefaultOutputPath uses same directory and .pdf extension", () => {
  const input = "/tmp/docs/guide.md";
  assert.equal(deriveDefaultOutputPath(input), "/tmp/docs/guide.pdf");
});

test("normalizePdfPath appends .pdf when extension is missing", () => {
  assert.equal(normalizePdfPath("/tmp/out/report"), "/tmp/out/report.pdf");
  assert.equal(normalizePdfPath(" /tmp/out/report.pdf "), "/tmp/out/report.pdf");
});

test("validateInputMarkdownPath accepts readable .md files", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "md-to-pdf-test-"));
  const filePath = path.join(dir, "notes.md");
  await writeFile(filePath, "# test\n");

  const result = await validateInputMarkdownPath(filePath);
  assert.equal(result.ok, true);
});

test("validateInputMarkdownPath rejects non-.md files", async () => {
  const result = await validateInputMarkdownPath("/tmp/docs/file.txt");
  assert.equal(result.ok, false);
});
