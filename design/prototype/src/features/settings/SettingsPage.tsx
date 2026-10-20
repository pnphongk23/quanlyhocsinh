import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuthSession, logout } from "../../data/repositories/auth";
import { useAccess } from "../../data/repositories/access";
import { roleDisplayKind } from "../../data/repositories/staff";
import { resetSeed } from "../../data/repositories/maintenance";
import { usePendingCount } from "../../data/outbox";
import { features } from "../../shared/features";
import { Button, Card, Icon, Modal, PageHeader } from "../../shared/ui";
import s from "./settings.module.css";

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("vi-VN");
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const pending = usePendingCount();
  const { member, role, isAdmin, can, multipleRoles } = useAccess();
  const session = getAuthSession();
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);

  const name = member?.name ?? session?.email ?? "Chưa đăng nhập";
  const activeMemberId = member?.id ?? null;

  const items: Array<{ to: string; label: string; hint: string }> = [];
  if (multipleRoles)
    items.push({
      to: "/chon-vai-tro",
      label: "Đổi vai trò",
      hint: "Chọn vai trò khác đang có của bạn",
    });
  if (can("lectures", "read"))
    items.push({
      to: "/bai-giang",
      label: "Bài giảng",
      hint: "Thư viện bài giảng của workspace",
    });
  if (isAdmin) {
    items.push({
      to: "/nhan-su",
      label: "Nhân sự",
      hint: "Mời người, gán lớp, vô hiệu hoá tài khoản",
    });
    items.push({
      to: "/vai-tro",
      label: "Vai trò",
      hint: "Tạo và sửa quyền theo nhóm tính năng",
    });
    items.push({
      to: "/phan-cong",
      label: "Phân công giảng dạy",
      hint: "Gán giáo viên chính và trợ giảng cho từng lớp",
    });
    items.push({
      to: "/lich-day",
      label: "Lịch dạy",
      hint: "Xem lịch dạy theo tuần của từng người",
    });
    // Cờ Lương tắt: không còn thẻ dẫn tới bảng lương.
    if (features.payroll)
      items.push({
        to: "/luong",
        label: "Lương",
        hint: "Bảng lương theo tháng, đơn giá và điều chỉnh",
      });
    items.push({
      to: "/hoc-phi",
      label: "Học phí",
      hint: "Phiếu học phí, ghi nhận thu và công nợ",
    });
  } else if (role?.kind === "staff") {
    items.push({
      to: "/lich-day",
      label: "Lịch dạy của tôi",
      hint: "Xem các buổi bạn dạy trong tuần",
    });
    if (activeMemberId && features.payroll)
      items.push({
        to: `/luong/${activeMemberId}`,
        label: "Lương của tôi",
        hint: "Xem bảng lương của bạn (chỉ đọc)",
      });
  }

  function signOut() {
    try {
      logout();
      navigate("/dang-nhap", { replace: true });
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  function restoreSampleData() {
    try {
      resetSeed();
      navigate("/dang-nhap", { replace: true });
    } catch {
      setError("Không thể đặt lại dữ liệu mẫu. Dữ liệu trên máy vẫn được giữ.");
      setConfirm(false);
    }
  }

  return (
    <main className={s.page}>
      <PageHeader eyebrow={name} title="Cài đặt" />

      <Card className={s.profile} aria-label="Tài khoản đang dùng">
        <div className={s.avatar} aria-hidden="true">
          {initialsOf(name) || "GV"}
        </div>
        <div className={s.profileDetails}>
          <strong>{name}</strong>
          <p>{session?.email ?? "Chưa đăng nhập"}</p>
          {role && (
            <p className={s.currentRole}>
              <span className={s.roleLabel}>Vai trò đang dùng</span>
              <span>
                {role.name} · {roleDisplayKind(role.kind)}
              </span>
            </p>
          )}
        </div>
      </Card>

      {items.length > 0 && (
        <Card className={s.menu} aria-label="Quản lý">
          {items.map((item) => (
            <Link key={item.to} to={item.to} className={s.menuLink}>
              <span className={s.menuText}>
                <span className={s.menuLabel}>{item.label}</span>
                <span className={s.menuHint}>{item.hint}</span>
              </span>
              <span className={s.menuChevron} aria-hidden="true">
                <Icon name="chevron-right" />
              </span>
            </Link>
          ))}
        </Card>
      )}

      <Card className={s.account}>
        <h2>Tài khoản</h2>
        <p className={s.muted}>
          Đăng xuất chỉ khả dụng khi không còn thay đổi chờ đồng bộ.
        </p>
        {pending > 0 && (
          <div id="logout-reason" className={s.reason} role="status">
            Chưa thể đăng xuất: còn {pending} thay đổi chưa đồng bộ. Giữ trang mở và
            kết nối mạng để hoàn tất đồng bộ.
          </div>
        )}
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        <Button
          variant="danger"
          size="lg"
          disabled={pending > 0}
          aria-describedby={pending > 0 ? "logout-reason" : undefined}
          onClick={signOut}
        >
          Đăng xuất
        </Button>
      </Card>

      <Card className={s.sampleData}>
        <h2>Dữ liệu mẫu</h2>
        <p className={s.muted}>
          Khôi phục dữ liệu ban đầu trên thiết bị này. Thao tác này sẽ xoá các thay đổi
          thử nghiệm.
        </p>
        <Button variant="secondary" onClick={() => setConfirm(true)}>
          Đặt lại dữ liệu mẫu
        </Button>
      </Card>

      <Modal
        title="Đặt lại dữ liệu mẫu?"
        open={confirm}
        onClose={() => setConfirm(false)}
      >
        <div className={s.confirmation}>
          <p>
            Mọi thay đổi thử nghiệm trên máy này sẽ được thay bằng dữ liệu mẫu. Bạn sẽ
            cần đăng nhập lại.
          </p>
          <Button variant="danger" onClick={restoreSampleData}>
            Đặt lại dữ liệu
          </Button>
        </div>
      </Modal>
    </main>
  );
}
