export const TEMPLATE_IDS = ["clean", "classic", "modern", "academic"] as const;
export const FONT_IDS = ["default", "jakarta", "times", "figtree"] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];
export type FontId = (typeof FONT_IDS)[number];

export interface InitialState {
  inputPath: string;
  inputFileName: string;
  inputDir: string;
  defaultOutputPath: string;
}

export interface PickOutputPathResponse {
  selectedPath: string | null;
}

export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 24;
export const FONT_SIZE_DEFAULT = 0;

export interface GenerateRequest {
  outputPath: string;
  templateId: TemplateId;
  fontId: FontId;
  fontSize: number;
  pagesHtml: string;
  forceOverwrite?: boolean;
}

export interface GenerateResponse {
  ok: boolean;
  code?: "OVERWRITE_DECLINED" | "WRITE_FAILED" | "VALIDATION_ERROR" | "OVERWRITE_REQUIRED";
  reason?: string;
}

export interface BrowseEntry {
  name: string;
  isDirectory: boolean;
}

export interface BrowseResponse {
  dir: string;
  entries: BrowseEntry[];
}
