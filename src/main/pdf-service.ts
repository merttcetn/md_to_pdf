import { access } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function resolveBrowserExecutable(): Promise<string> {
  const fromEnv = process.env.CHROME_PATH;
  const candidates = [
    fromEnv,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "No supported Chromium-based browser found. Install Chrome/Chromium/Edge or set CHROME_PATH."
  );
}

export async function renderHtmlToPdf(html: string, outputPath: string): Promise<void> {
  const executablePath = await resolveBrowserExecutable();

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox"]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(100);

    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0"
      }
    });
  } finally {
    await browser.close();
  }
}

export function buildPrintableHtml(input: {
  pagesHtml: string;
  styleCss: string;
  katexCss: string;
  templateId: string;
  fontId: string;
  fontSize: number;
}): string {
  const fontAttr = input.fontId && input.fontId !== "default" ? ` data-font=\"${input.fontId}\"` : "";
  const fontSizeStyle = input.fontSize > 0 ? ` style="--doc-size: ${input.fontSize}px"` : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <style>${input.katexCss}</style>
    <style>${input.styleCss}</style>
  </head>
  <body>
    <div id="appShell">
      <main id="previewViewport">
        <article id="previewPaper" class="template-${input.templateId}"${fontAttr}${fontSizeStyle}>
          <div id="previewPages">${input.pagesHtml}</div>
        </article>
      </main>
    </div>
  </body>
</html>`;
}

export function resolveKatexCssPath(distDir: string): string {
  return path.resolve(distDir, "../node_modules/katex/dist/katex.min.css");
}
