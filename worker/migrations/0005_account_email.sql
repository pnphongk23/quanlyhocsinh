-- Email tài khoản (tùy chọn) và đặt lại mật khẩu qua link.
ALTER TABLE users ADD COLUMN email TEXT
  CHECK (email IS NULL OR (length(email) <= 254 AND email = lower(email) AND email LIKE '%_@_%'));

CREATE TABLE password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);

-- Hộp thư giả cho chế độ thử (MAIL_MODE=test); cron xoá sau 1 giờ.
CREATE TABLE test_mailbox (
  id TEXT PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
