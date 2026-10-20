import { useState } from "react";
import { Link } from "react-router-dom";
import { useAccess } from "../../data/repositories/access";
import {
  attachLecture,
  detachLecture,
  listLectures,
  listSessionLectures,
} from "../../data/repositories/lectures";
import { useStore } from "../../data/store";
import { Button, Input, LinkButton, Sheet } from "../../shared/ui";
import { matchesQuery } from "./lectureFormat";
import s from "./sessionLectures.module.css";

function BookIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function SessionLecturesPanel({
  sessionId,
  locked = false,
}: {
  sessionId: string;
  locked?: boolean;
}) {
  useStore();
  const { can } = useAccess();
  const attached = listSessionLectures(sessionId);
  const canWrite = can("lectures", "write") && !locked;
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");

  const available = listLectures("all");
  const searching = query.trim().length > 0;
  const visible = searching
    ? available.filter((lecture) => matchesQuery(lecture, query))
    : available;

  function openPicker() {
    setSelected(attached.map((lecture) => lecture.id));
    setQuery("");
    setError("");
    setPicking(true);
  }

  function toggle(lectureId: string) {
    setSelected((current) =>
      current.includes(lectureId)
        ? current.filter((id) => id !== lectureId)
        : [...current, lectureId],
    );
  }

  function apply() {
    const current = attached.map((lecture) => lecture.id);
    try {
      current
        .filter((id) => !selected.includes(id))
        .forEach((id) => detachLecture(sessionId, id));
      selected
        .filter((id) => !current.includes(id))
        .forEach((id) => attachLecture(sessionId, id));
      setError("");
      setPicking(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không cập nhật được bài giảng.",
      );
    }
  }

  function remove(lectureId: string) {
    try {
      detachLecture(sessionId, lectureId);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không gỡ được bài giảng.",
      );
    }
  }

  return (
    <section className={s.panel}>
      <div className={s.head}>
        <h2 className={s.title}>Bài giảng</h2>
        {canWrite && (
          <button type="button" className={s.attachButton} onClick={openPicker}>
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Gắn bài giảng
          </button>
        )}
      </div>

      {attached.length === 0 ? (
        <p className={s.empty}>
          Buổi này chưa có bài giảng. Bạn có thể gắn sau, không bắt buộc.
        </p>
      ) : (
        <ul className={s.list}>
          {attached.map((lecture) => (
            <li key={lecture.id} className={s.row}>
              <span className={s.rowIcon} aria-hidden="true">
                <BookIcon />
              </span>
              <Link to={`/bai-giang/${lecture.id}`} className={s.rowLink}>
                <span className={s.rowTitle}>{lecture.title}</span>
                <span className={s.rowMeta}>
                  {lecture.sections.length} phần
                </span>
              </Link>
              {canWrite && (
                <button
                  type="button"
                  className={s.remove}
                  aria-label={`Gỡ ${lecture.title} khỏi buổi`}
                  onClick={() => remove(lecture.id)}
                >
                  <TrashIcon />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {locked && (
        <p className={s.hint}>Buổi đã hủy: chỉ xem lại bài giảng đã gắn.</p>
      )}
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}

      <Sheet
        title="Chọn bài giảng"
        open={picking}
        onClose={() => setPicking(false)}
      >
        <div className={s.picker}>
          <Input
            type="search"
            aria-label="Tìm bài giảng"
            placeholder="Tìm trong thư viện"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          {visible.length === 0 ? (
            <p className={s.hint}>
              {available.length === 0
                ? "Thư viện chưa có bài giảng nào."
                : "Không tìm thấy bài giảng phù hợp."}
            </p>
          ) : (
            <ul className={s.pickerList}>
              {visible.map((lecture) => {
                const checked = selected.includes(lecture.id);
                return (
                  <li key={lecture.id}>
                    <label
                      className={s.pickerRow + (checked ? " " + s.pickerRowOn : "")}
                    >
                      <input
                        type="checkbox"
                        className={s.srOnly}
                        checked={checked}
                        onChange={() => toggle(lecture.id)}
                      />
                      <span
                        className={
                          s.checkbox + (checked ? " " + s.checkboxOn : "")
                        }
                        aria-hidden="true"
                      >
                        {checked && <CheckIcon />}
                      </span>
                      <span className={s.pickerBody}>
                        <span className={s.rowTitle}>{lecture.title}</span>
                        <span className={s.rowMeta}>
                          {lecture.sections.length} phần
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          {available.length === 0 && (
            <LinkButton
              to="/bai-giang/moi"
              variant="secondary"
              size="md"
              onClick={() => setPicking(false)}
            >
              Tạo bài giảng mới
            </LinkButton>
          )}

          {error && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}

          <Button
            size="lg"
            className={s.pickerSubmit}
            onClick={apply}
            disabled={selected.length === 0 && attached.length === 0}
          >
            {selected.length > 0
              ? `Gắn ${selected.length} bài giảng`
              : "Gỡ bài giảng đã chọn"}
          </Button>
        </div>
      </Sheet>
    </section>
  );
}
