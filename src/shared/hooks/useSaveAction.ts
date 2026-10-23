import { useCallback, useEffect, useRef, useState } from "react";

/** Trùng token `--dur-loading-min`: `saving` hiện tối thiểu từng này ms dù ghi cục bộ xong ngay. */
export const SAVE_MIN_VISIBLE_MS = 400;
/** Trùng token `--dur-success-hold`: `justSaved` giữ từng này ms sau khi lưu thành công. */
export const SAVE_SUCCESS_HOLD_MS = 1600;

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
  /** Đúng `SAVE_SUCCESS_HOLD_MS` ms sau một lần lưu thành công (nút hiện "Đã lưu"). */
  justSaved: boolean;
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
  const [justSaved, setJustSaved] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(holdTimer.current);
    };
  }, []);

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

  const isEqualRef = useRef(isEqual);
  isEqualRef.current = isEqual;
  const latest = useRef({ value, dirty, valid, save });
  latest.current = { value, dirty, valid, save };

  const submit = useCallback(async () => {
    const current = latest.current;
    if (lock.current || !current.dirty || !current.valid) return false;
    lock.current = true;
    clearTimeout(holdTimer.current);
    setJustSaved(false);
    setSaving(true);
    setError(null);
    const startedAt = Date.now();
    const baselineAtStart = lastBaseline.current;
    let ok = false;
    let failure: unknown = null;
    try {
      const result = await current.save(current.value);
      if (result === false) failure = new Error("save_failed");
      else ok = true;
    } catch (cause) {
      failure = cause ?? new Error("save_failed");
    }
    // Ghi đã xong; chỉ giữ trạng thái đang lưu đủ lâu để người dùng thấy.
    const remaining = SAVE_MIN_VISIBLE_MS - (Date.now() - startedAt);
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    lock.current = false;
    if (mounted.current) {
      setSaving(false);
      if (ok) {
        // Ghi xong mà baseline đã đổi theo (store cập nhật trong lúc giữ loading) thì baseline mới
        // là sự thật; đè bằng giá trị đã gõ ("9.5" so với "9,5") sẽ khiến nút lưu bật lại.
        if (isEqualRef.current(baselineAtStart, lastBaseline.current)) setSaved({ value: current.value });
        setJustSaved(true);
        holdTimer.current = setTimeout(() => setJustSaved(false), SAVE_SUCCESS_HOLD_MS);
      } else {
        setError(failure);
      }
    }
    return ok;
  }, []);

  const reset = useCallback(() => {
    setSaved({ value: latest.current.value });
    setError(null);
  }, []);

  return { dirty, valid, saving, justSaved, canSave, error, submit, reset };
}
