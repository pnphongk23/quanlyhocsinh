import { useCallback, useMemo, useRef, useState } from "react";
import { saveHomeworkSectionDurable } from "../../data/repositories/homework";
import { deepEqual } from "../../shared/hooks/useSaveAction";
import type { HomeworkKind, HomeworkSection } from "../../data/types";

export type HomeworkEditor =
  | { mode: "add"; kind: HomeworkKind }
  | { mode: "edit"; sectionId: string };

export interface HomeworkSectionForm {
  kind: HomeworkKind | null;
  title: string;
  description: string;
}

interface DraftState {
  editor: HomeworkEditor;
  form: HomeworkSectionForm;
  baseline: HomeworkSectionForm;
}

export interface HomeworkSectionDraft {
  editor: HomeworkEditor | null;
  form: HomeworkSectionForm;
  baseline: HomeworkSectionForm;
  dirty: boolean;
  setForm: (patch: Partial<HomeworkSectionForm>) => void;
  openAdd: (kind: HomeworkKind) => void;
  openEdit: (section: HomeworkSection) => void;
  close: () => void;
  /** Lỗi của lần lưu gần nhất; null khi chưa lỗi. */
  error: unknown;
  /** Như `error` nhưng đọc được ngay sau khi `save` trả về false. */
  lastError: () => unknown;
  /** Lưu nháp đang soạn; true khi đã ghi bền, false khi không hợp lệ hoặc lỗi (nháp còn nguyên). */
  save: () => Promise<boolean>;
}

const EMPTY_FORM: HomeworkSectionForm = { kind: null, title: "", description: "" };

/**
 * Nháp phần BTVN đang soạn của một buổi. Giữ ở màn buổi học để cây di động và cây desktop
 * cùng đọc, ghi một nháp và dùng một hàm lưu; đổi khổ không làm mất nháp.
 */
export function useHomeworkSectionDraft(sessionId: string): HomeworkSectionDraft {
  const [state, setState] = useState<DraftState | null>(null);
  const [error, setError] = useState<unknown>(null);
  const latest = useRef({ state, sessionId });
  latest.current = { state, sessionId };
  const saving = useRef(false);
  const lastErrorRef = useRef<unknown>(null);
  const lastError = useCallback(() => lastErrorRef.current, []);

  const open = useCallback((editor: HomeworkEditor, baseline: HomeworkSectionForm) => {
    setError(null);
    setState({ editor, form: baseline, baseline });
  }, []);
  const openAdd = useCallback((kind: HomeworkKind) => open({ mode: "add", kind }, { kind, title: "", description: "" }), [open]);
  const openEdit = useCallback((section: HomeworkSection) => open(
    { mode: "edit", sectionId: section.id },
    { kind: section.kind, title: section.title, description: section.description ?? "" },
  ), [open]);
  const close = useCallback(() => { setError(null); setState(null); }, []);
  const setForm = useCallback((patch: Partial<HomeworkSectionForm>) => {
    setState((current) => current ? { ...current, form: { ...current.form, ...patch } } : current);
  }, []);

  const save = useCallback(async () => {
    const { state: current, sessionId: session } = latest.current;
    if (!current) return true;
    const { editor, form, baseline } = current;
    if (deepEqual(form, baseline)) return true;
    if (!form.kind || form.title.trim() === "" || saving.current) return false;
    saving.current = true;
    try {
      await saveHomeworkSectionDurable({
        id: editor.mode === "edit" ? editor.sectionId : undefined,
        sessionId: session,
        kind: form.kind,
        title: form.title,
        description: form.description,
      });
      lastErrorRef.current = null;
      setError(null);
      setState((now) => now && now.editor === editor ? { ...now, baseline: form } : now);
      return true;
    } catch (cause) {
      lastErrorRef.current = cause ?? new Error("save_failed");
      setError(lastErrorRef.current);
      return false;
    } finally {
      saving.current = false;
    }
  }, []);

  const form = state?.form ?? EMPTY_FORM;
  const baseline = state?.baseline ?? EMPTY_FORM;
  const dirty = state !== null && !deepEqual(form, baseline);
  return useMemo(
    () => ({ editor: state?.editor ?? null, form, baseline, dirty, setForm, openAdd, openEdit, close, error, lastError, save }),
    [state, form, baseline, dirty, setForm, openAdd, openEdit, close, error, lastError, save],
  );
}
