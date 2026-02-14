#!/usr/bin/env node
import express from "express";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, stat } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { buildPrintableHtml, renderHtmlToPdf, resolveKatexCssPath } from "./main/pdf-service";
import { deriveDefaultOutputPath, normalizePdfPath, validateInputMarkdownPath } from "./main/path-utils";
import { FONT_IDS, FONT_SIZE_DEFAULT, FONT_SIZE_MAX, FONT_SIZE_MIN, TEMPLATE_IDS, type BrowseEntry, type BrowseResponse, type FontId, type GenerateRequest, type GenerateResponse, type InitialState, type TemplateId } from "./shared/types";

const cliInputArg = process.argv[2];

function isTemplateId(value: string): value is TemplateId {
  return TEMPLATE_IDS.includes(value as TemplateId);
}

function isFontId(value: string): value is FontId {
  return FONT_IDS.includes(value as FontId);
}

async function openInBrowser(url: string): Promise<void> {
  const platform = process.platform;
  const commandAndArgs =
    platform === "darwin"
      ? { command: "open", args: [url] }
      : platform === "win32"
        ? { command: "cmd", args: ["/c", "start", "", url] }
        : { command: "xdg-open", args: [url] };

  await new Promise<void>((resolve, reject) => {
    const child = spawn(commandAndArgs.command, commandAndArgs.args, {
      detached: true,
      stdio: "ignore"
    });

    child.on("error", reject);
    child.unref();
    resolve();
  });
}

async function main(): Promise<void> {
  if (!cliInputArg) {
    console.error("Usage: md2pdf <input.md>");
    process.exit(1);
    return;
  }

  const inputPath = path.resolve(cliInputArg);
  const validation = await validateInputMarkdownPath(inputPath);
  if (!validation.ok) {
    console.error(validation.reason);
    process.exit(1);
    return;
  }

  const initialState: InitialState = {
    inputPath,
    inputFileName: path.basename(inputPath),
    inputDir: path.dirname(inputPath),
    defaultOutputPath: deriveDefaultOutputPath(inputPath)
  };

  const distDir = __dirname;
  const rendererDir = path.join(distDir, "renderer");
  const styleCssPath = path.join(rendererDir, "styles.css");
  const katexCssPath = resolveKatexCssPath(distDir);

  if (!existsSync(styleCssPath)) {
    console.error("Renderer assets missing. Run: npm run build");
    process.exit(1);
    return;
  }

  const styleCss = readFileSync(styleCssPath, "utf8");
  const katexCss = existsSync(katexCssPath) ? readFileSync(katexCssPath, "utf8") : "";

  const app = express();
  app.use(express.json({ limit: "20mb" }));

  app.get("/", (_req, res) => {
    res.sendFile(path.join(rendererDir, "index.html"));
  });

  app.get("/vendor/katex.min.css", (_req, res) => {
    res.type("text/css").send(katexCss);
  });

  app.use(express.static(rendererDir));

  app.get("/api/init", (_req, res) => {
    res.json(initialState);
  });

  app.get("/api/browse", async (req, res) => {
    const dir = typeof req.query.dir === "string" ? path.resolve(req.query.dir) : initialState.inputDir;

    try {
      const items = await readdir(dir);
      const entries: BrowseEntry[] = [];

      for (const name of items) {
        if (name.startsWith(".")) {
          continue;
        }

        try {
          const info = await stat(path.join(dir, name));
          if (info.isDirectory() || name.toLowerCase().endsWith(".pdf")) {
            entries.push({ name, isDirectory: info.isDirectory() });
          }
        } catch {
          // skip inaccessible entries
        }
      }

      entries.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }

        return a.name.localeCompare(b.name);
      });

      const response: BrowseResponse = { dir, entries };
      res.json(response);
    } catch {
      const response: BrowseResponse = { dir, entries: [] };
      res.json(response);
    }
  });

  app.get("/api/markdown", async (_req, res) => {
    try {
      const source = readFileSync(initialState.inputPath, "utf8");
      res.json(source);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unable to read markdown source.";
      res.status(500).json({ error: reason });
    }
  });

  let finalized = false;
  let exitCode = 0;
  let resolveCompletion: (() => void) | null = null;
  const completion = new Promise<void>((resolve) => {
    resolveCompletion = resolve;
  });

  const finalize = (code: number): void => {
    if (finalized) {
      return;
    }

    finalized = true;
    exitCode = code;
    resolveCompletion?.();
  };

  app.post("/api/generate", async (req, res) => {
    const payload = req.body as Partial<GenerateRequest>;
    const outputPath = normalizePdfPath(String(payload.outputPath ?? ""));
    const templateId = String(payload.templateId ?? "");
    const fontId = String(payload.fontId ?? "default");
    const fontSize = Number(payload.fontSize ?? FONT_SIZE_DEFAULT);
    const pagesHtml = String(payload.pagesHtml ?? "");
    const forceOverwrite = Boolean(payload.forceOverwrite);

    if (!outputPath) {
      const response: GenerateResponse = { ok: false, code: "VALIDATION_ERROR", reason: "Output path is required." };
      res.json(response);
      return;
    }

    if (!isTemplateId(templateId)) {
      const response: GenerateResponse = { ok: false, code: "VALIDATION_ERROR", reason: "Invalid template selected." };
      res.json(response);
      return;
    }

    if (!isFontId(fontId)) {
      const response: GenerateResponse = { ok: false, code: "VALIDATION_ERROR", reason: "Invalid font selected." };
      res.json(response);
      return;
    }

    if (fontSize !== FONT_SIZE_DEFAULT && (fontSize < FONT_SIZE_MIN || fontSize > FONT_SIZE_MAX)) {
      const response: GenerateResponse = { ok: false, code: "VALIDATION_ERROR", reason: "Invalid font size." };
      res.json(response);
      return;
    }

    if (!pagesHtml) {
      const response: GenerateResponse = { ok: false, code: "VALIDATION_ERROR", reason: "Preview pages are empty." };
      res.json(response);
      return;
    }

    if (existsSync(outputPath) && !forceOverwrite) {
      const response: GenerateResponse = {
        ok: false,
        code: "OVERWRITE_REQUIRED",
        reason: "A file already exists at this path."
      };
      res.json(response);
      return;
    }

    try {
      await mkdir(path.dirname(outputPath), { recursive: true });

      const html = buildPrintableHtml({
        pagesHtml,
        styleCss,
        katexCss,
        templateId,
        fontId,
        fontSize
      });

      await renderHtmlToPdf(html, outputPath);

      const response: GenerateResponse = { ok: true };
      res.json(response);

      setTimeout(() => finalize(0), 120);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Failed to generate PDF.";
      const response: GenerateResponse = { ok: false, code: "WRITE_FAILED", reason };
      res.json(response);
    }
  });

  app.post("/api/cancel", (_req, res) => {
    res.json({ ok: true });
    setTimeout(() => finalize(0), 30);
  });

  const server = createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${address.port}/`;

  console.log(`Opening preview: ${url}`);
  console.log("Tip: If the tab closes accidentally, rerun md2pdf.");

  await openInBrowser(url);

  await completion;

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  process.exit(exitCode);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unknown fatal error.");
  process.exit(1);
});
