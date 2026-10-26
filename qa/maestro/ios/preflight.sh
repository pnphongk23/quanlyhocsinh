#!/bin/bash
# Run only after the QA lead assigns the dedicated iPhone 16 simulator.
# Build/install the Staging simulator app with Manual ad-hoc signing first:
# CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual.
# Unsigned simulator builds can silently fail to persist auth tokens in Keychain.
# App id source: app target in ios/project.yml, following its Staging xcconfig
# reference when PRODUCT_BUNDLE_IDENTIFIER is not inlined in the YAML.

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  printf 'Usage: %s <iPhone-16-UDID> [path/to/ios/project.yml]\n' "$0" >&2
  exit 2
fi

SIMULATOR_UDID="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

check_disk_space() {
  df -h /
  AVAILABLE_KB="$(df -Pk / | awk 'NR == 2 { print $4 }')"
  if [ -z "$AVAILABLE_KB" ] || [ "$AVAILABLE_KB" -lt 4194304 ]; then
    printf 'Less than 4 GiB free; stopping before simulator work.\n' >&2
    return 1
  fi
}

# Prefer repo/ios/project.yml; otherwise use the current known iOS worktree.
# Pass a different project.yml as argument 2 if the checkout path changes.
if [ "$#" -eq 2 ]; then
  PROJECT_YML="$2"
else
  REPO_PROJECT_YML="$REPO_ROOT/ios/project.yml"
  WORKTREE_PROJECT_YML="$HOME/.paseo/worktrees/0fvr24l0/mvp-ios/ios/project.yml"
  if [ -f "$REPO_PROJECT_YML" ]; then
    PROJECT_YML="$REPO_PROJECT_YML"
  elif [ -f "$WORKTREE_PROJECT_YML" ]; then
    PROJECT_YML="$WORKTREE_PROJECT_YML"
  else
    printf 'Cannot find ios/project.yml; pass its path as the second argument.\n' >&2
    exit 2
  fi
fi
if [ ! -f "$PROJECT_YML" ]; then
  printf 'project.yml not found at the supplied path.\n' >&2
  exit 2
fi

# Resolve PRODUCT_BUNDLE_IDENTIFIER from the app target in project.yml. This
# project points to Config/Staging.xcconfig, which includes Base.xcconfig where
# the identifier is defined.
APP_BUNDLE_ID="$(python3 - "$PROJECT_YML" <<'PY'
from pathlib import Path
import re
import sys

project = Path(sys.argv[1]).resolve()
text = project.read_text()
target_match = re.search(
    r"(?ms)^  QuanLyLop:\s*\n(.*?)(?=^  [A-Za-z0-9_-]+:\s*$|^schemes:\s*$)", text
)
if not target_match:
    raise SystemExit("app target QuanLyLop is missing from project.yml")
target = target_match.group(1)
direct = re.search(r"(?m)^\s+PRODUCT_BUNDLE_IDENTIFIER:\s*['\"]?([^\s'\"]+)", target)
if direct:
    print(direct.group(1))
    raise SystemExit(0)
config_block = re.search(
    r"(?ms)^    configFiles:\s*\n(?P<body>(?:^      .*\n|^\s*\n)*)", target
)
if not config_block:
    raise SystemExit("app target has no configFiles in project.yml")
staging = re.search(r"(?m)^      Staging:\s*([^\s#]+)", config_block.group("body"))
if not staging:
    raise SystemExit("Staging xcconfig path is missing from app target in project.yml")

seen = set()
pending = [project.parent / staging.group(1)]
while pending:
    current = pending.pop().resolve()
    if current in seen:
        continue
    seen.add(current)
    if not current.is_file():
        raise SystemExit("referenced Staging xcconfig is missing")
    config = current.read_text()
    value = re.search(r"(?m)^\s*PRODUCT_BUNDLE_IDENTIFIER\s*=\s*([^\s#]+)", config)
    if value:
        print(value.group(1))
        raise SystemExit(0)
    for include in re.finditer(r'(?m)^\s*#include\??\s+"([^"]+)"', config):
        pending.append(current.parent / include.group(1))
raise SystemExit("PRODUCT_BUNDLE_IDENTIFIER is not defined for the app target")
PY
)" || exit 2
if [ -z "$APP_BUNDLE_ID" ]; then
  printf 'Could not resolve PRODUCT_BUNDLE_IDENTIFIER for the app target.\n' >&2
  exit 2
fi
printf 'App bundle id from %s: %s\n' "$PROJECT_YML" "$APP_BUNDLE_ID"

# Confirm the supplied UDID is the booted iPhone 16 before changing installed apps.
check_disk_space || exit 1
BOOTED_DEVICES="$(xcrun simctl list devices booted --json)" || exit 1
if ! python3 - "$BOOTED_DEVICES" "$SIMULATOR_UDID" <<'PY'
import json
import sys

payload = json.loads(sys.argv[1])
udid = sys.argv[2]
devices = [item for group in payload.get("devices", {}).values() for item in group]
match = next((item for item in devices if item.get("udid", "").lower() == udid.lower()), None)
if not match or match.get("state") != "Booted" or match.get("name") != "iPhone 16":
    raise SystemExit("the supplied UDID is not a booted iPhone 16")
print("Booted simulator verified: iPhone 16")
PY
then
  printf 'Simulator preflight failed.\n' >&2
  exit 1
fi

# List installed bundle ids. Remove only non-Apple apps other than this app.
INSTALLED_APPS="$(xcrun simctl listapps "$SIMULATOR_UDID" | plutil -convert json -o - -)" || exit 1
BUNDLE_IDS="$(python3 - "$INSTALLED_APPS" <<'PY'
import json
import sys

payload = json.loads(sys.argv[1])
if isinstance(payload, dict) and isinstance(payload.get("apps"), dict):
    payload = payload["apps"]
if isinstance(payload, dict):
    for key, info in payload.items():
        if isinstance(info, dict):
            bundle = info.get("CFBundleIdentifier", key)
            if isinstance(bundle, str) and bundle:
                print(bundle)
PY
)" || exit 1
printf 'Installed app bundle ids:\n'
APP_IS_INSTALLED="no"
while IFS= read -r bundle_id; do
  [ -n "$bundle_id" ] || continue
  printf '  %s\n' "$bundle_id"
  if [ "$bundle_id" = "$APP_BUNDLE_ID" ]; then
    APP_IS_INSTALLED="yes"
  fi
  case "$bundle_id" in
    "$APP_BUNDLE_ID"|com.apple|com.apple.*) ;;
    *)
      if ! xcrun simctl uninstall "$SIMULATOR_UDID" "$bundle_id"; then
        printf 'Could not uninstall non-Apple app %s; stopping.\n' "$bundle_id" >&2
        exit 1
      fi
      ;;
  esac
done <<< "$BUNDLE_IDS"
if [ "$APP_IS_INSTALLED" != "yes" ]; then
  printf 'The app from project.yml is not installed on this simulator.\n' >&2
  exit 1
fi

INSTALLED_APP_PATH="$(xcrun simctl get_app_container "$SIMULATOR_UDID" "$APP_BUNDLE_ID" app)" || exit 1
SIGNATURE_INFO="$(codesign -dv --verbose=4 "$INSTALLED_APP_PATH" 2>&1)" || {
  printf 'Could not inspect the installed app signature; refusing login preflight.\n' >&2
  exit 1
}
if ! python3 - "$SIGNATURE_INFO" <<'PY'
import sys
if "Signature=adhoc" not in sys.argv[1]:
    raise SystemExit(1)
PY
then
  printf 'Installed app is not confirmed ad-hoc signed; refusing login preflight.\n' >&2
  exit 1
fi
printf 'Installed simulator app signature verified: ad hoc.\n'

FLOW_FILE="$REPO_ROOT/qa/maestro/ios/auth/login.yaml"
if [ ! -f "$FLOW_FILE" ]; then
  printf 'Login flow is missing.\n' >&2
  exit 1
fi
MAESTRO_BIN="$HOME/.maestro/bin/maestro"
if [ ! -x "$MAESTRO_BIN" ]; then
  printf 'Maestro executable is unavailable.\n' >&2
  exit 1
fi

# Keep logs/reports/screenshots in a temporary directory and never print them.
RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/qlh-ios-preflight.XXXXXX")" || exit 1
trap 'rm -rf -- "$RUN_DIR"' EXIT
check_disk_space || exit 1
if ! xcrun simctl launch "$SIMULATOR_UDID" "$APP_BUNDLE_ID" >"$RUN_DIR/launch.log" 2>&1; then
  printf 'Could not launch the app from project.yml; stopping before login.\n' >&2
  exit 1
fi
if ! "$MAESTRO_BIN" --udid "$SIMULATOR_UDID" hierarchy >"$RUN_DIR/hierarchy.txt" 2>&1; then
  printf 'Could not inspect the current app screen; stopping before login.\n' >&2
  exit 1
fi
SCREEN_STATE="$(python3 - "$RUN_DIR/hierarchy.txt" <<'PY'
from pathlib import Path
import sys
hierarchy = Path(sys.argv[1]).read_text(errors="replace")
print("login" if "login.phone" in hierarchy else "signed-in")
PY
)" || exit 1
if [ "$SCREEN_STATE" = "signed-in" ]; then
  printf 'Existing signed-in session detected; reused it without submitting login.\n'
  exit 0
fi

CREDS_FILE="$HOME/.config/qlh/staging-smoke.txt"
if [ ! -r "$CREDS_FILE" ]; then
  printf 'Smoke credential file is unavailable.\n' >&2
  exit 1
fi
PHONE_RAW="$(python3 - "$CREDS_FILE" <<'PY'
import sys
values = {}
for line in open(sys.argv[1], encoding="utf-8"):
    if "=" in line:
        key, value = line.rstrip("\n").split("=", 1)
        values[key.strip()] = value
if "phone" not in values:
    raise SystemExit("phone key is missing")
sys.stdout.write(values["phone"])
PY
)" || exit 1
STAGING_PHONE="$(python3 - "$PHONE_RAW" <<'PY'
import re
import sys
phone = re.sub(r"\D", "", sys.argv[1])
if phone.startswith("84"):
    phone = phone[2:]
elif phone.startswith("0"):
    phone = phone[1:]
if len(phone) != 9 or not phone.isdigit():
    raise SystemExit("phone must normalize to nine domestic digits")
sys.stdout.write(phone)
PY
)" || exit 1
STAGING_PASSWORD="$(python3 - "$CREDS_FILE" <<'PY'
import sys
values = {}
for line in open(sys.argv[1], encoding="utf-8"):
    if "=" in line:
        key, value = line.rstrip("\n").split("=", 1)
        values[key.strip()] = value
if "password" not in values:
    raise SystemExit("password key is missing")
sys.stdout.write(values["password"])
PY
)" || exit 1
if "$MAESTRO_BIN" --udid "$SIMULATOR_UDID" test \
  -e STAGING_PHONE="$STAGING_PHONE" \
  -e STAGING_PASSWORD="$STAGING_PASSWORD" \
  --format junit \
  --output "$RUN_DIR/login.junit.xml" \
  --test-output-dir "$RUN_DIR/artifacts" \
  "$FLOW_FILE" >"$RUN_DIR/maestro.log" 2>&1; then
  printf 'One login preflight submit passed. No second submit was attempted.\n'
else
  DIAG_DIR="$REPO_ROOT/plans/20261021-mvp/qa/runs/2026-10-25/ios/auth"
  DIAG_FILE="$DIAG_DIR/preflight-diag.txt"
  mkdir -p "$DIAG_DIR"
  if ! "$MAESTRO_BIN" --udid "$SIMULATOR_UDID" hierarchy >"$RUN_DIR/hierarchy-after-fail.txt" 2>&1; then
    : >"$RUN_DIR/hierarchy-after-fail.txt"
  fi
  REDACT_PASSWORD="$STAGING_PASSWORD" python3 - "$RUN_DIR/maestro.log" "$RUN_DIR/hierarchy-after-fail.txt" "$DIAG_FILE" <<'PY'
from pathlib import Path
import os
import re
import sys

log_path, hierarchy_path, output_path = map(Path, sys.argv[1:])
password = os.environ.get("REDACT_PASSWORD", "")
log = log_path.read_text(errors="replace") if log_path.exists() else ""
selected = []
error_terms = re.compile(r"Assertion|Element not found|Timeout|Failed|Error|COMPLETED|FAILED", re.I)
step_pattern = re.compile(r"(tapOn|inputText|extendedWaitUntil)", re.I)
for raw in log.splitlines():
    step = step_pattern.search(raw)
    if step:
        name = step.group(1)
        if name.lower() == "inputtext":
            selected.append("STEP inputText: [redacted]")
        else:
            selected.append("STEP " + name)
    if error_terms.search(raw):
        if step and step.group(1).lower() == "inputtext":
            selected.append("Error at step inputText: [redacted]")
            continue
        safe = raw
        if password:
            safe = safe.replace(password, "[redacted]")
        safe = re.sub(r"\d{9,}", "[redacted]", safe)
        safe = step_pattern.sub(lambda m: m.group(1), safe)
        selected.append(safe)

hierarchy_ok = hierarchy_path.exists() and hierarchy_path.stat().st_size > 0
hierarchy = hierarchy_path.read_text(errors="replace") if hierarchy_ok else ""
lower = hierarchy.lower()
login_phone = "login.phone" in hierarchy
save_error = "saveStatus.error" in hierarchy
error_label = bool(re.search(
    r"(invalid|incorrect|wrong|failed|error|không đúng|không hợp lệ|thất bại|"
    r"lỗi đăng nhập|sai mật khẩu|số điện thoại hoặc mật khẩu)", lower
))
home = "Lớp của tôi" in hierarchy
flags = [
    f"hierarchy_available={'yes' if hierarchy_ok else 'no'}",
    f"login.phone={'yes' if login_phone else 'no'}",
    f"saveStatus.error={'yes' if save_error else 'no'}",
    f"login_error_label={'yes' if error_label else 'no'}",
    f"home_Lop_cua_toi={'yes' if home else 'no'}",
]
output_path.write_text("\n".join([*selected, *flags]) + "\n")
PY
  python3 - "$RUN_DIR" "$DIAG_FILE" <<'PY'
from pathlib import Path
import shutil
import sys

run_dir, diag_file = map(Path, sys.argv[1:])
matches = sorted(
    path for path in run_dir.rglob("*.png")
    if path.stem == "login-failure-sanitized"
)
if matches:
    destination = diag_file.parent / "preflight-failure.png"
    shutil.copy2(matches[-1], destination)
    result = "failure_screenshot=preflight-failure.png"
else:
    result = "failure_screenshot=not_found"
with diag_file.open("a", encoding="utf-8") as stream:
    stream.write(result + "\n")
PY
  printf 'Login preflight failed after one submit. Filtered diagnostic saved to %s; no retry was attempted.\n' "$DIAG_FILE" >&2
  exit 1
fi
