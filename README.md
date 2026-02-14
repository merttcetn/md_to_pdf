# 📄 md_to_pdf

A CLI tool that previews Markdown files in the browser and converts them to PDF.

When you run it in the terminal, an A4-paginated preview opens in your browser. After selecting a template and font and clicking **OK**, a PDF is generated with the exact same appearance.

## ✨ Features

- **4 templates** &mdash; Clean, Classic, Modern, Academic
- **4 font options** &mdash; Jakarta Sans, Times New Roman, Figtree, or the template default
- **KaTeX** math formulas
- **Mermaid** diagrams
- **Task list** support
- **Image support** &mdash; relative paths are resolved automatically
- **Overwrite protection** &mdash; asks for confirmation if the output file already exists

## 📋 Requirements

- **Node.js 20+**
- **Chromium-based browser** (Chrome, Chromium, Edge, or Brave)

> On macOS, default browser paths are scanned automatically. If your browser is in a different location, set the `CHROME_PATH` environment variable.

## 📦 Installation

### Via npm (from GitHub)

```bash
npm install -g github:merttcetn/md_to_pdf
```

This command installs dependencies, builds the project, and makes the `md_to_pdf` command available globally.

### Build from source

```bash
git clone https://github.com/merttcetn/md_to_pdf.git
cd md_to_pdf
npm install   # installs dependencies and builds automatically
npm install -g .
```

### One-line installation (script)

```bash
bash installation.sh
```

If you do not want a global installation:

```bash
bash installation.sh --no-global
```

## 🔄 Update

### If installed via npm

```bash
npm update -g md_to_pdf
```

### If installed from source

```bash
cd md_to_pdf
git pull
npm install
npm install -g .
```

## 🚀 Usage

```bash
md_to_pdf file.md
```

1. A preview opens in your browser.
2. Select a template and font.
3. Set the output PDF path.
4. Click **OK** to generate the PDF, or **Cancel** to exit.

## 🛠️ Development

```bash
npm install        # install dependencies + build
npm run build      # manual build
npm test           # run tests
```

### Project Structure

```
src/
  cli.ts                 # Express server + CLI entry point
  main/
    pdf-service.ts       # PDF generation with Playwright
    path-utils.ts        # File path utilities
  renderer/
    index.html           # Web UI
    renderer.ts          # Markdown rendering + pagination
    styles.css           # Glassmorphism-themed styles
  shared/
    types.ts             # Shared type definitions
    templates.ts         # Template list
```

## 📜 License

MIT
