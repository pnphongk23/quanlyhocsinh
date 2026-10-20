import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAccess } from "../../data/repositories/access";
import {
  archiveLecture,
  getLecture,
  lectureUsageCount,
  listLectureSessions,
  restoreLecture,
} from "../../data/repositories/lectures";
import { sessionPrefix } from "../../data/repositories/sessions";
import { getMember } from "../../data/repositories/staff";
import { useStore } from "../../data/store";
import { formatDate } from "../../shared/format";
import {
  Button,
  Card,
  EmptyState,
  Icon,
  LinkButton,
  Modal,
  NoAccess,
  PageHeader,
  Pill,
  Sheet,
} from "../../shared/ui";
import { formatFileSize } from "./lectureFormat";
import s from "./lectureDetail.module.css";

export default function LectureDetailPage() {
  useStore();
  const { lectureId = "" } = useParams();
  const navigate = useNavigate();
  const { can } = useAccess();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [error, setError] = useState("");
  const canRead = can("lectures", "read");
  const canWrite = can("lectures", "write");
  const lecture = canRead ? getLecture(lectureId) : undefined;

  if (!canRead) return <NoAccess what="bài giảng" />;
  if (!lecture)
    return (
      <EmptyState title="Không tìm thấy bài giảng">
        <LinkButton to="/bai-giang">Về thư viện bài giảng</LinkButton>
      </EmptyState>
    );

  const creator = getMember(lecture.createdBy);
  const usage = lectureUsageCount(lecture.id);
  const sessions = listLectureSessions(lecture.id);
  const hasFiles = lecture.sections.some((section) => section.files.length > 0);

  function archive() {
    if (!lecture) return;
    try {
      archiveLecture(lecture.id);
      setError("");
      setConfirmArchive(false);
      navigate("/bai-giang");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không lưu trữ được bài giảng.",
      );
    }
  }

  function restore() {
    if (!lecture) return;
    try {
      restoreLecture(lecture.id);
      setError("");
      setMenuOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không khôi phục được bài giảng.",
      );
    }
  }

  return (
    <section className={s.page}>
      <PageHeader
        compact
        backTo="/bai-giang"
        eyebrow={`${creator ? creator.name : "Không rõ người tạo"} · ${formatDate(lecture.createdAt)}`}
        title={lecture.title}
        overlay={lecture.archived ? <Pill tone="neutral">Đã lưu trữ</Pill> : undefined}
        actions={
          canWrite ? (
            <button
              type="button"
              className={s.moreButton}
              aria-label="Tuỳ chọn bài giảng"
              title="Tuỳ chọn bài giảng"
              onClick={() => {
                setMenuOpen(true);
                setError("");
              }}
            >
              <Icon name="more" />
            </button>
          ) : undefined
        }
      />

      {usage > 0 ? (
        <button
          type="button"
          className={s.usage}
          onClick={() => setSessionsOpen(true)}
        >
          <span className={s.usageText}>Đang dùng ở {usage} buổi</span>
          <Icon name="chevron-right" size={20} />
        </button>
      ) : (
        <p className={s.usageEmpty}>Chưa gắn vào buổi học nào.</p>
      )}

      {lecture.sections.length === 0 ? (
        <Card>
          <EmptyState title="Bài giảng chưa có phần nào" />
        </Card>
      ) : (
        <div className={s.sections}>
          {lecture.sections.map((section, index) => (
            <Card key={section.id} className={s.section}>
              <p className={s.sectionKicker}>Phần {index + 1}</p>
              <h2 className={s.sectionTitle}>{section.title}</h2>
              {section.description && (
                <p className={s.description}>{section.description}</p>
              )}
              {section.files.length > 0 && (
                <ul className={s.fileList}>
                  {section.files.map((file) => (
                    <li key={file.id} className={s.fileRow}>
                      <span className={s.fileName}>{file.name}</span>
                      <span className={s.fileMeta}>
                        {formatFileSize(file.size)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}

      {hasFiles && (
        <p className={s.note}>
          Tệp đính kèm cần mạng để tải về. Bản thử này chỉ lưu tên, dung lượng
          và loại tệp.
        </p>
      )}

      <Sheet
        title="Tuỳ chọn bài giảng"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      >
        <div className={s.sheetActions}>
          {!lecture.archived && (
            <LinkButton
              to={`/bai-giang/${lecture.id}/sua`}
              variant="secondary"
              size="md"
            >
              Sửa bài giảng
            </LinkButton>
          )}
          {lecture.archived ? (
            <Button variant="secondary" size="md" onClick={restore}>
              Khôi phục bài giảng
            </Button>
          ) : (
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setMenuOpen(false);
                setError("");
                setConfirmArchive(true);
              }}
            >
              Lưu trữ bài giảng
            </Button>
          )}
          {error && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}
        </div>
      </Sheet>

      <Modal
        title="Lưu trữ bài giảng?"
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
      >
        <div className={s.confirmation}>
          <p>
            Bài giảng sẽ ẩn khỏi thư viện nhưng không xoá dữ liệu.
            {usage > 0
              ? ` ${usage} buổi đang dùng vẫn giữ liên kết và xem được nội dung.`
              : " Bạn có thể khôi phục lại sau."}
          </p>
          {error && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}
          <Button variant="danger" size="md" onClick={archive}>
            Xác nhận lưu trữ
          </Button>
        </div>
      </Modal>

      <Sheet
        title="Buổi đang dùng bài giảng"
        open={sessionsOpen}
        onClose={() => setSessionsOpen(false)}
      >
        {sessions.length === 0 ? (
          <p className={s.note}>Chưa gắn vào buổi học nào.</p>
        ) : (
          <ul className={s.sessionList}>
            {sessions.map(({ session, className }) => (
              <li key={session.id}>
                <Link
                  className={s.sessionLink}
                  to={`/lop/${session.classId}/buoi-hoc/${session.id}`}
                  onClick={() => setSessionsOpen(false)}
                >
                  <span className={s.sessionClass}>{className}</span>
                  <span className={s.sessionMeta}>
                    {sessionPrefix(session)} · {formatDate(session.date)}
                    {session.status === "cancelled" ? " · Đã hủy" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </section>
  );
}
