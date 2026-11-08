#!/usr/bin/env bash
# Gate k6 cho POST /v1/sync/push — CHỈ CHẠY LOCAL, không đọc file creds, không gọi dev/staging/prod.
#
# Chuẩn bị (trong worker/):
#   npx wrangler d1 migrations apply qlh-dev-db --local --env dev
#   npx wrangler dev --local --env dev --port 8787
# Chạy (từ thư mục gốc repo):
#   perf/k6/run-sync-push.sh                     # gate: 5 VU × 1 phút, 20 lệnh/push, p95 < 300 ms
#   SCENARIO=ramp perf/k6/run-sync-push.sh       # tăng tải tới RAMP_MAX_VUS (40) VU
# Script tự đăng ký tài khoản + workspace mới trên D1 local; tham số thêm chuyển thẳng cho `k6 run`
# (ví dụ --summary-export out.json). k6 exit ≠ 0 khi trượt ngưỡng.
set -euo pipefail
api="${QLH_API_BASE:-http://127.0.0.1:8787/v1}"
if [[ ! "$api" =~ ^http://(127\.0\.0\.1|localhost)(:[0-9]+)?(/|$) ]]; then
  echo "chỉ chạy local: QLH_API_BASE phải là http://127.0.0.1:<cổng> hoặc http://localhost:<cổng>" >&2
  exit 2
fi
export QLH_API_BASE="$api"
exec k6 run "$@" "$(dirname "$0")/sync-push.js"
