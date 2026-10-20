import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAccess } from "../../data/repositories/access";
import {
  lectureUsageCount,
  listLectures,
  type LectureFilter,
} from "../../data/repositories/lectures";
import { getMember } from "../../data/repositories/staff";
import { useStore } from "../../data/store";
import { formatDate } from "../../shared/format";
import {
  Button,
  Card,
  EmptyState,
  Fab,
  Input,
  LinkButton,
  NoAccess,
  PageHeader,
  Pill,
  Segmented,
} from "../../shared/ui";
import {
  matchesQuery,
  sectionCountLabel,
  usageLabel,
} from "./lectureFormat";
import s from "./library.module.css";

const filters: Array<{ value: LectureFilter; label: string }> = [
  { value: "mine", label: "Của tôi" },
  { value: "all", label: "Tất cả" },
  { value: "archived", label: "Đã lưu trữ" },
];

export default function LibraryPage() {
  useStore();
  const navigate = useNavigate();
  const { can } = useAccess();
  const [filter, setFilter] = useState<LectureFilter>("all");
  const [query, setQuery] = useState("");
  const canRead = can("lectures", "read");
  const canWrite = can("lectures", "write");
  if (!canRead) return <NoAccess what="bài giảng" />;

  const lectures = listLectures(filter);
  const searching = query.trim().length > 0;
  const visible = searching
    ? lectures.filter((lecture) => matchesQuery(lecture, query))
    : lectures;
  const mineCount =
    filter === "mine" ? lectures.length : listLectures("mine").length;
  const allCount =
    filter === "all" ? lectures.length : listLectures("all").length;

  const emptyTitle = searching
    ? "Không tìm thấy bài giảng"
    : filter === "mine"
      ? "Bạn chưa có bài giảng nào"
      : filter === "archived"
        ? "Chưa có bài giảng lưu trữ"
        : "Thư viện chưa có bài giảng";

  return (
    <main className={s.page}>
      <PageHeader compact backTo="/lop" title="Bài giảng" />

      <div className={s.toolbar}>
        <Input
          type="search"
          aria-label="Tìm bài giảng"
          placeholder="Tìm theo tên bài hoặc tên phần"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Segmented
          label="Lọc bài giảng"
          options={filters}
          value={filter}
          onChange={(value) => setFilter(value as LectureFilter)}
        />
        <p className={s.count} aria-live="polite">
          {searching
            ? `${visible.length} kết quả cho “${query.trim()}”`
            : `${visible.length} bài giảng`}
        </p>
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState title={emptyTitle}>
            <p className={s.emptyHint}>
              {searching
                ? "Thử từ khoá khác hoặc xoá ô tìm kiếm."
                : filter === "mine"
                  ? "Bài giảng bạn soạn sẽ nằm ở đây, kể cả khi chưa gắn vào buổi nào."
                  : filter === "archived"
                    ? "Bài giảng đã lưu trữ vẫn giữ liên kết với các buổi đã dùng."
                    : "Bài giảng là thư viện chung của workspace, dùng lại được cho nhiều lớp."}
            </p>
            <div className={s.emptyActions}>
              {searching && (
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setQuery("")}
                >
                  Xoá tìm kiếm
                </Button>
              )}
              {!searching &&
                filter === "mine" &&
                mineCount === 0 &&
                allCount > 0 && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setFilter("all")}
                >
                  Xem tất cả bài giảng
                </Button>
              )}
              {!searching && filter === "all" && allCount === 0 && mineCount > 0 && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setFilter("mine")}
                >
                  Xem bài giảng của tôi
                </Button>
              )}
              {!searching && filter !== "archived" && canWrite && (
                <LinkButton to="/bai-giang/moi">Tạo bài giảng</LinkButton>
              )}
            </div>
          </EmptyState>
        </Card>
      ) : (
        <div className={s.list}>
          {visible.map((lecture) => {
            const creator = getMember(lecture.createdBy);
            return (
              <Card key={lecture.id} className={s.lectureCard}>
                <Link
                  to={`/bai-giang/${lecture.id}`}
                  className={s.lectureLink}
                >
                  <span className={s.titleRow}>
                    <strong className={s.title}>{lecture.title}</strong>
                    {lecture.archived && <Pill tone="neutral">Đã lưu trữ</Pill>}
                  </span>
                  <span className={s.meta}>
                    {sectionCountLabel(lecture.sections.length)} ·{" "}
                    {usageLabel(lectureUsageCount(lecture.id))}
                  </span>
                  <span className={s.creator}>
                    {creator ? creator.name : "Không rõ người tạo"} tạo ·{" "}
                    {formatDate(lecture.createdAt)}
                  </span>
                </Link>
              </Card>
            );
          })}
        </div>
      )}

      {canWrite && filter !== "archived" && (
        <Fab
          label="Tạo bài giảng"
          onClick={() => navigate("/bai-giang/moi")}
        />
      )}
    </main>
  );
}
