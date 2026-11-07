import { lazy, type ComponentType } from "react";
import type { CriteriaLevelSnapshot } from "./customCriteriaModel";
import type { CustomCriteriaDraft } from "./customCriteriaModel";

type Props = {
  draft: CustomCriteriaDraft;
  homeworkGiven: boolean;
  sent: boolean;
  disabled: boolean;
  note: string;
  onLevelChange: (id: string, level: CriteriaLevelSnapshot["level"]) => void;
  onCommentChange: (value: string) => void;
  onCommentBlur?: () => void;
  onNoteChange: (value: string) => void;
  onNoteBlur?: () => void;
};

export const LazyCustomCriteriaFields = lazy(async (): Promise<{ default: ComponentType<Props> }> => {
  if (import.meta.env.VITE_CRITERIA_LEVELS === "1") {
    const module = await import("./CustomCriteriaFields");
    return { default: module.CustomCriteriaFields };
  }
  return { default: () => null };
});
