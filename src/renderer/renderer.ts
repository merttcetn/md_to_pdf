import MarkdownIt from "markdown-it";
import markdownItKatex from "markdown-it-katex";
import markdownItTaskLists from "markdown-it-task-lists";
import mermaid from "mermaid";
import { TEMPLATES } from "../shared/templates";
import { FONT_SIZE_DEFAULT, FONT_SIZE_MAX, FONT_SIZE_MIN, TEMPLATE_IDS, type BrowseResponse, type FontId, type GenerateRequest, type GenerateResponse, type InitialState, type TemplateId } from "../shared/types";

interface FontOption {
  id: FontId;
  label: string;
}

const FONT_OPTIONS: FontOption[] = [
  { id: "default", label: "Template Default" },
  { id: "jakarta", label: "Jakarta Sans" },
  { id: "times", label: "Times New Roman" },
  { id: "figtree", label: "Figtree" }
];

interface SelectOption {
  value: string;
  label: string;
}

class CustomSelect extends EventTarget {
  private static openInstance: CustomSelect | null = null;

  private readonly root: HTMLElement;
  private readonly trigger: HTMLButtonElement;
  private readonly valueElement: HTMLSpanElement;
  private readonly menu: HTMLDivElement;
  private readonly placeholder: string;
  private options: SelectOption[] = [];
  private currentValue = "";
  private isDisabled = false;

  public constructor(root: HTMLElement, label: string) {
    super();
    this.root = root;
    this.placeholder = `Select ${label}`;
    this.root.classList.add("custom-select");

    this.trigger = document.createElement("button");
    this.trigger.type = "button";
    this.trigger.className = "custom-select__trigger";
    this.trigger.setAttribute("aria-haspopup", "listbox");
    this.trigger.setAttribute("aria-expanded", "false");
    this.trigger.setAttribute("aria-label", label);

    this.valueElement = document.createElement("span");
    this.valueElement.className = "custom-select__value";
    this.valueElement.textContent = this.placeholder;

    const icon = document.createElement("span");
    icon.className = "custom-select__icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "▾";

    this.trigger.append(this.valueElement, icon);

    this.menu = document.createElement("div");
    this.menu.className = "custom-select__menu";
    this.menu.id = `${this.root.id}-listbox`;
    this.menu.setAttribute("role", "listbox");
    this.menu.hidden = true;

    this.trigger.setAttribute("aria-controls", this.menu.id);
    this.root.append(this.trigger, this.menu);

    this.trigger.addEventListener("click", () => {
      this.toggleMenu();
    });

    this.trigger.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.openMenu();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        this.closeMenu();
      }
    });

    this.menu.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const option = target.closest<HTMLButtonElement>(".custom-select__option");
      if (!option) {
        return;
      }

      const nextValue = option.dataset.value ?? "";
      this.setValue(nextValue, true);
      this.closeMenu();
      this.trigger.focus();
    });

    this.menu.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        this.closeMenu();
        this.trigger.focus();
      }
    });

    document.addEventListener("pointerdown", (event) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (!this.root.contains(event.target)) {
        this.closeMenu();
      }
    });
  }

  public get value(): string {
    return this.currentValue;
  }

  public set value(nextValue: string) {
    this.setValue(nextValue);
  }

  public get disabled(): boolean {
    return this.isDisabled;
  }

  public set disabled(disabled: boolean) {
    this.isDisabled = disabled;
    this.trigger.disabled = disabled;
    this.root.classList.toggle("is-disabled", disabled);
    if (disabled) {
      this.closeMenu();
    }
  }

  public setOptions(options: SelectOption[]): void {
    this.options = [...options];
    this.menu.innerHTML = "";

    for (const option of this.options) {
      const optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.className = "custom-select__option";
      optionButton.setAttribute("role", "option");
      optionButton.dataset.value = option.value;
      optionButton.textContent = option.label;
      this.menu.append(optionButton);
    }

    if (this.options.length === 0) {
      this.currentValue = "";
      this.valueElement.textContent = this.placeholder;
      return;
    }

    if (!this.options.some((option) => option.value === this.currentValue)) {
      this.currentValue = this.options[0].value;
    }

    this.syncSelectedState();
  }

  private setValue(nextValue: string, emitChange = false): void {
    if (!this.options.some((option) => option.value === nextValue)) {
      return;
    }

    if (nextValue === this.currentValue) {
      return;
    }

    this.currentValue = nextValue;
    this.syncSelectedState();

    if (emitChange) {
      this.dispatchEvent(new Event("change"));
    }
  }

  private syncSelectedState(): void {
    const selectedOption = this.options.find((option) => option.value === this.currentValue);
    this.valueElement.textContent = selectedOption?.label ?? this.placeholder;

    for (const element of this.menu.querySelectorAll<HTMLButtonElement>(".custom-select__option")) {
      const isSelected = (element.dataset.value ?? "") === this.currentValue;
      element.classList.toggle("is-selected", isSelected);
      element.setAttribute("aria-selected", isSelected ? "true" : "false");
    }
  }

  private openMenu(): void {
    if (this.isDisabled || this.options.length === 0) {
      return;
    }

    if (CustomSelect.openInstance && CustomSelect.openInstance !== this) {
      CustomSelect.openInstance.closeMenu();
    }

    this.root.classList.add("is-open");
    this.menu.hidden = false;
    this.trigger.setAttribute("aria-expanded", "true");
    CustomSelect.openInstance = this;
  }

  private closeMenu(): void {
    if (!this.root.classList.contains("is-open")) {
      return;
    }

    this.root.classList.remove("is-open");
    this.menu.hidden = true;
    this.trigger.setAttribute("aria-expanded", "false");

    if (CustomSelect.openInstance === this) {
      CustomSelect.openInstance = null;
    }
  }

  private toggleMenu(): void {
    if (this.root.classList.contains("is-open")) {
      this.closeMenu();
      return;
    }

    this.openMenu();
  }
}

const sourcePathElement = document.getElementById("sourcePath") as HTMLParagraphElement;
const templateSelectRoot = document.getElementById("templateSelect") as HTMLElement;
const fontSelectRoot = document.getElementById("fontSelect") as HTMLElement;
const fontSizeRange = document.getElementById("fontSizeRange") as HTMLInputElement;
const fontSizeLabel = document.getElementById("fontSizeLabel") as HTMLSpanElement;
const outputPathInput = document.getElementById("outputPath") as HTMLInputElement;
const choosePathButton = document.getElementById("choosePath") as HTMLButtonElement;
const previewPaper = document.getElementById("previewPaper") as HTMLElement;
const previewPages = document.getElementById("previewPages") as HTMLElement;
const previewContent = document.getElementById("previewContent") as HTMLElement;
const statusElement = document.getElementById("status") as HTMLParagraphElement;
const cancelButton = document.getElementById("cancelButton") as HTMLButtonElement;
const okButton = document.getElementById("okButton") as HTMLButtonElement;

const pathModal = document.getElementById("pathModal") as HTMLDivElement;
const modalClose = document.getElementById("modalClose") as HTMLButtonElement;
const modalBreadcrumb = document.getElementById("modalBreadcrumb") as HTMLDivElement;
const modalList = document.getElementById("modalList") as HTMLDivElement;
const modalFileName = document.getElementById("modalFileName") as HTMLInputElement;
const modalCancel = document.getElementById("modalCancel") as HTMLButtonElement;
const modalConfirm = document.getElementById("modalConfirm") as HTMLButtonElement;

if (
  !sourcePathElement ||
  !templateSelectRoot ||
  !fontSelectRoot ||
  !fontSizeRange ||
  !fontSizeLabel ||
  !outputPathInput ||
  !choosePathButton ||
  !previewPaper ||
  !previewPages ||
  !previewContent ||
  !statusElement ||
  !cancelButton ||
  !okButton ||
  !pathModal ||
  !modalClose ||
  !modalBreadcrumb ||
  !modalList ||
  !modalFileName ||
  !modalCancel ||
  !modalConfirm
) {
  throw new Error("Renderer bootstrap failed: required DOM nodes are missing.");
}

const templateSelect = new CustomSelect(templateSelectRoot, "Template");
const fontSelect = new CustomSelect(fontSelectRoot, "Font");

let latestRender: Promise<void> = Promise.resolve();
(window as Window & { __mdToPdfAwaitPreviewReady?: () => Promise<void> }).__mdToPdfAwaitPreviewReady = () => latestRender;

let initialState: InitialState;
let markdownSource = "";
let flowFinished = false;
let resizeTimer: ReturnType<typeof setTimeout> | undefined;

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false
});

markdown.use(markdownItTaskLists as unknown as Parameters<MarkdownIt["use"]>[0], {
  enabled: true,
  label: true,
  labelAfter: true
});
markdown.use(markdownItKatex as unknown as Parameters<MarkdownIt["use"]>[0]);

const defaultImageRenderer = markdown.renderer.rules.image;
markdown.renderer.rules.image = (tokens, index, options, env, self) => {
  const token = tokens[index];
  const srcAttrIndex = token.attrIndex("src");

  if (srcAttrIndex >= 0) {
    const src = token.attrs?.[srcAttrIndex]?.[1] ?? "";
    const baseDir = typeof env.baseDir === "string" ? env.baseDir : "";
    token.attrs![srcAttrIndex][1] = resolveImageSource(src, baseDir);
  }

  if (defaultImageRenderer) {
    return defaultImageRenderer(tokens, index, options, env, self);
  }

  return self.renderToken(tokens, index, options);
};

const defaultFenceRenderer = markdown.renderer.rules.fence;
markdown.renderer.rules.fence = (tokens, index, options, env, self) => {
  const token = tokens[index];
  const info = token.info.trim().toLowerCase();

  if (info === "mermaid") {
    return `<div class=\"mermaid\">${markdown.utils.escapeHtml(token.content)}</div>`;
  }

  if (defaultFenceRenderer) {
    return defaultFenceRenderer(tokens, index, options, env, self);
  }

  return self.renderToken(tokens, index, options);
};

function resolveImageSource(src: string, baseDir: string): string {
  if (!src) {
    return src;
  }

  if (/^(https?:|data:|file:)/i.test(src)) {
    return src;
  }

  if (!baseDir) {
    return src;
  }

  const normalizedBaseDir = baseDir.replace(/\\/g, "/");
  const baseUrl = normalizedBaseDir.endsWith("/")
    ? `file://${normalizedBaseDir}`
    : `file://${normalizedBaseDir}/`;

  try {
    return new URL(src, baseUrl).toString();
  } catch {
    return src;
  }
}

async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function apiPost<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`POST ${url} failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function setBusy(isBusy: boolean): void {
  okButton.disabled = isBusy;
  cancelButton.disabled = isBusy;
  choosePathButton.disabled = isBusy;
  templateSelect.disabled = isBusy;
  fontSelect.disabled = isBusy;
  fontSizeRange.disabled = isBusy;
}

function setStatus(message: string, isError = false): void {
  statusElement.textContent = message;
  statusElement.classList.toggle("error", isError);
}

function applyTemplate(templateId: TemplateId): void {
  for (const id of TEMPLATE_IDS) {
    previewPaper.classList.remove(`template-${id}`);
  }
  previewPaper.classList.add(`template-${templateId}`);
}

function applyFont(fontId: FontId): void {
  if (fontId === "default") {
    delete previewPaper.dataset.font;
    return;
  }

  previewPaper.dataset.font = fontId;
}

function getCurrentFontSize(): number {
  return Number(fontSizeRange.value) || FONT_SIZE_DEFAULT;
}

function applyFontSize(size: number): void {
  if (size === FONT_SIZE_DEFAULT) {
    previewPaper.style.removeProperty("--doc-size");
    fontSizeLabel.textContent = "Font Size (Template Default)";
    return;
  }

  const clamped = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, size));
  previewPaper.style.setProperty("--doc-size", `${clamped}px`);
  fontSizeLabel.textContent = `Font Size (${clamped}px)`;
}

function createPreviewPage(): HTMLElement {
  const page = document.createElement("section");
  page.className = "preview-page";

  const content = document.createElement("div");
  content.className = "doc-flow preview-page-content";

  page.append(content);
  previewPages.append(page);
  return content;
}

function getPageContentCapacity(pageContent: HTMLElement): number {
  return pageContent.clientHeight || Math.floor(parseFloat(getComputedStyle(pageContent).height));
}

function paginateIntoPages(): number {
  previewPages.innerHTML = "";

  let currentPageContent = createPreviewPage();
  let currentCapacity = getPageContentCapacity(currentPageContent);

  for (const node of Array.from(previewContent.childNodes)) {
    const clonedNode = node.cloneNode(true);
    currentPageContent.append(clonedNode);

    if (currentPageContent.scrollHeight > currentCapacity + 1) {
      currentPageContent.removeChild(clonedNode);
      currentPageContent = createPreviewPage();
      currentCapacity = getPageContentCapacity(currentPageContent);
      currentPageContent.append(clonedNode);

      if (currentPageContent.scrollHeight > currentCapacity + 1 && clonedNode instanceof HTMLElement) {
        clonedNode.classList.add("oversized-block");
      }
    }
  }

  return previewPages.children.length;
}

async function renderMermaidIn(container: HTMLElement): Promise<void> {
  const mermaidNodes = Array.from(container.querySelectorAll<HTMLElement>(".mermaid"));
  if (mermaidNodes.length === 0) {
    return;
  }

  try {
    await mermaid.run({ nodes: mermaidNodes });
  } catch {
    for (const node of mermaidNodes) {
      node.innerHTML = `<pre><code>${node.textContent ?? ""}</code></pre>`;
    }
  }
}

async function renderPreview(): Promise<number> {
  const html = markdown.render(markdownSource, { baseDir: initialState.inputDir });
  previewContent.innerHTML = html;

  await renderMermaidIn(previewContent);

  if ("fonts" in document) {
    await (document as Document & { fonts: FontFaceSet }).fonts.ready;
  }

  return paginateIntoPages();
}

function attemptCloseWindow(): void {
  window.close();
}

async function refreshPreview(messagePrefix = "Preview ready"): Promise<void> {
  const pageCount = await renderPreview();
  setStatus(`${messagePrefix} (${pageCount} page${pageCount === 1 ? "" : "s"}).`);
}

let modalCurrentDir = "";
let modalResolve: ((value: string | null) => void) | null = null;

function extractDirAndFile(fullPath: string): { dir: string; file: string } {
  const lastSlash = fullPath.lastIndexOf("/");
  if (lastSlash === -1) {
    return { dir: "", file: fullPath };
  }

  return { dir: fullPath.substring(0, lastSlash), file: fullPath.substring(lastSlash + 1) };
}

function renderBreadcrumb(dir: string): void {
  modalBreadcrumb.innerHTML = "";
  const segments = dir.split("/").filter(Boolean);

  const rootButton = document.createElement("button");
  rootButton.type = "button";
  rootButton.className = "modal__breadcrumb-segment";
  rootButton.textContent = "/";
  rootButton.addEventListener("click", () => void navigateTo("/"));
  modalBreadcrumb.append(rootButton);

  let accumulated = "";
  for (const segment of segments) {
    accumulated += "/" + segment;
    const path = accumulated;

    const separator = document.createElement("span");
    separator.className = "modal__breadcrumb-separator";
    separator.textContent = "/";
    modalBreadcrumb.append(separator);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "modal__breadcrumb-segment";
    button.textContent = segment;
    button.addEventListener("click", () => void navigateTo(path));
    modalBreadcrumb.append(button);
  }
}

async function navigateTo(dir: string): Promise<void> {
  modalCurrentDir = dir;
  renderBreadcrumb(dir);
  modalList.innerHTML = "";

  try {
    const data = await apiGet<BrowseResponse>(`/api/browse?dir=${encodeURIComponent(dir)}`);
    modalCurrentDir = data.dir;
    renderBreadcrumb(data.dir);

    if (data.entries.length === 0) {
      const empty = document.createElement("div");
      empty.className = "modal__empty";
      empty.textContent = "Empty folder";
      modalList.append(empty);
      return;
    }

    for (const entry of data.entries) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "modal__entry";

      const icon = document.createElement("span");
      icon.className = "modal__entry-icon";
      icon.innerHTML = entry.isDirectory
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>';

      const name = document.createElement("span");
      name.className = "modal__entry-name";
      name.textContent = entry.name;

      button.append(icon, name);

      if (entry.isDirectory) {
        button.addEventListener("click", () => {
          void navigateTo(modalCurrentDir + "/" + entry.name);
        });
      } else {
        button.addEventListener("click", () => {
          modalFileName.value = entry.name;
        });
      }

      modalList.append(button);
    }
  } catch {
    const empty = document.createElement("div");
    empty.className = "modal__empty";
    empty.textContent = "Unable to read directory";
    modalList.append(empty);
  }
}

function openPathModal(): Promise<string | null> {
  const currentPath = outputPathInput.value.trim();
  const { dir, file } = extractDirAndFile(currentPath);

  modalFileName.value = file || "output.pdf";
  pathModal.hidden = false;

  void navigateTo(dir || initialState.inputDir);

  return new Promise<string | null>((resolve) => {
    modalResolve = resolve;
  });
}

function closePathModal(result: string | null): void {
  pathModal.hidden = true;
  modalResolve?.(result);
  modalResolve = null;
}

function confirmPathModal(): void {
  const fileName = modalFileName.value.trim();
  if (!fileName) {
    return;
  }

  const finalName = fileName.toLowerCase().endsWith(".pdf") ? fileName : fileName + ".pdf";
  closePathModal(modalCurrentDir + "/" + finalName);
}

modalClose.addEventListener("click", () => closePathModal(null));
modalCancel.addEventListener("click", () => closePathModal(null));
modalConfirm.addEventListener("click", () => confirmPathModal());

modalFileName.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    confirmPathModal();
  }
});

pathModal.addEventListener("click", (event) => {
  if (event.target === pathModal) {
    closePathModal(null);
  }
});

async function chooseOutputPath(): Promise<void> {
  const picked = await openPathModal();
  if (picked) {
    outputPathInput.value = picked;
  }
}

async function handleGenerate(): Promise<void> {
  setBusy(true);
  setStatus("Generating PDF...");

  latestRender = refreshPreview("Final preview");
  await latestRender;

  const requestBase: GenerateRequest = {
    outputPath: outputPathInput.value,
    templateId: templateSelect.value as TemplateId,
    fontId: fontSelect.value as FontId,
    fontSize: getCurrentFontSize(),
    pagesHtml: previewPages.innerHTML
  };

  let response = await apiPost<GenerateResponse>("/api/generate", requestBase);

  if (!response.ok && response.code === "OVERWRITE_REQUIRED") {
    const overwrite = window.confirm("A file already exists at this path. Overwrite it?");
    if (overwrite) {
      response = await apiPost<GenerateResponse>("/api/generate", {
        ...requestBase,
        forceOverwrite: true
      });
    }
  }

  if (!response.ok) {
    setStatus(response.reason ?? "Failed to generate PDF.", true);
    setBusy(false);
    return;
  }

  flowFinished = true;
  setStatus("PDF generated. You can close this tab.");
  attemptCloseWindow();
}

async function cancelFlow(): Promise<void> {
  flowFinished = true;
  await apiPost<{ ok: boolean }>("/api/cancel", {});
  setStatus("Canceled. You can close this tab.");
  attemptCloseWindow();
}

async function initialize(): Promise<void> {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "default"
  });

  templateSelect.setOptions(TEMPLATES.map((template) => ({ value: template.id, label: template.label })));
  fontSelect.setOptions(FONT_OPTIONS.map((fontOption) => ({ value: fontOption.id, label: fontOption.label })));

  templateSelect.value = "clean";
  fontSelect.value = "default";
  fontSizeRange.min = String(FONT_SIZE_MIN);
  fontSizeRange.max = String(FONT_SIZE_MAX);
  fontSizeRange.value = String(FONT_SIZE_DEFAULT);

  initialState = await apiGet<InitialState>("/api/init");
  markdownSource = await apiGet<string>("/api/markdown");

  sourcePathElement.textContent = initialState.inputPath;
  outputPathInput.value = initialState.defaultOutputPath;

  applyTemplate(templateSelect.value as TemplateId);
  applyFont(fontSelect.value as FontId);
  applyFontSize(FONT_SIZE_DEFAULT);

  latestRender = refreshPreview();
  await latestRender;

  templateSelect.addEventListener("change", () => {
    applyTemplate(templateSelect.value as TemplateId);
    latestRender = refreshPreview("Template updated");
  });

  fontSelect.addEventListener("change", () => {
    applyFont(fontSelect.value as FontId);
    latestRender = refreshPreview("Font updated");
  });

  fontSizeRange.addEventListener("input", () => {
    const size = getCurrentFontSize();
    applyFontSize(size);
    latestRender = refreshPreview("Font size updated");
  });

  choosePathButton.addEventListener("click", () => {
    void chooseOutputPath();
  });

  okButton.addEventListener("click", () => {
    void handleGenerate();
  });

  cancelButton.addEventListener("click", () => {
    void cancelFlow();
  });

  window.addEventListener("resize", () => {
    if (resizeTimer) {
      clearTimeout(resizeTimer);
    }

    resizeTimer = setTimeout(() => {
      latestRender = refreshPreview("Layout updated");
    }, 180);
  });

  window.addEventListener("beforeunload", () => {
    if (!flowFinished) {
      navigator.sendBeacon("/api/cancel");
    }
  });
}

void initialize().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown renderer error.";
  setStatus(message, true);
  setBusy(false);
});
