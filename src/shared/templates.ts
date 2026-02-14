import type { TemplateId } from "./types";

export interface TemplateDef {
  id: TemplateId;
  label: string;
}

export const TEMPLATES: TemplateDef[] = [
  { id: "clean", label: "Clean" },
  { id: "classic", label: "Classic" },
  { id: "modern", label: "Modern" },
  { id: "academic", label: "Academic" }
];
