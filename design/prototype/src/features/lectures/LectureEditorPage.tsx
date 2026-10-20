import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAccess } from "../../data/repositories/access";
import {
  createLecture,
  getLecture,
  updateLecture,
} from "../../data/repositories/lectures";
import { useStore } from "../../data/store";
import { useOnline } from "../../shared/hooks/useOnline";
import { SaveStatus, useSaveStatus } from "../../shared/SaveStatus";
import {
  Button,
  Card,
  EmptyState,
  Input,
  LinkButton,
  NoAccess,
  PageHeader,
} from "../../shared/ui";
import { formatFileSize } from "./lectureFormat";
import s from "./lectureEditor.module.css";

type FileDraft = { name: string; size: number; type: string };
type SectionDraft = {
  key: string;
  title: string;
  description: string;
  files: FileDraft[];
};

function emptySection(): SectionDraft {
  return {
    key: crypto.randomUUID(),
    title: "",
    description: "",
    files: [],
  };
}

export default function LectureEditorPage() {
  useStore();
  const { lectureId } = useParams();
  const navigate = useNavigate();
  const { can } = useAccess();
  const online = useOnline();
  const save = useSaveStatus();
  const existing = lectureId ? getLecture(lectureId) : undefined;
  const [title, setTitle] = useState(existing?.title ?? "");
  const [sections, setSections] = useState<SectionDraft[]>(() =>
    existing && existing.sections.length
      ? existing.sections.map((section) => ({
          key: section.id,
          title: section.title,
          description: section.description,
          files: section.files.map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
          })),
        }))
      : [emptySection()],
  );
  const [error, setError] = useState("");

  if (!can("lectures", "write")) return <NoAccess what="soạn bài giảng" />;
  if (lectureId && !existing)
    return (
      <EmptyState title="Không tìm thấy bài giảng">
        <LinkButton to="/bai-giang">Về thư viện bài giảng</LinkButton>
      </EmptyState>
    );

  const backTo = existing ? `/bai-giang/${existing.id}` : "/bai-giang";
  const hasFiles = sections.some((section) => section.files.length > 0);

  function updateSection(key: string, patch: Partial<SectionDraft>) {
    setSections((current) =>
      current.map((section) =>
        section.key === key ? { ...section, ...patch } : section,
      ),
    );
    save.markUnsaved();
    setError("");
  }

  function addFiles(key: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    const picked: FileDraft[] = Array.from(files).map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }));
    setSections((current) =>
      current.map((section) =>
        section.key === key
          ? { ...section, files: [...section.files, ...picked] }
          : section,
      ),
    );
    save.markUnsaved();
    setError("");
  }

  function removeFile(key: string, index: number) {
    setSections((current) =>
      current.map((section) =>
        section.key === key
          ? {
              ...section,
              files: section.files.filter((_, item) => item !== index),
            }
          : section,
      ),
    );
    save.markUnsaved();
    setError("");
  }

  function removeSection(key: string) {
    setSections((current) => current.filter((section) => section.key !== key));
    save.markUnsaved();
    setError("");
  }

  function moveSection(key: string, delta: number) {
    setSections((current) => {
      const index = current.findIndex((section) => section.key === key);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
    save.markUnsaved();
    setError("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Nhập tên bài giảng.");
      return;
    }
    if (sections.length === 0) {
      setError("Thêm ít nhất một phần cho bài giảng.");
      return;
    }
    if (sections.some((section) => !section.title.trim())) {
      setError("Mỗi phần cần có tên.");
      return;
    }
    const input = {
      title: title.trim(),
      sections: sections.map((section) => ({
        title: section.title.trim(),
        description: section.description.trim(),
        files: section.files,
      })),
    };
    try {
      const saved = existing
        ? updateLecture(existing.id, input)
        : createLecture(input);
      save.clearStatus();
      navigate(`/bai-giang/${saved.id}`, { replace: Boolean(existing) });
    } catch (cause) {
      save.setStatus("error");
      setError(
        cause instanceof Error ? cause.message : "Không lưu được bài giảng.",
      );
    }
  }

  return (
    <section className={s.page}>
      <PageHeader
        compact
        backTo={backTo}
        eyebrow="Bài giảng"
        title={existing ? "Sửa bài giảng" : "Bài giảng mới"}
      />

      <form className={s.form} onSubmit={submit} noValidate>
        <Input
          label="Tên bài giảng"
          value={title}
          placeholder="Ví dụ: Unit 3: Present Perfect"
          onChange={(event) => {
            setTitle(event.target.value);
            save.markUnsaved();
            setError("");
          }}
          required
        />

        {!online && (
          <p role="status" className={s.warning}>
            {existing
              ? "Đang không có mạng. Sửa bài giảng đã có cần mạng để tránh xung đột khi nhiều người cùng sửa. Bạn xem lại nội dung được, thay đổi sẽ lưu khi có mạng."
              : "Đang không có mạng. Phần chữ vẫn lưu được; tệp đính kèm cần mạng nên chưa thêm được."}
          </p>
        )}
        {online && hasFiles && (
          <p className={s.info}>
            Tệp chỉ lưu tên, dung lượng và loại trong bản thử này.
          </p>
        )}

        <div className={s.sections}>
          {sections.map((section, index) => (
            <Card key={section.key} className={s.section}>
              <div className={s.sectionHead}>
                <h2 className={s.sectionTitle}>Phần {index + 1}</h2>
                <div className={s.sectionTools}>
                  <Button
                    variant="neutral"
                    className={s.arrow}
                    aria-label={`Đưa phần ${index + 1} lên`}
                    title="Đưa phần lên"
                    disabled={index === 0}
                    onClick={() => moveSection(section.key, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="neutral"
                    className={s.arrow}
                    aria-label={`Đưa phần ${index + 1} xuống`}
                    title="Đưa phần xuống"
                    disabled={index === sections.length - 1}
                    onClick={() => moveSection(section.key, 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={`Xoá phần ${index + 1}`}
                    onClick={() => removeSection(section.key)}
                  >
                    Xoá
                  </Button>
                </div>
              </div>

              <Input
                label="Tên phần"
                value={section.title}
                placeholder="Ví dụ: Warm-up"
                onChange={(event) =>
                  updateSection(section.key, { title: event.target.value })
                }
              />

              <div className={s.field}>
                <label
                  className={s.label}
                  htmlFor={`lecture-section-description-${section.key}`}
                >
                  Mô tả
                </label>
                <textarea
                  id={`lecture-section-description-${section.key}`}
                  className={s.textarea}
                  value={section.description}
                  placeholder="Hoạt động trên lớp, nội dung chính, bài tập về nhà…"
                  onChange={(event) =>
                    updateSection(section.key, {
                      description: event.target.value,
                    })
                  }
                />
              </div>

              <div className={s.files}>
                <span className={s.label}>Tệp đính kèm</span>
                {section.files.length > 0 && (
                  <ul className={s.fileList}>
                    {section.files.map((file, fileIndex) => (
                      <li
                        key={`${section.key}-${fileIndex}-${file.name}`}
                        className={s.fileRow}
                      >
                        <span className={s.fileName}>{file.name}</span>
                        <span className={s.fileMeta}>
                          {formatFileSize(file.size)}
                        </span>
                        <button
                          type="button"
                          className={s.fileRemove}
                          aria-label={`Gỡ tệp ${file.name}`}
                          onClick={() => removeFile(section.key, fileIndex)}
                        >
                          Gỡ
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <label
                  className={s.attach + (online ? "" : " " + s.attachOff)}
                >
                  Đính kèm tệp
                  <input
                    type="file"
                    multiple
                    className={s.fileInput}
                    disabled={!online}
                    onChange={(event) => {
                      addFiles(section.key, event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>
                {!online && (
                  <p className={s.helper}>
                    {existing
                      ? "Cần mạng để đính kèm tệp và để lưu thay đổi."
                      : "Cần mạng để đính kèm tệp. Phần chữ vẫn lưu được."}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>

        <Button variant="secondary" size="md" onClick={() => setSections((current) => [...current, emptySection()])}>
          + Thêm phần
        </Button>

        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
        <SaveStatus status={save.status} />

        <div className={s.actions}>
          <Button
            type="submit"
            size="lg"
            disabled={!online && Boolean(existing)}
          >
            {existing ? "Lưu thay đổi" : "Tạo bài giảng"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => navigate(backTo)}
          >
            Huỷ
          </Button>
        </div>
      </form>
    </section>
  );
}
