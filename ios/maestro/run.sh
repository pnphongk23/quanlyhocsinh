#!/bin/sh
# Chạy một flow Maestro với màn hình demo (Staging/Debug) đúng như flow khai báo.
#
#   ios/maestro/run.sh ios/maestro/guardian/01-tabs.yaml [udid]
#
# Flow khai báo màn demo bằng dòng đầu `# demo: <cờ>`; `run.sh` đọc dòng đó, khởi chạy app
# bằng `SIMCTL_CHILD_QLH_DEMO_SCREEN=<cờ>` rồi mới chạy `maestro test`. Không có `# demo:`
# thì app khởi chạy bình thường (màn Đăng nhập thật).
#
# Vì sao không dùng `launchApp: arguments:`: Maestro 2.2.0 trên iOS không chuyển launch
# arguments tới app (thử cả `QLH_DEMO_SCREEN=…`, `-QLH_DEMO_SCREEN …`, `UserDefaults`), nên
# biến môi trường của `simctl` là cách duy nhất đang chạy được. Flow vẫn không tự gọi
# `launchApp` để giữ nguyên màn đã seed.
set -eu

FLOW=${1:?usage: run.sh <flow.yaml> [udid]}
FLOW=$(cd "$(dirname "$FLOW")" && pwd)/$(basename "$FLOW")
FLOW_DIR=$(cd "$(dirname "$0")" && pwd)
IOS_DIR=$(cd "$FLOW_DIR/.." && pwd)
MAESTRO=${MAESTRO:-$HOME/.maestro/bin/maestro}
MAESTRO_TEST_OUTPUT_DIR=${MAESTRO_TEST_OUTPUT_DIR:-/tmp/qlh-maestro-output}
APP_ID=vn.quanlylop.app

DEVICE=${2:-${QLH_DEVICE:-}}
if [ -z "$DEVICE" ]; then
  DEVICE=$(xcrun simctl list devices booted -j | python3 -c '
import json, sys
devices = json.load(sys.stdin)["devices"]
print(next(d["udid"] for group in devices.values() for d in group if d["name"] == "iPhone 16"))
')
fi

DEMO=$(awk -F': ' '/^# demo:/{print $2; exit}' "$FLOW")
DEMO=${DEMO:-}

xcrun simctl terminate "$DEVICE" "$APP_ID" >/dev/null 2>&1 || true
SIMCTL_CHILD_QLH_DEMO_SCREEN="$DEMO" xcrun simctl launch "$DEVICE" "$APP_ID" >/dev/null

cd "$IOS_DIR"
exec "$MAESTRO" --device "$DEVICE" test --test-output-dir "$MAESTRO_TEST_OUTPUT_DIR" "$FLOW"
