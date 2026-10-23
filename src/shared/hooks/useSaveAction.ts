import { useCallback, useEffect, useRef, useState } from "react";

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  return keysA.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
}

export interface UseSaveActionOptions<T> {
  /** Dữ liệu gốc (đã lưu). Đổi từ bên ngoài thì thay baseline nội bộ. */
  baseline: T;
  /** Giá trị đang nhập. */
  value: T;
  isEqual?: (a: T, b: T) => boolean;
  /** Trả `false` hoặc chuỗi lỗi khi chưa hợp lệ. Mặc định luôn hợp lệ. */
  validate?: (value: T) => boolean | string | null | undefined;
  /**
   * Lưu giá trị. Đồng bộ hay Promise đều được. Ném lỗi, reject hoặc trả `false`
   * nghĩa là thất bại: giữ dirty để thử lại.
   */
  save: (value: T) => unknown | Promise<unknown>;
}

export interface SaveAction {
  /** Khác baseline. */
  dirty: boolean;
  valid: boolean;
  /** Đúng từ lúc bấm đến hết lần lưu, kể cả khi `save` đồng bộ. */
  saving: boolean;
  /** `dirty && valid && !saving`: điều kiện bật nút lưu. */
  canSave: boolean;
  /** Lỗi của lần lưu gần nhất (null khi chưa lỗi hoặc đã lưu thành công). */
  error: unknown;
  /** Resolve `true` khi lưu xong; `false` khi bị chặn (đang lưu, chưa hợp lệ, không đổi) hoặc lỗi. */
  submit: () => Promise<boolean>;
  /** Đưa baseline về giá trị hiện tại (vd khi bỏ thay đổi). */
  reset: () => void;
}

export function useSaveAction<T>({
  baseline,
  value,
  isEqual = deepEqual,
  validate,
  save,
}: UseSaveActionOptions<T>): SaveAction {
  const [saved, setSaved] = useState<{ value: T } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const lock = useRef(false);

  // Baseline từ ngoài đổi (dữ liệu tải lại, đổi bản ghi) thì bỏ giá trị "vừa lưu".
  const lastBaseline = useRef(baseline);
  useEffect(() => {
    if (!isEqual(lastBaseline.current, baseline)) {
      lastBaseline.current = baseline;
      setSaved(null);
    }
  });

  const effective = saved ? saved.value : baseline;
  const dirty = !isEqual(effective, value);
  const validity = validate ? validate(value) : true;
  const valid = validity !== false && typeof validity !== "string";
  const canSave = dirty && valid && !saving;

  const latest = useRef({ value, dirty, valid, save });
  latest.current = { value, dirty, valid, save };

  const submit = useCallback(async () => {
    const current = latest.current;
    if (lock.current || !current.dirty || !current.valid) return false;
    lock.current = true;
    setSaving(true);
    setError(null);
    try {
      const result = await current.save(current.value);
      if (result === false) {
        setError(new Error("save_failed"));
        return false;
      }
      setSaved({ value: current.value });
      return true;
    } catch (cause) {
      setError(cause ?? new Error("save_failed"));
      return false;
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSaved({ value: latest.current.value });
    setError(null);
  }, []);

  return { dirty, valid, saving, canSave, error, submit, reset };
}
