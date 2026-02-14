# md_to_pdf

**Pixel-perfect Markdown → PDF.  
Preview it in your browser, paginate in A4, then export exactly what you see.**

Stop guessing how your PDF will look.  
`md_to_pdf` opens a real paginated preview, lets you pick a template and font, and generates a **WYSIWYG** PDF with identical layout.

> **The missing WYSIWYG Markdown → PDF CLI.**

---

## Why md_to_pdf?

Most Markdown → PDF tools:

* render differently in the final PDF
* break pagination
* require complex Pandoc configs
* don't support Mermaid/KaTeX properly
* have no visual template selection

**md_to_pdf fixes that.**

👉 What you preview = what you export.

---

## Key Features

* 🖥️ **Browser-based A4 preview** with real pagination
* 🎨 **Template picker** — Clean · Classic · Modern · Academic
* 🔤 **Font selection** — Jakarta Sans · Figtree · Times New Roman · Default
* 📐 **KaTeX math** support
* 🧩 **Mermaid diagrams**
* ☑️ Task lists
* 🖼️ Relative image auto-resolution
* 🛡️ Overwrite protection
* ⚡ One command CLI workflow

---

## One-liner

```bash
md_to_pdf file.md
```

Preview → choose style → export → done.

---

## 📋 Requirements

- **Node.js 20+**
- **Chromium-based browser** (Chrome, Chromium, Edge, or Brave)

> On macOS, default browser paths are scanned automatically. If your browser is in a different location, set the `CHROME_PATH` environment variable.

---

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

---

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

---

## 🚀 Usage

```bash
md_to_pdf file.md
```

1. A preview opens in your browser.
2. Select a template and font.
3. Set the output PDF path.
4. Click **OK** to generate the PDF, or **Cancel** to exit.

---

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

---
