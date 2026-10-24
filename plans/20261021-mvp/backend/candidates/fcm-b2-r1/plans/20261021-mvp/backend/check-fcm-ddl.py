#!/usr/bin/env python3
"""Kiem tra DDL cua goi FCM B2 (data-model.md) tren SQLite trong bo nho.

Chi dung thu vien chuan Python. Du lieu gia, khong in SDT/token/khoa/noi dung nhan xet.
Pham vi: DDL + rang buoc khai bao trong markdown. KHONG kiem trigger (chi mo ta bang
bang trong tai lieu), KHONG kiem hanh vi D1/Worker/FCM that, KHONG do CPU.

Chay:  python3 plans/20261021-mvp/backend/check-fcm-ddl.py [--data-model PATH]
       python3 plans/20261021-mvp/backend/check-fcm-ddl.py --links [--root DIR]
Thoat: 0 = tat ca check dat, 1 = co check hong hoac nap schema loi.
"""

import argparse
import hashlib
import re
import sqlite3
import sys
import traceback
from pathlib import Path

DEFAULT_DATA_MODEL = Path("plans/20261021-mvp/backend/data-model.md")

# File thuoc packet duoc kiem link noi bo (bo qua review/report cu khong phai nguon contract).
LINK_FILES = [
    "docs/spec.md",
    "docs/architecture.md",
    "plans/20261021-mvp/backend/data-model.md",
    "plans/20261021-mvp/backend/api-spec.md",
    "plans/20261021-mvp/backend/authz-matrix.md",
    "plans/20261021-mvp/backend/offline-plan.md",
    "plans/20261021-mvp/backend/stack-and-cpu.md",
    "plans/20261021-mvp/backend/report-b1.md",
    "plans/20261021-mvp/backend/firebase-setup-checklist.md",
    "plans/20261021-mvp/backend/resume-verification.md",
]

REQUIRED_TABLES = {
    "workspaces", "users", "roles", "role_permissions", "memberships",
    "auth_sessions", "auth_throttle", "classes", "students", "guardian_student",
    "class_sessions", "attendance", "attendance_history", "tests", "scores",
    "score_history", "session_comments", "homework_sections", "homework_grades",
    "reports", "report_publications", "notifications", "device_tokens",
    "push_deliveries", "fcm_oauth_cache", "applied_commands", "sync_conflicts",
    "change_log", "member_classes",
}

# Gia tri gia: SDT thuoc dai +8490000000x (khong phai SDT that), token/khoa chi la chuoi gia.
WS = "ws_fake0001"
WS2 = "ws_fake0002"
U_TEACHER = "usr_fake_teacher"
U_PARENT = "usr_fake_parent"
U_OTHER = "usr_fake_other"
ROLE_ADMIN = "role_fake_admin"
ROLE_GUARDIAN = "role_fake_guardian"
MEM_TEACHER = "mem_fake_teacher"
MEM_PARENT = "mem_fake_parent"
SESS = "auth_fake_session"
SESS_PARENT = "auth_fake_session_parent"
CLS = "cls_fake0001"
STU = "stu_fake0001"
CS = "cses_fake0001"
TEST = "tst_fake0001"
NOW = "2026-10-21T03:15:00.000Z"
PHONE_TEACHER = "+84900000001"
PHONE_PARENT = "+84900000002"
PHONE_OTHER = "+84900000003"


class Checks:
    def __init__(self, con):
        self.con = con
        self.passed = 0
        self.failed = []

    def ok(self, name, condition, detail=""):
        if condition:
            self.passed += 1
            print(f"PASS  {name}")
        else:
            self.failed.append((name, detail))
            print(f"FAIL  {name}  {detail}")

    def rejects(self, name, sql_fn, params=()):
        """Ky vong cau lenh bi SQLite tu choi (rang buoc/FK/CHECK/UNIQUE)."""
        try:
            with self.con:
                self.con.execute(sql_fn, params)
        except sqlite3.Error as exc:
            self.passed += 1
            print(f"PASS  {name}  ({type(exc).__name__}: {exc})")
            return
        self.failed.append((name, "cau lenh duoc chap nhan, dang le phai bi tu choi"))
        print(f"FAIL  {name}  cau lenh duoc chap nhan, dang le phai bi tu choi")

    def accepts(self, name, sql_fn, params=()):
        try:
            with self.con:
                if callable(sql_fn):
                    sql_fn()
                else:
                    self.con.execute(sql_fn, params)
            self.passed += 1
            print(f"PASS  {name}")
            return True
        except sqlite3.Error as exc:
            self.failed.append((name, f"{type(exc).__name__}: {exc}"))
            print(f"FAIL  {name}  {type(exc).__name__}: {exc}")
            return False

    def one(self, sql, params=()):
        return self.con.execute(sql, params).fetchone()


def extract_sql_blocks(path):
    text = Path(path).read_text(encoding="utf-8")
    blocks = re.findall(r"```sql\n(.*?)```", text, re.S)
    return blocks


def load_schema(con, blocks):
    con.execute("PRAGMA foreign_keys=ON")
    for index, block in enumerate(blocks, start=1):
        try:
            con.executescript(block)
        except sqlite3.Error:
            print(f"FAIL  nap_schema  block {index} loi:")
            traceback.print_exc()
            return False
    return True


def seed(con):
    """Du lieu gia toi thieu de cac FK cua phan FCM giai duoc."""
    cur = con.cursor()
    cur.execute("INSERT INTO workspaces (id, name, created_at) VALUES (?,?,?)", (WS, "WS gia", NOW))
    cur.execute("INSERT INTO workspaces (id, name, created_at) VALUES (?,?,?)", (WS2, "WS gia 2", NOW))
    cur.execute(
        "INSERT INTO users (id, phone, password_hash, created_at) VALUES (?,?,?,?)",
        (U_TEACHER, PHONE_TEACHER, "pbkdf2-sha256$1000$fake$fake", NOW),
    )
    cur.execute(
        "INSERT INTO users (id, phone, password_hash, created_at) VALUES (?,?,?,?)",
        (U_PARENT, PHONE_PARENT, "pbkdf2-sha256$1000$fake$fake", NOW),
    )
    cur.execute(
        "INSERT INTO users (id, phone, password_hash, created_at) VALUES (?,?,?,?)",
        (U_OTHER, PHONE_OTHER, "pbkdf2-sha256$1000$fake$fake", NOW),
    )
    cur.execute(
        "INSERT INTO roles (id, workspace_id, name, scope_kind, is_system, system_key, created_at)"
        " VALUES (?,?,?,?,?,?,?)",
        (ROLE_ADMIN, WS, "Admin", "workspace", 1, "admin", NOW),
    )
    cur.execute(
        "INSERT INTO roles (id, workspace_id, name, scope_kind, is_system, system_key, created_at)"
        " VALUES (?,?,?,?,?,?,?)",
        (ROLE_GUARDIAN, WS, "Phu huynh", "linked_students", 0, "guardian", NOW),
    )
    cur.execute(
        "INSERT INTO memberships (id, workspace_id, user_id, role_id, created_at) VALUES (?,?,?,?,?)",
        (MEM_TEACHER, WS, U_TEACHER, ROLE_ADMIN, NOW),
    )
    cur.execute(
        "INSERT INTO memberships (id, workspace_id, user_id, role_id, created_at) VALUES (?,?,?,?,?)",
        (MEM_PARENT, WS, U_PARENT, ROLE_GUARDIAN, NOW),
    )
    cur.execute(
        "INSERT INTO auth_sessions (id, user_id, membership_id, token_hash, created_at, last_seen_at, expires_at)"
        " VALUES (?,?,?,?,?,?,?)",
        (SESS, U_TEACHER, MEM_TEACHER, "hash_fake_teacher", NOW, NOW, NOW),
    )
    cur.execute(
        "INSERT INTO auth_sessions (id, user_id, membership_id, token_hash, created_at, last_seen_at, expires_at)"
        " VALUES (?,?,?,?,?,?,?)",
        (SESS_PARENT, U_PARENT, MEM_PARENT, "hash_fake_parent", NOW, NOW, NOW),
    )
    cur.execute(
        "INSERT INTO classes (id, workspace_id, name, weekdays, start_time, created_by, created_at, updated_at)"
        " VALUES (?,?,?,?,?,?,?,?)",
        (CLS, WS, "Lop gia", 2, "18:00", U_TEACHER, NOW, NOW),
    )
    cur.execute(
        "INSERT INTO students (id, workspace_id, class_id, name, enrolled_at, created_at, updated_at)"
        " VALUES (?,?,?,?,?,?,?)",
        (STU, WS, CLS, "Hoc sinh gia", "2026-10-01", NOW, NOW),
    )
    cur.execute(
        "INSERT INTO class_sessions (id, workspace_id, class_id, date, start_time, origin, created_at, updated_at)"
        " VALUES (?,?,?,?,?,?,?,?)",
        (CS, WS, CLS, "2026-10-21", "18:00", "recurring", NOW, NOW),
    )
    cur.execute(
        "INSERT INTO tests (id, workspace_id, class_id, name, date, created_by, created_at, updated_at)"
        " VALUES (?,?,?,?,?,?,?,?)",
        (TEST, WS, CLS, "Bai gia", "2026-10-21", U_TEACHER, NOW, NOW),
    )
    cur.execute(
        "INSERT INTO guardian_student (workspace_id, user_id, student_id, created_at) VALUES (?,?,?,?)",
        (WS, U_PARENT, STU, NOW),
    )
    con.commit()


def insert_notification(con, nid, kind, event_key, group_key=None, ready_at=NOW,
                        expanded=None, student=STU, session=None, test=None, mem=MEM_PARENT,
                        user=U_PARENT):
    con.execute(
        "INSERT INTO notifications (workspace_id, user_id, membership_id, kind, event_key,"
        " student_id, session_id, test_id, created_at, ready_at, group_key, deliveries_expanded_at)"
        " VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        (WS, user, mem, kind, event_key, student, session, test, NOW, ready_at, group_key, expanded),
    )


def insert_device(con, dev_id, token, platform="ios", mem=MEM_PARENT, user=U_PARENT,
                  session=SESS_PARENT, version=1):
    con.execute(
        "INSERT INTO device_tokens (id, workspace_id, user_id, membership_id, auth_session_id,"
        " token, platform, registration_version, created_at, updated_at)"
        " VALUES (?,?,?,?,?,?,?,?,?,?)",
        (dev_id, WS, user, mem, session, token, platform, version, NOW, NOW),
    )


def insert_delivery(con, notification_id, mem, dev_id, version=1):
    con.execute(
        "INSERT INTO push_deliveries (notification_id, membership_id, device_id,"
        " registration_version, next_attempt_at) VALUES (?,?,?,?,?)",
        (notification_id, mem, dev_id, version, NOW),
    )


def run_checks(con, checks):
    # --- schema ---
    tables = [r[0] for r in con.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
    missing = sorted(REQUIRED_TABLES - set(tables))
    checks.ok("schema_bang_du", not missing, f"thieu={missing}")
    checks.ok("schema_so_bang_29", len(tables) == 29, f"dem duoc {len(tables)}")
    triggers = con.execute(
        "SELECT count(*) FROM sqlite_master WHERE type='trigger'").fetchone()[0]
    checks.ok("schema_khong_co_trigger_trong_ddl", triggers == 0,
              f"trigger={triggers} (trigger chi mo ta bang bang trong tai lieu)")

    # --- FK user/membership ---
    checks.rejects(
        "fk_device_membership_thuoc_dung_user",
        "INSERT INTO device_tokens (id, workspace_id, user_id, membership_id, auth_session_id,"
        " token, platform, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
        ("dev_fake_bad_owner", WS, U_PARENT, MEM_TEACHER, SESS, "FAKE_TOKEN_BAD_OWNER", "ios", NOW, NOW),
    )
    checks.rejects(
        "fk_device_auth_session_ton_tai",
        "INSERT INTO device_tokens (id, workspace_id, user_id, membership_id, auth_session_id,"
        " token, platform, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
        ("dev_fake_bad_session", WS, U_PARENT, MEM_PARENT, "auth_fake_missing", "FAKE_TOKEN_BAD_SESSION", "ios", NOW, NOW),
    )
    checks.rejects(
        "fk_notification_membership_thuoc_dung_user",
        "INSERT INTO notifications (workspace_id, user_id, membership_id, kind, event_key,"
        " student_id, created_at, ready_at) VALUES (?,?,?,?,?,?,?,?)",
        (WS, U_PARENT, MEM_TEACHER, "slip_sent", "evt_bad_owner", STU, NOW, NOW),
    )
    checks.rejects(
        "fk_notification_hoc_sinh_ton_tai",
        "INSERT INTO notifications (workspace_id, user_id, membership_id, kind, event_key,"
        " student_id, created_at, ready_at) VALUES (?,?,?,?,?,?,?,?)",
        (WS, U_PARENT, MEM_PARENT, "slip_sent", "evt_missing_student", "stu_fake_missing", NOW, NOW),
    )

    # --- token UNIQUE / platform ---
    checks.accepts("device_dang_ky_lan_dau", lambda: insert_device(
        con, "dev_fake_1", "FAKE_FCM_REGISTRATION_TOKEN_1"))
    checks.ok("device_version_mac_dinh_1",
              checks.one("SELECT registration_version FROM device_tokens WHERE id='dev_fake_1'")[0] == 1)
    checks.rejects(
        "device_token_unique_toan_cuc",
        "INSERT INTO device_tokens (id, workspace_id, user_id, membership_id, auth_session_id,"
        " token, platform, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
        ("dev_fake_dupe", WS, U_TEACHER, MEM_TEACHER, SESS, "FAKE_FCM_REGISTRATION_TOKEN_1", "web", NOW, NOW),
    )
    checks.rejects(
        "device_platform_chi_ios_web",
        "INSERT INTO device_tokens (id, workspace_id, user_id, membership_id, auth_session_id,"
        " token, platform, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
        ("dev_fake_android", WS, U_PARENT, MEM_PARENT, SESS_PARENT, "FAKE_TOKEN_ANDROID", "android", NOW, NOW),
    )
    checks.rejects(
        "device_token_khong_rong",
        "INSERT INTO device_tokens (id, workspace_id, user_id, membership_id, auth_session_id,"
        " token, platform, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
        ("dev_fake_empty", WS, U_PARENT, MEM_PARENT, SESS_PARENT, "", "ios", NOW, NOW),
    )
    checks.accepts("device_thu_hai_cung_membership", lambda: insert_device(
        con, "dev_fake_2", "FAKE_FCM_REGISTRATION_TOKEN_2", platform="web"))

    # --- notifications kind / event idempotency ---
    for kind in ("slip_sent", "report_published", "homework_assigned", "score_updated"):
        checks.accepts(f"notification_kind_hop_le_{kind}", lambda k=kind: (
            con.execute(
                "INSERT INTO notifications (workspace_id, user_id, membership_id, kind, event_key,"
                " student_id, created_at, ready_at) VALUES (?,?,?,?,?,?,?,?)",
                (WS, U_PARENT, MEM_PARENT, k, f"evt_kind_{k}", STU, NOW, NOW)),
            con.execute("DELETE FROM notifications WHERE event_key=?", (f"evt_kind_{k}",)),
        ))
    checks.rejects(
        "notification_kind_la_bi_tu_choi",
        "INSERT INTO notifications (workspace_id, user_id, membership_id, kind, event_key,"
        " student_id, created_at, ready_at) VALUES (?,?,?,?,?,?,?,?)",
        (WS, U_PARENT, MEM_PARENT, "promo", "evt_bad_kind", STU, NOW, NOW),
    )
    checks.accepts("notification_tao_lan_dau", lambda: insert_notification(
        con, None, "slip_sent", "evt_slip_1", session=CS))
    checks.rejects(
        "notification_event_key_idempotent",
        "INSERT INTO notifications (workspace_id, user_id, membership_id, kind, event_key,"
        " student_id, created_at, ready_at) VALUES (?,?,?,?,?,?,?,?)",
        (WS, U_PARENT, MEM_PARENT, "slip_sent", "evt_slip_1", STU, NOW, NOW),
    )
    checks.accepts(
        "notification_event_key_doctheo_membership",
        "INSERT INTO notifications (workspace_id, user_id, membership_id, kind, event_key,"
        " student_id, created_at, ready_at) VALUES (?,?,?,?,?,?,?,?)",
        (WS, U_TEACHER, MEM_TEACHER, "slip_sent", "evt_slip_1", STU, NOW, NOW),
    )
    checks.accepts("don_notification_cua_giao_vien",
                   "DELETE FROM notifications WHERE membership_id=?", (MEM_TEACHER,))

    # --- gop diem: mot nhom mo, sau khi mo rong moi tao nhom moi ---
    group = f"{MEM_PARENT}:{STU}:{TEST}"
    checks.accepts("diem_nhom_mo_dau_tien", lambda: insert_notification(
        con, None, "score_updated", "evt_score_cmd_1", group_key=group, test=TEST))
    checks.rejects(
        "diem_nhom_thu_hai_khi_con_mo",
        "INSERT INTO notifications (workspace_id, user_id, membership_id, kind, event_key,"
        " student_id, test_id, created_at, ready_at, group_key) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (WS, U_PARENT, MEM_PARENT, "score_updated", "evt_score_cmd_2", STU, TEST, NOW, NOW, group),
    )
    checks.accepts(
        "diem_nhom_da_mo_rong_nhan_cap_nhat",
        "UPDATE notifications SET deliveries_expanded_at=? WHERE membership_id=? AND group_key=?",
        (NOW, MEM_PARENT, group),
    )
    checks.accepts("diem_nhom_moi_sau_mo_rong", lambda: insert_notification(
        con, None, "score_updated", "evt_score_cmd_3", group_key=group, test=TEST))
    checks.ok(
        "diem_dem_hai_nhom_da_mo_rong",
        checks.one(
            "SELECT count(*) FROM notifications WHERE membership_id=? AND group_key=?", (MEM_PARENT, group))[0] == 2,
    )
    checks.ok(
        "diem_moi_nhat_con_mo",
        checks.one(
            "SELECT deliveries_expanded_at IS NULL FROM notifications WHERE event_key='evt_score_cmd_3'")[0] == 1,
    )

    # --- deliveries theo tung thiet bi, FK membership ---
    notif_id = checks.one("SELECT id FROM notifications WHERE event_key='evt_slip_1'")[0]
    other_notif = checks.one("SELECT id FROM notifications WHERE event_key='evt_score_cmd_3'")[0]
    checks.accepts("delivery_cho_thiet_bi_1", lambda: insert_delivery(con, notif_id, MEM_PARENT, "dev_fake_1"))
    checks.accepts("delivery_cho_thiet_bi_2", lambda: insert_delivery(con, notif_id, MEM_PARENT, "dev_fake_2"))
    checks.ok(
        "delivery_mot_dong_moi_thiet_bi",
        checks.one("SELECT count(*) FROM push_deliveries WHERE notification_id=?", (notif_id,))[0] == 2,
    )
    checks.rejects(
        "delivery_primary_key_theo_thiet_bi",
        "INSERT INTO push_deliveries (notification_id, membership_id, device_id, registration_version,"
        " next_attempt_at) VALUES (?,?,?,?,?)",
        (notif_id, MEM_PARENT, "dev_fake_1", 1, NOW),
    )
    checks.rejects(
        "delivery_device_khong_thuoc_membership",
        "INSERT INTO push_deliveries (notification_id, membership_id, device_id, registration_version,"
        " next_attempt_at) VALUES (?,?,?,?,?)",
        (other_notif, MEM_TEACHER, "dev_fake_1", 1, NOW),
    )
    checks.rejects(
        "delivery_thiet_bi_khong_ton_tai",
        "INSERT INTO push_deliveries (notification_id, membership_id, device_id, registration_version,"
        " next_attempt_at) VALUES (?,?,?,?,?)",
        (notif_id, MEM_PARENT, "dev_fake_missing", 1, NOW),
    )
    checks.rejects(
        "delivery_status_chi_nam_trong_danh_sach",
        "UPDATE push_deliveries SET status='pushed' WHERE notification_id=? AND device_id='dev_fake_1'",
        (notif_id,),
    )
    checks.accepts(
        "delivery_lease_va_ket_qua",
        "UPDATE push_deliveries SET status='sending', lease_id='lease_fake_1', lease_until=?,"
        " attempts=attempts+1 WHERE notification_id=? AND device_id='dev_fake_1'",
        (NOW, notif_id),
    )

    # --- cascade xoa thiet bi / notification ---
    checks.accepts("xoa_thiet_bi_1", "DELETE FROM device_tokens WHERE id='dev_fake_1'")
    checks.ok(
        "xoa_thiet_bi_cascade_delivery_cua_no",
        checks.one("SELECT count(*) FROM push_deliveries WHERE device_id='dev_fake_1'")[0] == 0,
    )
    checks.ok(
        "xoa_thiet_bi_khong_dong_den_thiet_bi_khac",
        checks.one("SELECT count(*) FROM push_deliveries WHERE device_id='dev_fake_2'")[0] == 1,
    )
    insert_delivery(con, other_notif, MEM_PARENT, "dev_fake_2")
    checks.accepts("xoa_notification", "DELETE FROM notifications WHERE id=?", (other_notif,))
    checks.ok(
        "xoa_notification_cascade_delivery",
        checks.one("SELECT count(*) FROM push_deliveries WHERE notification_id=?", (other_notif,))[0] == 0,
    )

    # --- fcm_oauth_cache ---
    checks.accepts(
        "oauth_cache_tao_dong_rong",
        "INSERT OR IGNORE INTO fcm_oauth_cache (project_id, credential_key_id) VALUES (?,?)",
        ("proj_fake", "key_fake_1"),
    )
    checks.rejects(
        "oauth_cache_khoa_theo_project",
        "INSERT INTO fcm_oauth_cache (project_id, credential_key_id) VALUES (?,?)",
        ("proj_fake", "key_fake_2"),
    )
    checks.accepts(
        "oauth_cache_claim_lease",
        "UPDATE fcm_oauth_cache SET lease_id='lease_fake_oauth', lease_until=?"
        " WHERE project_id=? AND (lease_until IS NULL OR lease_until < ?)",
        (NOW, "proj_fake", NOW),
    )
    checks.accepts(
        "oauth_cache_ghi_token_sau_lease",
        "UPDATE fcm_oauth_cache SET access_token='FAKE_ACCESS_TOKEN', refresh_at=?, expires_at=?,"
        " lease_id=NULL, lease_until=NULL WHERE project_id=? AND lease_id='lease_fake_oauth'",
        (NOW, NOW, "proj_fake"),
    )
    checks.ok(
        "oauth_cache_token_khong_bat_buoc",
        checks.one("SELECT access_token IS NOT NULL FROM fcm_oauth_cache WHERE project_id='proj_fake'")[0] == 1,
    )

    # --- toan ven FK toan schema sau khi chay ---
    violations = con.execute("PRAGMA foreign_key_check").fetchall()
    checks.ok("foreign_key_check_rong", not violations, f"vi pham={len(violations)}")


def check_links(root):
    """Kiem link markdown noi bo va tham chieu dang `ten-file.md`."""
    root = Path(root).resolve()
    md_link = re.compile(r"\[[^\]]*\]\(([^)\s]+)")
    code_ref = re.compile(r"`([\w./-]+\.md)`")
    checked = 0
    broken = []

    def exists(base, target):
        return (base / target).resolve().exists() or (root / target).exists()

    for rel in LINK_FILES:
        path = root / rel
        if not path.exists():
            broken.append((rel, "<file khong ton tai>"))
            continue
        text = path.read_text(encoding="utf-8")
        for target in md_link.findall(text):
            target = target.split("#", 1)[0].strip()
            if not target or target.startswith(("http://", "https://", "mailto:")):
                continue
            checked += 1
            if not exists(path.parent, target):
                broken.append((rel, target))
        for target in code_ref.findall(text):
            checked += 1
            if not exists(path.parent, target):
                broken.append((rel, f"`{target}`"))

    print(f"link_files={len(LINK_FILES)}  tham_chieu_file={checked}  hong={len(broken)}")
    for rel, target in broken:
        print(f"FAIL  link  {rel} -> {target}")
    if broken:
        return 1
    print("PASS  link_noi_bo")
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-model", default=str(DEFAULT_DATA_MODEL))
    parser.add_argument("--links", action="store_true", help="chi kiem link markdown noi bo")
    parser.add_argument("--root", default=".")
    args = parser.parse_args()

    if args.links:
        return check_links(args.root)

    path = Path(args.data_model)
    if not path.exists():
        print(f"FAIL  khong_thay_data_model  {path}")
        return 1
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    blocks = extract_sql_blocks(path)
    print(f"data_model={path}  blocks={len(blocks)}  sha256={digest}")
    if not blocks:
        print("FAIL  khong_co_block_sql")
        return 1

    con = sqlite3.connect(":memory:")
    try:
        if not load_schema(con, blocks):
            return 1
        print(f"schema_loaded=ok  foreign_keys={con.execute('PRAGMA foreign_keys').fetchone()[0]}")
        try:
            seed(con)
        except sqlite3.Error:
            print("FAIL  seed  du lieu gia bi tu choi (schema va seed lech nhau):")
            traceback.print_exc()
            return 1
        checks = Checks(con)
        run_checks(con, checks)
    finally:
        con.close()

    total = checks.passed + len(checks.failed)
    print(f"\nket_qua: PASS {checks.passed}/{total}")
    if checks.failed:
        for name, detail in checks.failed:
            print(f"  - {name}: {detail}")
        return 1
    print("gioi_han: chi DDL khai bao trong markdown, SQLite :memory:; khong co trigger, "
          "khong co D1/Worker/FCM, khong do CPU")
    return 0


if __name__ == "__main__":
    sys.exit(main())
