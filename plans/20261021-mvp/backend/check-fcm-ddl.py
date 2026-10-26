#!/usr/bin/env python3
"""Kiem tra DDL cua goi FCM B2 (data-model.md) tren SQLite trong bo nho.

Chi dung thu vien chuan Python. Du lieu gia, khong in SDT/token/khoa/noi dung nhan xet.
Pham vi: DDL + rang buoc khai bao trong markdown, va mo phong SQL tuan tu cho vong doi
dang ky token (batch doi vai tro/dang xuat, sender khop danh tinh), fanout hai pha
(freeze + keyset paging co tran + quyen nhom/lien ket con trong projection), ranh gioi
atomic tung lenh, dieu kien dat lai mat khau, don dep change_log theo tuoi, va rang buoc
cung lop cua 4 quan he lien bang.
KHONG kiem trigger (chi mo ta bang bang trong tai lieu), KHONG kiem D1/Worker/FCM/cron
concurrent that, KHONG do CPU.

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
    "plans/20261021-mvp/backend/fcm-b2-fix-r1.md",
    "plans/20261021-mvp/backend/fcm-b2-fix-r2.md",
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
        (SESS, U_TEACHER, MEM_TEACHER, "hash_fake_teacher", NOW, NOW, EXPIRE_FUTURE),
    )
    cur.execute(
        "INSERT INTO auth_sessions (id, user_id, membership_id, token_hash, created_at, last_seen_at, expires_at)"
        " VALUES (?,?,?,?,?,?,?)",
        (SESS_PARENT, U_PARENT, MEM_PARENT, "hash_fake_parent", NOW, NOW, EXPIRE_FUTURE),
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
    cur.execute("INSERT INTO role_permissions (role_id, perm_group, level) VALUES (?,?,?)",
                (ROLE_ADMIN, "comments_reports", "write"))
    cur.execute("INSERT INTO role_permissions (role_id, perm_group, level) VALUES (?,?,?)",
                (ROLE_GUARDIAN, "comments_reports", "read"))
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
                  session=SESS_PARENT, version=1, bound_at=NOW, updated_at=NOW):
    con.execute(
        "INSERT INTO device_tokens (id, workspace_id, user_id, membership_id, auth_session_id,"
        " token, platform, registration_version, bound_at, created_at, updated_at)"
        " VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (dev_id, WS, user, mem, session, token, platform, version, bound_at, NOW, updated_at),
    )


def insert_delivery(con, notification_id, mem, dev_id, version=1):
    con.execute(
        "INSERT INTO push_deliveries (notification_id, membership_id, device_id,"
        " registration_version, next_attempt_at) VALUES (?,?,?,?,?)",
        (notification_id, mem, dev_id, version, NOW),
    )


EXPIRE_FUTURE = "2027-04-19T03:00:00.000Z"
ROLE_GUARDIAN_2 = "role_fake_guardian_2"
MEM_PARENT_OTHER = "mem_fake_parent_other"
SESS_PARENT_2 = "auth_fake_session_parent_2"
# C3-01: nhom quyen theo loai su kien, dung trong projection cua trang fanout.
KIND_PERM_GROUP = {
    "slip_sent": "comments_reports",
    "report_published": "comments_reports",
    "homework_assigned": "comments_reports",
    "score_updated": "scores",
}
FANOUT_PAGE_SQL = """
SELECT d.id, d.registration_version,
       CASE WHEN d.bound_at <= ? AND s.id IS NOT NULL AND s.revoked_at IS NULL
                 AND s.expires_at > ? AND s.user_id = d.user_id
                 AND s.membership_id = d.membership_id
                 AND u.status = 'active' AND m.status = 'active'
                 AND EXISTS (SELECT 1 FROM role_permissions rp
                             WHERE rp.role_id = m.role_id AND rp.perm_group = ?
                               AND rp.level IN ('read','write'))
                 AND EXISTS (SELECT 1 FROM guardian_student gs
                             WHERE gs.user_id = d.user_id AND gs.student_id = ?)
            THEN 1 ELSE 0 END AS eligible
FROM device_tokens d
LEFT JOIN auth_sessions s ON s.id = d.auth_session_id
LEFT JOIN users u ON u.id = d.user_id
LEFT JOIN memberships m ON m.id = d.membership_id
WHERE d.workspace_id = ? AND d.membership_id = ? AND d.id > ?
ORDER BY d.id
LIMIT ?
"""
CLAIM_INITIAL_SQL = """
UPDATE notifications
   SET expansion_started_at = ?, expansion_lease_id = ?, expansion_lease_until = ?
 WHERE id = ? AND deliveries_expanded_at IS NULL AND expansion_started_at IS NULL
   AND ready_at <= ? AND event_version = ?
"""
CLAIM_RECLAIM_SQL = """
UPDATE notifications SET expansion_lease_id = ?, expansion_lease_until = ?
 WHERE id = ? AND deliveries_expanded_at IS NULL AND expansion_started_at IS NOT NULL
   AND (expansion_lease_until IS NULL OR expansion_lease_until < ?) AND ready_at <= ?
"""
GUARDED_DELIVERY_SQL = """
INSERT INTO push_deliveries (notification_id, membership_id, device_id, registration_version,
                             next_attempt_at)
SELECT ?, ?, ?, ?, ?
 WHERE EXISTS (SELECT 1 FROM notifications WHERE id = ? AND expansion_lease_id = ?)
"""
GUARDED_CURSOR_SQL = "UPDATE notifications SET delivery_cursor = ? WHERE id = ? AND expansion_lease_id = ?"
GUARDED_COMPLETE_SQL = """
UPDATE notifications SET deliveries_expanded_at = ?, expansion_lease_id = NULL,
       expansion_lease_until = NULL
 WHERE id = ? AND expansion_lease_id = ? AND delivery_cursor = ?
"""
IDENTITY_OK_SQL = """
SELECT 1 FROM device_tokens d
JOIN auth_sessions s ON s.id = d.auth_session_id
JOIN users u ON u.id = d.user_id
JOIN memberships m ON m.id = d.membership_id
WHERE d.id = ? AND s.revoked_at IS NULL AND s.expires_at > ?
  AND u.status = 'active' AND m.status = 'active'
  AND s.user_id = d.user_id AND s.membership_id = d.membership_id
"""
SENDER_OK_SQL = """
SELECT 1
FROM push_deliveries pd
JOIN notifications n ON n.id = pd.notification_id AND n.membership_id = pd.membership_id
JOIN device_tokens d ON d.id = pd.device_id AND d.membership_id = pd.membership_id
JOIN auth_sessions s ON s.id = d.auth_session_id
JOIN users u ON u.id = d.user_id
JOIN memberships m ON m.id = d.membership_id
WHERE pd.notification_id = ? AND pd.device_id = ?
  AND pd.registration_version = d.registration_version
  AND u.status = 'active' AND m.status = 'active'
  AND s.revoked_at IS NULL AND s.expires_at > ?
  AND s.user_id = d.user_id AND s.membership_id = d.membership_id
  AND EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = m.role_id
              AND rp.perm_group = ? AND rp.level IN ('read','write'))
  AND EXISTS (SELECT 1 FROM guardian_student gs
              WHERE gs.user_id = u.id AND gs.student_id = n.student_id)
"""
INBOX_LIMIT = 5
REG_BUDGET = 20
LEASE_UNTIL_DEFAULT = "2026-10-21T03:16:00.000Z"
NOW_LATER = "2026-10-21T03:17:00.000Z"   # cron ke tiep, sau khi lease 60s het han


def add_guardian(con, tag):
    uid, mem, sess = f"usr_g{tag}", f"mem_g{tag}", f"sess_g{tag}"
    con.execute("INSERT INTO users (id, phone, password_hash, created_at) VALUES (?,?,?,?)",
                (uid, f"+8491000{tag:04d}", "pbkdf2-sha256$1000$fake$fake", NOW))
    con.execute("INSERT INTO memberships (id, workspace_id, user_id, role_id, created_at)"
                " VALUES (?,?,?,?,?)", (mem, WS, uid, ROLE_GUARDIAN, NOW))
    con.execute("INSERT INTO auth_sessions (id, user_id, membership_id, token_hash, created_at,"
                " last_seen_at, expires_at) VALUES (?,?,?,?,?,?,?)",
                (sess, uid, mem, f"hash_fake_{tag}", NOW, NOW, EXPIRE_FUTURE))
    con.execute("INSERT INTO guardian_student (workspace_id, user_id, student_id, created_at)"
                " VALUES (?,?,?,?)", (WS, uid, STU, NOW))
    return uid, mem, sess


def seed_devices(con, mem, user, prefix, count, bound_at=NOW, updated_at=NOW):
    ids = []
    for i in range(count):
        sess, dev = f"sess_{prefix}{i:02d}", f"dev_{prefix}{i:02d}"
        con.execute("INSERT INTO auth_sessions (id, user_id, membership_id, token_hash, created_at,"
                    " last_seen_at, expires_at) VALUES (?,?,?,?,?,?,?)",
                    (sess, user, mem, f"hash_{prefix}{i:02d}", NOW, NOW, EXPIRE_FUTURE))
        insert_device(con, dev, f"FAKE_TOKEN_{prefix}{i:02d}", mem=mem, user=user,
                      session=sess, bound_at=bound_at, updated_at=updated_at)
        ids.append(dev)
    return ids


def claim_inbox(con, nid, now, lease, version, lease_until=LEASE_UNTIL_DEFAULT):
    """Hai nhanh claim cua contract: 'initial' (CAS version+ready) hoac 'reclaim' (giu moc freeze)."""
    if con.execute(CLAIM_INITIAL_SQL, (now, lease, lease_until, nid, now, version)).rowcount == 1:
        return "initial"
    if con.execute(CLAIM_RECLAIM_SQL, (lease, lease_until, nid, now, now)).rowcount == 1:
        return "reclaim"
    return None


def fanout_page(con, mem, event_at, cursor, now, limit, student_id=STU,
                perm_group="comments_reports"):
    return con.execute(FANOUT_PAGE_SQL, (event_at, now, perm_group, student_id,
                                         WS, mem, cursor, limit)).fetchall()


def guarded_delivery(con, nid, mem, dev_id, version, now, lease):
    return con.execute(GUARDED_DELIVERY_SQL, (nid, mem, dev_id, version, now, nid, lease)).rowcount


def guarded_cursor(con, nid, cursor, lease):
    return con.execute(GUARDED_CURSOR_SQL, (cursor, nid, lease)).rowcount


def guarded_complete(con, nid, cursor, now, lease):
    return con.execute(GUARDED_COMPLETE_SQL, (now, nid, lease, cursor)).rowcount


def fanout_invocation(con, now, lease="lease_fake_job_1"):
    """Mo phong cron: claim <=5 inbox, phan trang truoc roi moi loc, tran 20 dang ky ke ca bi skip."""
    cands = con.execute(
        "SELECT id, membership_id, created_at, event_version, kind, student_id FROM notifications"
        " WHERE ready_at <= ? AND deliveries_expanded_at IS NULL"
        " ORDER BY ready_at, id LIMIT ?", (now, INBOX_LIMIT)).fetchall()
    considered, touched = 0, []
    for nid, mem, created_at, version, kind, student_id in cands:
        if considered >= REG_BUDGET:
            break
        if not claim_inbox(con, nid, now, lease, version):
            continue
        if con.execute("SELECT 1 FROM notifications WHERE id=? AND expansion_lease_id=?",
                       (nid, lease)).fetchone() is None:
            continue
        cursor = con.execute("SELECT delivery_cursor FROM notifications WHERE id=?",
                             (nid,)).fetchone()[0] or ""
        limit = min(REG_BUDGET - considered, REG_BUDGET)
        page = fanout_page(con, mem, created_at, cursor, now, limit, student_id,
                           KIND_PERM_GROUP.get(kind, "comments_reports"))
        considered += len(page)          # moi dong lay duoc, ke ca dong bi skip
        new_cursor = page[-1][0] if page else cursor
        with con:
            for dev_id, dev_version, eligible in page:
                if eligible:
                    guarded_delivery(con, nid, mem, dev_id, dev_version, now, lease)
            guarded_cursor(con, nid, new_cursor, lease)
            if len(page) < limit:
                guarded_complete(con, nid, new_cursor, now, lease)
        touched.append(nid)
    con.commit()
    return considered, touched


def run_lifecycle_checks(con, checks):
    """Vong doi dang ky token: cot/state moi + batch doi vai tro/dang xuat + sender khop danh tinh."""
    con.execute("DELETE FROM notifications")
    con.execute("DELETE FROM device_tokens")
    con.commit()

    ncols = [r[1] for r in con.execute("PRAGMA table_info(notifications)")]
    checks.ok("notif_co_cot_fanout",
              {"expansion_started_at", "delivery_cursor", "expansion_lease_id",
               "expansion_lease_until"} <= set(ncols), f"cot={ncols}")
    dcols = [r[1] for r in con.execute("PRAGMA table_info(device_tokens)")]
    checks.ok("device_co_cot_bound_at", "bound_at" in dcols, f"cot={dcols}")
    cols = [r[2] for r in con.execute("PRAGMA index_info('device_tokens_member')")]
    checks.ok("chi_muc_fanout_membership_id", cols == ["membership_id", "id"], f"cot={cols}")

    con.execute("INSERT INTO roles (id, workspace_id, name, scope_kind, is_system, created_at)"
                " VALUES (?,?,?,?,?,?)",
                (ROLE_GUARDIAN_2, WS, "Phu huynh 2", "linked_students", 0, NOW))
    con.execute("INSERT INTO memberships (id, workspace_id, user_id, role_id, created_at)"
                " VALUES (?,?,?,?,?)", (MEM_PARENT_OTHER, WS, U_PARENT, ROLE_GUARDIAN_2, NOW))
    con.execute("INSERT INTO auth_sessions (id, user_id, membership_id, token_hash, created_at,"
                " last_seen_at, expires_at) VALUES (?,?,?,?,?,?,?)",
                (SESS_PARENT_2, U_PARENT, MEM_PARENT, "hash_fake_parent_2", NOW, NOW, EXPIRE_FUTURE))
    insert_device(con, "dev_switch", "FAKE_TOKEN_SWITCH", session=SESS_PARENT_2)
    insert_device(con, "dev_keep", "FAKE_TOKEN_KEEP", session=SESS_PARENT)
    insert_notification(con, None, "slip_sent", "evt_life", session=CS)
    nid = checks.one("SELECT id FROM notifications WHERE event_key='evt_life'")[0]
    insert_delivery(con, nid, MEM_PARENT, "dev_switch")
    con.commit()

    # lam moi cung binding: chi doi updated_at, schema khong tu bump version/bound_at
    before = checks.one("SELECT registration_version, bound_at FROM device_tokens WHERE id='dev_keep'")
    con.execute("UPDATE device_tokens SET updated_at=? WHERE id=? AND user_id=? AND membership_id=?"
                " AND auth_session_id=?", ("2026-10-21T05:00:00.000Z", "dev_keep", U_PARENT,
                                            MEM_PARENT, SESS_PARENT))
    con.commit()
    after = checks.one("SELECT registration_version, bound_at FROM device_tokens WHERE id='dev_keep'")
    checks.ok("refresh_cung_binding_khong_bump_version", before == after, f"truoc={before} sau={after}")

    # PUT /session/membership: batch doi membership + go token cua dung phien hien tai
    with con:
        con.execute("UPDATE auth_sessions SET membership_id=? WHERE id=?", (MEM_PARENT_OTHER, SESS_PARENT_2))
        con.execute("DELETE FROM device_tokens WHERE auth_session_id=?", (SESS_PARENT_2,))
    checks.ok("doi_vai_tro_go_token_dung_phien",
              checks.one("SELECT count(*) FROM device_tokens WHERE id='dev_switch'")[0] == 0)
    checks.ok("doi_vai_tro_go_delivery_cua_token_do",
              checks.one("SELECT count(*) FROM push_deliveries WHERE device_id='dev_switch'")[0] == 0)
    checks.ok("doi_vai_tro_khong_dung_phien_khac",
              checks.one("SELECT count(*) FROM device_tokens WHERE id='dev_keep'")[0] == 1)

    # sender: token phai khop user+membership hien hanh cua phien
    checks.ok("sender_chap_nhan_token_khop_phien",
              checks.one(IDENTITY_OK_SQL, ("dev_keep", NOW)) is not None)
    insert_device(con, "dev_mismatch_life", "FAKE_TOKEN_MISMATCH_LIFE", session=SESS)  # phien cua giao vien
    con.commit()
    checks.ok("sender_tu_choi_token_lech_danh_tinh",
              checks.one(IDENTITY_OK_SQL, ("dev_mismatch_life", NOW)) is None)

    # POST /auth/logout: thu hoi phien + go token cua phien do, phien khac con
    con.execute("INSERT INTO auth_sessions (id, user_id, membership_id, token_hash, created_at,"
                " last_seen_at, expires_at) VALUES ('auth_fake_session_parent_3', ?, ?, ?, ?, ?, ?)",
                (U_PARENT, MEM_PARENT, "hash_fake_parent_3", NOW, NOW, EXPIRE_FUTURE))
    insert_device(con, "dev_other_session", "FAKE_TOKEN_OTHER_SESSION",
                  session="auth_fake_session_parent_3")
    con.commit()
    with con:
        con.execute("UPDATE auth_sessions SET revoked_at=? WHERE id=?", (NOW, SESS_PARENT))
        con.execute("DELETE FROM device_tokens WHERE auth_session_id=?", (SESS_PARENT,))
    checks.ok("dang_xuat_go_token_cua_phien",
              checks.one("SELECT count(*) FROM device_tokens WHERE id='dev_keep'")[0] == 0)
    checks.ok("dang_xuat_khong_go_phien_khac",
              checks.one("SELECT count(*) FROM device_tokens WHERE id='dev_other_session'")[0] == 1)
    checks.ok("sender_tu_choi_phien_da_thu_hoi",
              checks.one(IDENTITY_OK_SQL, ("dev_other_session", NOW)) is not None
              and checks.one(IDENTITY_OK_SQL, ("dev_keep", NOW)) is None)


def run_fanout_checks(con, checks):
    """Mo phong SQL tuan tu: claim CAS, phan trang truoc loc sau, tran 20/5, lease guard."""
    con.execute("DELETE FROM notifications")
    con.execute("DELETE FROM device_tokens")
    con.commit()

    # A. 1 inbox / 25 dang ky du dieu kien: tran 20 moi invocation, cursor tiep tuc
    _, mem_a, _ = add_guardian(con, 1)
    seed_devices(con, mem_a, "usr_g1", "a", 25)
    insert_notification(con, None, "slip_sent", "evt_fan_a", session=CS, mem=mem_a, user="usr_g1")
    con.commit()
    nid_a = checks.one("SELECT id FROM notifications WHERE event_key='evt_fan_a'")[0]

    considered1, touched1 = fanout_invocation(con, NOW, "lease_fake_a1")
    got1 = checks.one("SELECT count(*) FROM push_deliveries WHERE notification_id=?", (nid_a,))[0]
    checks.ok("fanout_tran_20_dang_ky_moi_invocation", considered1 == 20 and got1 == 20,
              f"xet={considered1} delivery={got1}")
    checks.ok("fanout_chua_xong_thi_chua_danh_dau",
              checks.one("SELECT deliveries_expanded_at IS NULL AND expansion_started_at IS NOT NULL"
                         " FROM notifications WHERE id=?", (nid_a,))[0] == 1)
    considered2, _ = fanout_invocation(con, NOW_LATER, "lease_fake_a2")
    got2 = checks.one("SELECT count(*) FROM push_deliveries WHERE notification_id=?", (nid_a,))[0]
    checks.ok("fanout_invocation_sau_xet_not_dang_ky_con_lai", considered2 == 5 and got2 == 25,
              f"xet={considered2} delivery={got2}")
    checks.ok("fanout_du_25_thiet_bi_khong_trung_va_khong_sot",
              checks.one("SELECT count(DISTINCT device_id) FROM push_deliveries"
                         " WHERE notification_id=?", (nid_a,))[0] == 25)
    checks.ok("fanout_chi_danh_dau_xong_khi_xet_het",
              checks.one("SELECT deliveries_expanded_at IS NOT NULL"
                         " FROM notifications WHERE id=?", (nid_a,))[0] == 1)

    # B. C2-01: 25 dang ky, 20 dau KHONG du dieu kien -> van chiem ngan sach, cursor di qua,
    #    trang day nhung 0 delivery thi chua duoc danh dau xong.
    _, mem_b, _ = add_guardian(con, 2)
    seed_devices(con, mem_b, "usr_g2", "b", 25)
    for i in range(20):
        con.execute("UPDATE auth_sessions SET revoked_at=? WHERE id=?", (NOW, f"sess_b{i:02d}"))
    insert_notification(con, None, "slip_sent", "evt_fan_b", session=CS, mem=mem_b, user="usr_g2")
    con.commit()
    nid_b = checks.one("SELECT id FROM notifications WHERE event_key='evt_fan_b'")[0]

    considered_b1, _ = fanout_invocation(con, NOW, "lease_fake_b1")
    got_b1 = checks.one("SELECT count(*) FROM push_deliveries WHERE notification_id=?", (nid_b,))[0]
    cursor_b1 = checks.one("SELECT delivery_cursor, deliveries_expanded_at IS NULL"
                           " FROM notifications WHERE id=?", (nid_b,))
    checks.ok("fanout_skip_van_chiem_ngan_sach_20", considered_b1 == 20 and got_b1 == 0,
              f"xet={considered_b1} delivery={got_b1}")
    checks.ok("fanout_cursor_di_qua_dong_bi_skip", cursor_b1[0] == "dev_b19", f"cursor={cursor_b1[0]}")
    checks.ok("fanout_trang_day_toan_skip_khong_danh_dau_xong", cursor_b1[1] == 1)
    considered_b2, _ = fanout_invocation(con, NOW_LATER, "lease_fake_b2")
    delivered_b = [r[0] for r in con.execute(
        "SELECT device_id FROM push_deliveries WHERE notification_id=? ORDER BY device_id", (nid_b,))]
    checks.ok("fanout_luot_sau_xet_not_va_gui_dung_khong_sot",
              considered_b2 == 5 and delivered_b == [f"dev_b{i:02d}" for i in range(20, 25)],
              f"xet={considered_b2} delivery={delivered_b}")
    checks.ok("fanout_b_khong_danh_dau_xong_som",
              checks.one("SELECT deliveries_expanded_at IS NOT NULL FROM notifications WHERE id=?",
                         (nid_b,))[0] == 1)

    # C. R2-01: claim CAS theo event_version + ready_at<=now; score commit chen giua => 0 dong
    uid_f, mem_f, sess_f = add_guardian(con, 11)
    insert_device(con, "dev_f_only", "FAKE_TOKEN_F_ONLY", mem=mem_f, user=uid_f, session=sess_f)
    group_f = f"{mem_f}:{STU}:{TEST}"
    t_ready = "2026-10-21T03:20:00.000Z"
    t_defer = "2026-10-21T03:25:00.000Z"
    insert_notification(con, None, "score_updated", "evt_score_f", group_key=group_f, test=TEST,
                        mem=mem_f, user=uid_f, ready_at=t_ready)
    con.commit()
    nid_f = checks.one("SELECT id FROM notifications WHERE event_key='evt_score_f'")[0]
    version_f = checks.one("SELECT event_version FROM notifications WHERE id=?", (nid_f,))[0]
    with con:
        con.execute(
            "INSERT INTO notifications (workspace_id, user_id, membership_id, kind, event_key,"
            " student_id, test_id, created_at, ready_at, group_key, event_version)"
            " VALUES (?,?,?,?,?,?,?,?,?,?,1)"
            " ON CONFLICT(membership_id, group_key) WHERE group_key IS NOT NULL"
            "   AND expansion_started_at IS NULL"
            " DO UPDATE SET event_version = event_version + 1, ready_at = excluded.ready_at",
            (WS, uid_f, mem_f, "score_updated", "evt_score_f2", STU, TEST, NOW, t_defer, group_f))
    version_after = checks.one("SELECT event_version FROM notifications WHERE id=?", (nid_f,))[0]
    checks.ok("score_chen_giua_tang_version_va_doi_han", version_after == version_f + 1,
              f"truoc={version_f} sau={version_after}")
    checks.ok("claim_cu_sau_khi_doi_han_tra_0_dong",
              claim_inbox(con, nid_f, t_ready, "lease_fake_f1", version_f) is None
              and checks.one("SELECT expansion_started_at IS NULL FROM notifications WHERE id=?",
                             (nid_f,))[0] == 1)
    checks.ok("claim_dung_version_nhung_chua_toi_han_cung_tra_0_dong",
              claim_inbox(con, nid_f, t_ready, "lease_fake_f2", version_after) is None)
    checks.ok("claim_khi_toi_han_va_dung_version_thanh_cong",
              claim_inbox(con, nid_f, t_defer, "lease_fake_f3", version_after) == "initial"
              and checks.one("SELECT expansion_started_at = ? FROM notifications WHERE id=?",
                             (t_defer, nid_f))[0] == 1)
    with con:
        con.execute(
            "INSERT INTO notifications (workspace_id, user_id, membership_id, kind, event_key,"
            " student_id, test_id, created_at, ready_at, group_key, event_version)"
            " VALUES (?,?,?,?,?,?,?,?,?,?,1)"
            " ON CONFLICT(membership_id, group_key) WHERE group_key IS NOT NULL"
            "   AND expansion_started_at IS NULL"
            " DO UPDATE SET event_version = event_version + 1, ready_at = excluded.ready_at",
            (WS, uid_f, mem_f, "score_updated", "evt_score_f3", STU, TEST, NOW,
             "2026-10-21T03:35:00.000Z", group_f))
    checks.ok("nhap_diem_sau_freeze_khong_dong_toi_dong_frozen",
              checks.one("SELECT event_version, ready_at FROM notifications WHERE id=?",
                         (nid_f,)) == (version_after, t_defer)
              and checks.one("SELECT count(*) FROM notifications WHERE event_key='evt_score_f3'")[0] == 1)
    # dep fixture cua ca CAS (ready_at tuong lai) de cac ca sau dem pending sach
    con.execute("DELETE FROM notifications WHERE event_key IN ('evt_score_f','evt_score_f3')")
    con.commit()

    # D. R2-03: takeover giu moc freeze; owner cu khong ghi duoc gi; chong trung PK
    _, mem_c, _ = add_guardian(con, 3)
    seed_devices(con, mem_c, "usr_g3", "c", 25)
    insert_notification(con, None, "slip_sent", "evt_fan_c", session=CS, mem=mem_c, user="usr_g3")
    con.commit()
    nid_c = checks.one("SELECT id FROM notifications WHERE event_key='evt_fan_c'")[0]
    v_c = checks.one("SELECT event_version FROM notifications WHERE id=?", (nid_c,))[0]
    checks.ok("claim_lan_dau_la_initial", claim_inbox(con, nid_c, NOW, "lease_old", v_c) == "initial")
    freeze_at = checks.one("SELECT expansion_started_at FROM notifications WHERE id=?", (nid_c,))[0]
    page_c = fanout_page(con, mem_c, NOW, "", NOW, 20)
    for dev_id, dev_version, eligible in page_c:
        if eligible:
            guarded_delivery(con, nid_c, mem_c, dev_id, dev_version, NOW, "lease_old")
    guarded_cursor(con, nid_c, page_c[-1][0], "lease_old")
    con.commit()  # "crash": khong complete, lease het han
    con.execute("UPDATE notifications SET expansion_lease_until='2000-01-01T00:00:00.000Z'"
                " WHERE id=?", (nid_c,))
    con.commit()
    t2 = "2026-10-21T03:40:00.000Z"
    checks.ok("takeover_la_reclaim", claim_inbox(con, nid_c, t2, "lease_new", v_c) == "reclaim")
    checks.ok("takeover_giu_nguyen_moc_freeze",
              checks.one("SELECT expansion_started_at FROM notifications WHERE id=?", (nid_c,))[0] == freeze_at)
    stale_writes = (
        guarded_delivery(con, nid_c, mem_c, "dev_c24", 1, t2, "lease_old"),
        guarded_cursor(con, nid_c, "dev_c24", "lease_old"),
        guarded_complete(con, nid_c, "dev_c24", t2, "lease_old"),
    )
    checks.ok("owner_cu_sau_takeover_khong_ghi_duoc", stale_writes == (0, 0, 0), f"rows={stale_writes}")
    page_c2 = fanout_page(con, mem_c, NOW, "dev_c19", t2, 20)
    with con:
        for dev_id, dev_version, eligible in page_c2:
            if eligible:
                guarded_delivery(con, nid_c, mem_c, dev_id, dev_version, t2, "lease_new")
        guarded_cursor(con, nid_c, page_c2[-1][0], "lease_new")
        checks.ok("complete_chi_khi_dung_lease_va_cursor",
                  guarded_complete(con, nid_c, "dev_c99", t2, "lease_new") == 0)
        guarded_complete(con, nid_c, page_c2[-1][0], t2, "lease_new")
    checks.ok("takeover_hoan_tat_dung_mot_lan_khong_trung_pk",
              checks.one("SELECT count(*) FROM push_deliveries WHERE notification_id=?", (nid_c,))[0] == 25
              and checks.one("SELECT count(DISTINCT device_id) FROM push_deliveries"
                             " WHERE notification_id=?", (nid_c,))[0] == 25
              and checks.one("SELECT deliveries_expanded_at IS NOT NULL FROM notifications"
                             " WHERE id=?", (nid_c,))[0] == 1)

    # D2. reclaim khong duoc dung cho dong chua freeze hoac chua toi han
    insert_notification(con, None, "slip_sent", "evt_fan_unfrozen", session=CS,
                        mem=mem_c, user="usr_g3", ready_at=NOW)
    con.commit()
    nid_u = checks.one("SELECT id FROM notifications WHERE event_key='evt_fan_unfrozen'")[0]
    checks.ok("reclaim_tu_choi_dong_chua_freeze",
              claim_inbox(con, nid_u, NOW, "lease_fake_u", 1) == "initial")
    con.execute("UPDATE notifications SET expansion_started_at=? , ready_at='2026-10-21T09:00:00.000Z'"
                " WHERE id=?", (NOW, nid_u))
    con.commit()
    checks.ok("reclaim_tu_choi_dong_chua_toi_han",
              claim_inbox(con, nid_u, NOW, "lease_fake_u2", 1) is None)
    con.execute("DELETE FROM notifications WHERE id=?", (nid_u,))
    con.commit()

    # E. nhieu inbox: tran 5 inbox moi invocation
    for tag in range(4, 10):
        uid, mem, _ = add_guardian(con, tag)
        seed_devices(con, mem, uid, f"d{tag}", 1)
        insert_notification(con, None, "slip_sent", f"evt_fan_many_{tag}", session=CS, mem=mem, user=uid)
    con.commit()
    considered3, touched3 = fanout_invocation(con, NOW, "lease_fake_m1")
    pending_left = checks.one(
        "SELECT count(*) FROM notifications WHERE deliveries_expanded_at IS NULL")[0]
    checks.ok("fanout_tran_5_inbox_moi_invocation",
              len(touched3) == 5 and pending_left == 1 and considered3 == 5,
              f"inbox={len(touched3)} con_lai={pending_left} xet={considered3}")
    _, touched4 = fanout_invocation(con, NOW_LATER, "lease_fake_m2")
    checks.ok("fanout_inbox_con_lai_duoc_xu_ly_luot_sau",
              len(touched4) == 1 and checks.one(
                  "SELECT count(*) FROM notifications WHERE deliveries_expanded_at IS NULL")[0] == 0)

    # F. dieu kien dang ky: 5 rows / 2 eligible => budget = 5 (khong phai 2)
    uid_e, mem_e, sess_e = add_guardian(con, 10)
    insert_device(con, "dev_e_a_norm", "FAKE_TOKEN_E_NORM", mem=mem_e, user=uid_e, session=sess_e)
    insert_device(con, "dev_e_b_refresh", "FAKE_TOKEN_E_REFRESH", mem=mem_e, user=uid_e,
                  session=sess_e, bound_at=NOW, updated_at="2026-10-21T04:30:00.000Z")
    insert_device(con, "dev_e_c_transfer", "FAKE_TOKEN_E_TRANSFER", mem=mem_e, user=uid_e,
                  session=sess_e, bound_at="2026-10-21T04:30:00.000Z")
    con.execute("INSERT INTO auth_sessions (id, user_id, membership_id, token_hash, created_at,"
                " last_seen_at, expires_at, revoked_at) VALUES ('sess_e_revoked', ?, ?, 'hash_e_rev', ?, ?, ?, ?)",
                (uid_e, mem_e, NOW, NOW, EXPIRE_FUTURE, NOW))
    insert_device(con, "dev_e_d_revoked", "FAKE_TOKEN_E_REVOKED", mem=mem_e, user=uid_e,
                  session="sess_e_revoked")
    insert_device(con, "dev_e_e_mismatch", "FAKE_TOKEN_E_MISMATCH", mem=mem_e, user=uid_e,
                  session=SESS)  # phien cua giao vien
    insert_notification(con, None, "slip_sent", "evt_fan_elig", session=CS, mem=mem_e, user=uid_e)
    con.commit()
    nid_e = checks.one("SELECT id FROM notifications WHERE event_key='evt_fan_elig'")[0]
    considered5, _ = fanout_invocation(con, NOW, "lease_fake_e1")
    delivered = [r[0] for r in con.execute(
        "SELECT device_id FROM push_deliveries WHERE notification_id=? ORDER BY device_id", (nid_e,))]
    checks.ok("fanout_ngan_sach_tinh_ca_dong_bi_skip", considered5 == 5,
              f"xet={considered5} (neu chi dem eligible thi = 2)")
    checks.ok("fanout_bo_qua_thiet_bi_khong_du_dieu_kien",
              delivered == ["dev_e_a_norm", "dev_e_b_refresh"], f"delivery={delivered}")
    checks.ok("fanout_khong_gui_push_lich_su_cho_thiet_bi_chuyen_chu",
              "dev_e_c_transfer" not in delivered)

    # G. R2-02: disable membership/user SAU fanout => sender check false, khong goi FCM
    uid_h, mem_h, sess_h = add_guardian(con, 12)
    insert_device(con, "dev_h_only", "FAKE_TOKEN_H_ONLY", mem=mem_h, user=uid_h, session=sess_h)
    insert_notification(con, None, "slip_sent", "evt_fan_h", session=CS, mem=mem_h, user=uid_h)
    con.commit()
    nid_h = checks.one("SELECT id FROM notifications WHERE event_key='evt_fan_h'")[0]
    fanout_invocation(con, NOW, "lease_fake_h1")
    sender_ok = lambda: con.execute(SENDER_OK_SQL, (nid_h, "dev_h_only", NOW, "comments_reports")).fetchone() is not None
    checks.ok("sender_hop_le_khi_user_va_membership_active", sender_ok())
    con.execute("UPDATE memberships SET status='disabled' WHERE id=?", (mem_h,))
    con.commit()
    checks.ok("sender_skip_khi_membership_bi_vo_hieu_sau_fanout", not sender_ok())
    con.execute("UPDATE memberships SET status='active' WHERE id=?", (mem_h,))
    con.execute("UPDATE users SET status='disabled' WHERE id=?", (uid_h,))
    con.commit()
    checks.ok("sender_skip_khi_user_bi_vo_hieu", not sender_ok())
    con.execute("UPDATE users SET status='active' WHERE id=?", (uid_h,))
    con.execute("UPDATE role_permissions SET level='none' WHERE role_id=? AND perm_group='comments_reports'",
                (ROLE_GUARDIAN,))
    con.commit()
    checks.ok("sender_skip_khi_mat_quyen_nhom", not sender_ok())
    con.execute("UPDATE role_permissions SET level='read' WHERE role_id=? AND perm_group='comments_reports'",
                (ROLE_GUARDIAN,))
    con.commit()
    checks.ok("sender_hop_le_lai_sau_khi_phuc_hoi_quyen", sender_ok())


def run_fanout_permission_checks(con, checks):
    """C3-01: quyen nhom va lien ket con nam trong PROJECTION cua trang fanout.

    Trang van lay du dang ky theo keyset (khong day predicate vao WHERE truoc LIMIT);
    dieu kien quyen/lien ket chi quyet dinh `eligible` cua tung dong da lay.
    """
    con.execute("DELETE FROM notifications")
    con.execute("DELETE FROM device_tokens")
    con.commit()

    role_c3, uid_c3, mem_c3, sess_c3 = ("role_fake_guardian_c3", "usr_c3", "mem_c3", "sess_c3")
    con.execute("INSERT INTO roles (id, workspace_id, name, scope_kind, is_system, created_at)"
                " VALUES (?,?,?,?,?,?)", (role_c3, WS, "Phu huynh C3", "linked_students", 0, NOW))
    con.execute("INSERT INTO role_permissions (role_id, perm_group, level) VALUES (?,?,?)",
                (role_c3, "comments_reports", "read"))
    con.execute("INSERT INTO users (id, phone, password_hash, created_at) VALUES (?,?,?,?)",
                (uid_c3, "+84910003001", "pbkdf2-sha256$1000$fake$fake", NOW))
    con.execute("INSERT INTO memberships (id, workspace_id, user_id, role_id, created_at)"
                " VALUES (?,?,?,?,?)", (mem_c3, WS, uid_c3, role_c3, NOW))
    con.execute("INSERT INTO auth_sessions (id, user_id, membership_id, token_hash, created_at,"
                " last_seen_at, expires_at) VALUES (?,?,?,?,?,?,?)",
                (sess_c3, uid_c3, mem_c3, "hash_fake_c3", NOW, NOW, EXPIRE_FUTURE))
    con.execute("INSERT INTO guardian_student (workspace_id, user_id, student_id, created_at)"
                " VALUES (?,?,?,?)", (WS, uid_c3, STU, NOW))
    insert_device(con, "dev_c3_only", "FAKE_TOKEN_C3_ONLY", mem=mem_c3, user=uid_c3, session=sess_c3)
    con.commit()

    def new_inbox(key, kind="slip_sent", session=CS, test=None):
        insert_notification(con, None, kind, key, session=session, test=test, mem=mem_c3, user=uid_c3)
        con.commit()
        return checks.one("SELECT id FROM notifications WHERE event_key=?", (key,))[0]

    def deliveries(nid):
        return checks.one("SELECT count(*) FROM push_deliveries WHERE notification_id=?", (nid,))[0]

    # (1) quyen nhom bi thu hoi TRUOC fanout
    con.execute("UPDATE role_permissions SET level='none' WHERE role_id=? AND perm_group='comments_reports'",
                (role_c3,))
    con.commit()
    nid_perm = new_inbox("evt_c3_perm")
    considered_perm, _ = fanout_invocation(con, NOW, "lease_fake_c3a")
    row_perm = checks.one("SELECT delivery_cursor FROM notifications WHERE id=?", (nid_perm,))
    checks.ok("c3_01_mat_quyen_nhom_truoc_fanout_khong_tao_delivery", deliveries(nid_perm) == 0)
    checks.ok("c3_01_dong_bi_skip_van_chiem_ngan_sach_va_cursor_di_qua",
              considered_perm == 1 and row_perm[0] == "dev_c3_only",
              f"xet={considered_perm} cursor={row_perm[0]}")

    # (2) lien ket con bi thu hoi TRUOC fanout
    con.execute("UPDATE role_permissions SET level='read' WHERE role_id=? AND perm_group='comments_reports'",
                (role_c3,))
    con.execute("DELETE FROM guardian_student WHERE user_id=? AND student_id=?", (uid_c3, STU))
    con.commit()
    nid_link = new_inbox("evt_c3_link")
    fanout_invocation(con, NOW_LATER, "lease_fake_c3b")
    checks.ok("c3_01_mat_lien_ket_con_truoc_fanout_khong_tao_delivery", deliveries(nid_link) == 0)

    # (3) phuc hoi du ca hai dieu kien thi co delivery
    con.execute("INSERT INTO guardian_student (workspace_id, user_id, student_id, created_at)"
                " VALUES (?,?,?,?)", (WS, uid_c3, STU, NOW))
    con.commit()
    nid_ok = new_inbox("evt_c3_ok")
    fanout_invocation(con, NOW_LATER, "lease_fake_c3c")
    checks.ok("c3_01_du_quyen_va_lien_ket_thi_co_delivery", deliveries(nid_ok) == 1)

    # (4) kind score_updated can nhom `scores`, khong dung comments_reports
    nid_score = new_inbox("evt_c3_score", kind="score_updated", session=None, test=TEST)
    fanout_invocation(con, NOW_LATER, "lease_fake_c3d")
    checks.ok("c3_01_score_can_nhom_scores_khong_dung_comments_reports",
              deliveries(nid_score) == 0, f"delivery={deliveries(nid_score)}")
    con.execute("INSERT INTO role_permissions (role_id, perm_group, level) VALUES (?,?,?)",
                (role_c3, "scores", "read"))
    con.commit()
    nid_score_ok = new_inbox("evt_c3_score_ok", kind="score_updated", session=None, test=TEST)
    fanout_invocation(con, NOW_LATER, "lease_fake_c3e")
    checks.ok("c3_01_score_co_nhom_scores_thi_co_delivery", deliveries(nid_score_ok) == 1)


# B-01: dieu kien dat lai mat khau (api-spec.md muc 4, Q2).
RESET_BLOCKERS_SQL = """
SELECT count(*) FROM memberships m JOIN roles r ON r.id = m.role_id
 WHERE m.user_id = ? AND (r.scope_kind <> 'linked_students' OR m.workspace_id <> ?)
"""


def run_reset_rule_checks(con, checks):
    """B-01: chi dat lai duoc khi khong co membership nhan su o bat ky workspace nao va
    moi membership la linked_students trong chinh workspace dang goi."""
    staff = con.execute(RESET_BLOCKERS_SQL, (U_TEACHER, WS)).fetchone()[0]
    checks.ok("b01_tai_khoan_co_membership_nhan_su_khong_dat_lai_duoc", staff > 0, f"blockers={staff}")

    parent = con.execute(RESET_BLOCKERS_SQL, (U_PARENT, WS)).fetchone()[0]
    checks.ok("b01_phu_huynh_chi_trong_workspace_nay_dat_lai_duoc", parent == 0, f"blockers={parent}")

    role_ws2, mem_ws2 = "role_fake_guardian_ws2", "mem_fake_guardian_ws2"
    con.execute("INSERT INTO roles (id, workspace_id, name, scope_kind, is_system, created_at)"
                " VALUES (?,?,?,?,?,?)", (role_ws2, WS2, "Phu huynh WS2", "linked_students", 0, NOW))
    con.execute("INSERT INTO memberships (id, workspace_id, user_id, role_id, created_at)"
                " VALUES (?,?,?,?,?)", (mem_ws2, WS2, U_PARENT, role_ws2, NOW))
    con.commit()
    other_ws = con.execute(RESET_BLOCKERS_SQL, (U_PARENT, WS)).fetchone()[0]
    checks.ok("b01_phu_huynh_co_membership_o_workspace_khac_khong_dat_lai_duoc",
              other_ws == 1, f"blockers={other_ws}")
    con.execute("DELETE FROM memberships WHERE id=?", (mem_ws2,))
    con.commit()


def run_command_atomicity_checks(con, checks):
    """B-02: moi lenh mot batch D1 => lenh sau that bai khong hoan lai lenh truoc."""
    atom_students = ["stu_atom_1", "stu_atom_bad", "stu_atom_3"]
    for sid in atom_students:
        con.execute("INSERT INTO students (id, workspace_id, class_id, name, enrolled_at,"
                    " created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
                    (sid, WS, CLS, "Hoc sinh atom", "2026-10-01", NOW, NOW))
    con.commit()

    def apply_one(sid, status, late_at):
        """Mot lenh = mot batch: loi thi chi rollback rieng lenh do."""
        try:
            with con:
                con.execute("INSERT INTO attendance (workspace_id, class_id, session_id, student_id,"
                            " status, note, late_at, created_at, updated_at)"
                            " VALUES (?,?,?,?,?,?,?,?,?)",
                            (WS, CLS, CS, sid, status, "", late_at, NOW, NOW))
            return "applied"
        except sqlite3.Error:
            return "rejected"

    results = (apply_one("stu_atom_1", "present", None),
               apply_one("stu_atom_bad", "present", "18:10"),   # CHECK: late_at chi khi 'late'
               apply_one("stu_atom_3", "absent", None))
    kept = [r[0] for r in con.execute(
        "SELECT student_id FROM attendance WHERE session_id=? AND student_id LIKE 'stu_atom%'"
        " ORDER BY student_id", (CS,))]
    checks.ok("b02_mot_lenh_mot_batch_loi_sau_khong_hoan_lai_lenh_truoc",
              results == ("applied", "rejected", "applied"), f"ket_qua={results}")
    checks.ok("b02_lenh_bi_tu_choi_khong_ghi_dong_nao",
              kept == ["stu_atom_1", "stu_atom_3"], f"con_lai={kept}")


def run_change_log_checks(con, checks):
    """B-03: change_log co created_at (giay Unix) + chi muc theo tuoi; don dep theo lo nho."""
    info = {r[1]: r for r in con.execute("PRAGMA table_info(change_log)")}
    checks.ok("change_log_co_cot_created_at", "created_at" in info, f"cot={list(info)}")
    checks.ok("change_log_created_at_not_null", "created_at" in info and info["created_at"][3] == 1)
    age_idx = [r[2] for r in con.execute("PRAGMA index_info('change_log_age')")]
    checks.ok("chi_muc_change_log_theo_created_at", age_idx == ["created_at"], f"cot={age_idx}")
    checks.rejects(
        "change_log_thieu_created_at_bi_tu_choi",
        "INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id) VALUES (?,?,?,?,?,?)",
        (WS, "attendance", CS, STU, "upsert", CLS),
    )

    con.execute("DELETE FROM change_log")
    con.commit()
    cutoff = 1_700_000_000           # moc 120 ngay, gia dinh
    insert = ("INSERT INTO change_log (workspace_id, entity, k1, k2, op, class_id, student_id,"
              " created_at) VALUES (?,?,?,?,?,?,?,?)")
    for i in range(5):
        con.execute(insert, (WS, "attendance", CS, f"stu_old_{i}", "upsert", CLS, STU, cutoff - 60 + i))
    for i in range(3):
        con.execute(insert, (WS, "attendance", CS, f"stu_new_{i}", "upsert", CLS, STU, cutoff + i))
    con.commit()
    old_seqs = [r[0] for r in con.execute("SELECT seq FROM change_log ORDER BY seq LIMIT 5")]

    batches = 0
    while batches < 10:
        deleted = con.execute(
            "DELETE FROM change_log WHERE seq IN (SELECT seq FROM change_log"
            " WHERE created_at < ? ORDER BY created_at LIMIT 2)", (cutoff,)).rowcount
        con.commit()
        batches += 1
        if deleted == 0:
            break
    remaining = [r[0] for r in con.execute("SELECT k2 FROM change_log ORDER BY seq")]
    checks.ok("change_log_don_xoa_dung_dong_cu_theo_created_at",
              remaining == ["stu_new_0", "stu_new_1", "stu_new_2"], f"con_lai={remaining}")
    checks.ok("change_log_don_theo_lo_nho_khong_xoa_het_mot_lan", batches == 4,
              f"so_lo={batches} (5 dong cu / LIMIT 2 => 3 lo xoa + 1 lo rong)")

    floor = con.execute("SELECT min(seq) FROM change_log").fetchone()[0]
    con.execute("UPDATE workspaces SET change_floor=? WHERE id=?", (floor, WS))
    con.commit()
    checks.ok("change_floor_bang_seq_nho_nhat_con_lai",
              checks.one("SELECT change_floor FROM workspaces WHERE id=?", (WS,))[0] == floor)
    checks.ok("cursor_cu_hon_change_floor_phai_tai_lai_bang_snapshot", old_seqs[-1] < floor,
              f"cursor_cu={old_seqs[-1]} floor={floor}")
    fresh_seq = con.execute("SELECT max(seq) FROM change_log").fetchone()[0]
    checks.ok("cursor_trong_cua_so_van_pull_duoc", fresh_seq >= floor)

    con.execute(insert, (WS, "attendance", CS, "stu_after_cleanup", "upsert", CLS, STU, cutoff + 10))
    new_seq = con.execute("SELECT max(seq) FROM change_log").fetchone()[0]
    checks.ok("change_log_khong_cap_lai_seq_da_xoa", new_seq > max(old_seqs + [fresh_seq]),
              f"seq_moi={new_seq} seq_cu_lon_nhat={max(old_seqs + [fresh_seq])}")


def run_same_class_checks(con, checks):
    """B-04: bon quan he lien bang phai cung LOP, khong chi cung workspace."""
    cls2, stu2, cs2, test2 = "cls_fake0002", "stu_fake0002", "cses_fake0002", "tst_fake0002"
    con.execute("INSERT INTO classes (id, workspace_id, name, weekdays, start_time, created_by,"
                " created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
                (cls2, WS, "Lop gia 2", 3, "19:00", U_TEACHER, NOW, NOW))
    con.execute("INSERT INTO students (id, workspace_id, class_id, name, enrolled_at, created_at,"
                " updated_at) VALUES (?,?,?,?,?,?,?)", (stu2, WS, cls2, "Hoc sinh lop 2", "2026-10-01", NOW, NOW))
    con.execute("INSERT INTO students (id, workspace_id, class_id, name, enrolled_at, created_at,"
                " updated_at) VALUES (?,?,?,?,?,?,?)",
                ("stu_fake0003", WS, CLS, "Hoc sinh lop 1b", "2026-10-01", NOW, NOW))
    con.execute("INSERT INTO class_sessions (id, workspace_id, class_id, date, start_time, origin,"
                " created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
                (cs2, WS, cls2, "2026-10-22", "19:00", "recurring", NOW, NOW))
    con.execute("INSERT INTO tests (id, workspace_id, class_id, name, date, created_by, created_at,"
                " updated_at) VALUES (?,?,?,?,?,?,?,?)",
                (test2, WS, cls2, "Bai gia 2", "2026-10-22", U_TEACHER, NOW, NOW))
    con.commit()

    att = ("INSERT INTO attendance (workspace_id, class_id, session_id, student_id, status, note,"
           " created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)")
    checks.rejects("b04_diem_danh_buoi_C1_voi_em_C2_bi_chan", att,
                   (WS, CLS, CS, stu2, "present", "", NOW, NOW))
    checks.rejects("b04_diem_danh_class_id_sai_bi_chan", att,
                   (WS, cls2, CS, stu2, "present", "", NOW, NOW))
    checks.accepts("b04_diem_danh_dung_lop_qua", att,
                   (WS, CLS, CS, "stu_fake0003", "present", "", NOW, NOW))

    score = ("INSERT INTO scores (workspace_id, class_id, test_id, student_id, value, created_at,"
             " updated_at) VALUES (?,?,?,?,?,?,?)")
    checks.rejects("b04_diem_bai_C1_voi_em_C2_bi_chan", score, (WS, CLS, TEST, stu2, 10, NOW, NOW))
    checks.accepts("b04_diem_dung_lop_qua", score, (WS, CLS, TEST, "stu_fake0003", 10, NOW, NOW))

    slip = ("INSERT INTO session_comments (workspace_id, class_id, session_id, student_id, stars,"
            " note, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)")
    checks.rejects("b04_phieu_buoi_C1_voi_em_C2_bi_chan", slip,
                   (WS, CLS, CS, stu2, 2, "", "draft", NOW, NOW))
    checks.accepts("b04_phieu_buoi_dung_lop_qua", slip,
                   (WS, CLS, CS, "stu_fake0003", 2, "", "draft", NOW, NOW))

    con.execute("INSERT INTO homework_sections (id, workspace_id, class_id, session_id, kind,"
                " created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
                ("hws_fake0001", WS, CLS, CS, "vocabulary", U_TEACHER, NOW, NOW))
    con.commit()
    grade = ("INSERT INTO homework_grades (workspace_id, class_id, section_id, student_id, level,"
             " created_at, updated_at) VALUES (?,?,?,?,?,?,?)")
    checks.rejects("b04_cham_btvn_phan_C1_voi_em_C2_bi_chan", grade,
                   (WS, CLS, "hws_fake0001", stu2, "done", NOW, NOW))
    checks.rejects(
        "b04_phan_btvn_thuoc_buoi_cua_lop_khac_bi_chan",
        "INSERT INTO homework_sections (id, workspace_id, class_id, session_id, kind, created_by,"
        " created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
        ("hws_fake0002", WS, cls2, CS, "reading", U_TEACHER, NOW, NOW),
    )
    checks.accepts("b04_cham_btvn_dung_lop_qua", grade,
                   (WS, CLS, "hws_fake0001", "stu_fake0003", "done", NOW, NOW))

    con.execute("UPDATE students SET status='left', left_at=? WHERE id=?", ("2026-12-05", "stu_fake0003"))
    con.commit()
    checks.ok("b04_hoc_sinh_roi_lop_giu_lich_su",
              checks.one("SELECT count(*) FROM attendance WHERE student_id='stu_fake0003'")[0] == 1
              and checks.one("SELECT class_id FROM students WHERE id='stu_fake0003'")[0] == CLS)
    checks.ok("b04_fk_toan_ven_sau_cac_ca_cung_lop",
              not con.execute("PRAGMA foreign_key_check").fetchall())


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
        " token, platform, bound_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        ("dev_fake_bad_owner", WS, U_PARENT, MEM_TEACHER, SESS, "FAKE_TOKEN_BAD_OWNER", "ios", NOW, NOW, NOW),
    )
    checks.rejects(
        "fk_device_auth_session_ton_tai",
        "INSERT INTO device_tokens (id, workspace_id, user_id, membership_id, auth_session_id,"
        " token, platform, bound_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        ("dev_fake_bad_session", WS, U_PARENT, MEM_PARENT, "auth_fake_missing", "FAKE_TOKEN_BAD_SESSION",
         "ios", NOW, NOW, NOW),
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
        " token, platform, bound_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        ("dev_fake_dupe", WS, U_TEACHER, MEM_TEACHER, SESS, "FAKE_FCM_REGISTRATION_TOKEN_1", "web", NOW, NOW, NOW),
    )
    checks.rejects(
        "device_platform_chi_ios_web",
        "INSERT INTO device_tokens (id, workspace_id, user_id, membership_id, auth_session_id,"
        " token, platform, bound_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        ("dev_fake_android", WS, U_PARENT, MEM_PARENT, SESS_PARENT, "FAKE_TOKEN_ANDROID", "android", NOW, NOW, NOW),
    )
    checks.rejects(
        "device_token_khong_rong",
        "INSERT INTO device_tokens (id, workspace_id, user_id, membership_id, auth_session_id,"
        " token, platform, bound_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        ("dev_fake_empty", WS, U_PARENT, MEM_PARENT, SESS_PARENT, "", "ios", NOW, NOW, NOW),
    )
    checks.rejects(
        "device_thieu_bound_at",
        "INSERT INTO device_tokens (id, workspace_id, user_id, membership_id, auth_session_id,"
        " token, platform, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
        ("dev_fake_nobound", WS, U_PARENT, MEM_PARENT, SESS_PARENT, "FAKE_TOKEN_NOBOUND", "ios", NOW, NOW),
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

    # --- gop diem: mot nhom mo; freeze dong nhom dung mot lan; nhap moi mo nhom moi ---
    group = f"{MEM_PARENT}:{STU}:{TEST}"
    upsert_score = (
        "INSERT INTO notifications (workspace_id, user_id, membership_id, kind, event_key, student_id,"
        " test_id, created_at, ready_at, group_key, event_version)"
        " VALUES (?,?,?,?,?,?,?,?,?,?,1)"
        " ON CONFLICT(membership_id, group_key) WHERE group_key IS NOT NULL AND expansion_started_at IS NULL"
        " DO UPDATE SET event_version = event_version + 1, ready_at = excluded.ready_at"
    )
    checks.accepts("diem_nhom_mo_dau_tien", lambda: insert_notification(
        con, None, "score_updated", "evt_score_cmd_1", group_key=group, test=TEST))
    checks.rejects(
        "diem_nhom_thu_hai_khi_con_mo",
        "INSERT INTO notifications (workspace_id, user_id, membership_id, kind, event_key,"
        " student_id, test_id, created_at, ready_at, group_key) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (WS, U_PARENT, MEM_PARENT, "score_updated", "evt_score_cmd_2", STU, TEST, NOW, NOW, group),
    )
    checks.accepts(
        "diem_upsert_truoc_freeze_giu_cung_nhom",
        upsert_score,
        (WS, U_PARENT, MEM_PARENT, "score_updated", "evt_score_cmd_1b", STU, TEST, NOW,
         "2026-10-21T03:20:00.000Z", group),
    )
    checks.ok(
        "diem_upsert_truoc_freeze_tang_event_version_mot_dong",
        checks.one("SELECT count(*) FROM notifications WHERE membership_id=? AND group_key=?",
                   (MEM_PARENT, group))[0] == 1
        and checks.one("SELECT event_version FROM notifications WHERE event_key='evt_score_cmd_1'")[0] == 2,
    )
    group_b = f"{MEM_PARENT}:{STU}:probe"
    checks.accepts(
        "diem_nhom_probe_tao",
        "INSERT INTO notifications (workspace_id, user_id, membership_id, kind, event_key,"
        " student_id, test_id, created_at, ready_at, group_key) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (WS, U_PARENT, MEM_PARENT, "score_updated", "evt_probe_b", STU, TEST, NOW, NOW, group_b),
    )
    checks.accepts(
        "diem_nhom_probe_danh_dau_xong",
        "UPDATE notifications SET deliveries_expanded_at=? WHERE event_key='evt_probe_b'", (NOW,))
    checks.rejects(
        "diem_expand_xong_khong_thay_cho_freeze",
        "INSERT INTO notifications (workspace_id, user_id, membership_id, kind, event_key,"
        " student_id, test_id, created_at, ready_at, group_key) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (WS, U_PARENT, MEM_PARENT, "score_updated", "evt_probe_b2", STU, TEST, NOW, NOW, group_b),
    )
    checks.accepts("diem_don_nhom_probe", "DELETE FROM notifications WHERE event_key='evt_probe_b'")
    checks.accepts(
        "diem_freeze_dung_mot_lan",
        "UPDATE notifications SET expansion_started_at=? WHERE membership_id=? AND group_key=?"
        " AND expansion_started_at IS NULL",
        (NOW, MEM_PARENT, group),
    )
    checks.ok(
        "diem_freeze_lap_lai_khong_doi_gi",
        con.execute(
            "UPDATE notifications SET expansion_started_at='2026-10-21T09:00:00.000Z'"
            " WHERE membership_id=? AND group_key=? AND expansion_started_at IS NULL",
            (MEM_PARENT, group)).rowcount == 0,
    )
    checks.accepts(
        "diem_job_xong_sau_freeze",
        "UPDATE notifications SET deliveries_expanded_at=? WHERE membership_id=? AND group_key=?",
        (NOW, MEM_PARENT, group),
    )
    before = checks.one(
        "SELECT event_version, ready_at FROM notifications WHERE event_key='evt_score_cmd_1'")
    checks.accepts(
        "diem_nhap_moi_sau_freeze_tao_nhom_moi",
        upsert_score,
        (WS, U_PARENT, MEM_PARENT, "score_updated", "evt_score_cmd_3", STU, TEST, NOW,
         "2026-10-21T04:00:00.000Z", group),
    )
    after = checks.one(
        "SELECT event_version, ready_at FROM notifications WHERE event_key='evt_score_cmd_1'")
    checks.ok(
        "diem_freeze_khong_bi_nhap_moi_keo_theo",
        checks.one("SELECT count(*) FROM notifications WHERE membership_id=? AND group_key=?",
                   (MEM_PARENT, group))[0] == 2 and before == after,
        f"truoc={before} sau={after}",
    )
    checks.ok(
        "diem_nhom_moi_dang_mo_va_nhom_cu_da_freeze",
        checks.one("SELECT expansion_started_at IS NULL FROM notifications"
                   " WHERE event_key='evt_score_cmd_3'")[0] == 1
        and checks.one("SELECT expansion_started_at IS NOT NULL FROM notifications"
                       " WHERE event_key='evt_score_cmd_1'")[0] == 1,
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

    run_lifecycle_checks(con, checks)
    run_fanout_checks(con, checks)
    run_fanout_permission_checks(con, checks)
    run_reset_rule_checks(con, checks)
    run_command_atomicity_checks(con, checks)
    run_change_log_checks(con, checks)
    run_same_class_checks(con, checks)

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
    print("gioi_han: chi DDL + cau SQL khai bao trong markdown tren SQLite :memory:; "
          "fanout/atomic/don dep la mo phong SQL tuan tu (khong phai API/FCM/cron concurrent that); "
          "khong co trigger, khong co D1/Worker, khong do CPU")
    return 0


if __name__ == "__main__":
    sys.exit(main())
