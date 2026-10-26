# iOS Maestro

Build/install requirement for simulator QA: use Staging with `CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual` (do not set `CODE_SIGNING_REQUIRED=NO`). An unsigned simulator app can fail to persist auth tokens in Keychain while login still returns HTTP 200. `preflight.sh` verifies `Signature=adhoc` on the installed `.app` and stops before login if it cannot confirm the signature.

Đọc thông tin đăng nhập từ `~/.config/qlh/staging-smoke.txt` (các dòng `key=value`) vào biến, chuẩn hoá số điện thoại thành đúng 9 chữ số nội địa trước khi chạy. stdout của Python chỉ được giữ trong biến shell, không in ra terminal.

```sh
CREDS_FILE="$HOME/.config/qlh/staging-smoke.txt"
STAGING_PHONE="$(python3 -c 'import re,sys; d=dict(line.rstrip("\n").split("=",1) for line in open(sys.argv[1]) if "=" in line); p=re.sub(r"\D", "", d["phone"]); p=p[2:] if p.startswith("84") else (p[1:] if p.startswith("0") else p); assert len(p)==9 and p.isdigit(), "STAGING_PHONE must normalize to 9 digits"; sys.stdout.write(p)' "$CREDS_FILE")"
STAGING_PASSWORD="$(python3 -c 'import sys; d=dict(line.rstrip("\n").split("=",1) for line in open(sys.argv[1]) if "=" in line); sys.stdout.write(d["password"])' "$CREDS_FILE")"
FLOW_FILE="qa/maestro/ios/auth/login.yaml"
IOS_SIMULATOR_UDID="CF871F97-1789-4490-B3E3-0B5EFA39F23F"
REPORT_FILE="plans/20261021-mvp/qa/runs/2026-10-25/ios/auth/login.junit.xml"
ARTIFACT_DIR="/tmp/maestro-ios-auth-artifacts"
maestro --udid "$IOS_SIMULATOR_UDID" test -e STAGING_PHONE="$STAGING_PHONE" -e STAGING_PASSWORD="$STAGING_PASSWORD" --format=JUNIT --output "$REPORT_FILE" --test-output-dir "$ARTIFACT_DIR" "$FLOW_FILE"
```

Không dùng `env`, `printenv` hoặc `set`; không echo biến, ghi credential vào file, hay đưa chúng vào log. Khi chạy lại, tối đa một lần submit đăng nhập cho mỗi tài khoản trong một lượt. Chỉ chạy simulator/Maestro khi lead xác nhận simulator đã được trả cho QA.

## Preflight (chỉ chạy khi được giao simulator)

`preflight.sh` nhận UDID iPhone 16 làm tham số đầu. Mặc định script tìm `ios/project.yml` trong repo; nếu repo không có, dùng checkout hiện tại ở `~/.paseo/worktrees/0fvr24l0/mvp-ios/ios/project.yml`. Nếu worktree đổi chỗ, truyền đường dẫn đầy đủ tới `project.yml` làm tham số thứ hai. Script đọc `PRODUCT_BUNDLE_IDENTIFIER` trong app target; nếu YAML không khai báo trực tiếp, theo `configFiles.Staging` từ YAML rồi đọc xcconfig được include (hiện `Config/Base.xcconfig`). Sau đó kiểm tra còn ít nhất 1,5 GiB, xác nhận UDID là iPhone 16 booted, liệt kê bundle ID đã cài và gỡ app không phải app đích hoặc `com.apple.*`. Script mở app, kiểm hierarchy tạm để vào màn đăng nhập; nếu phiên teacher còn hoạt động, chạy subflow đăng xuất, rồi submit `auth/login.yaml` đúng một lần. Log, junit, hierarchy và ảnh tạm bị xoá; lỗi đăng xuất/đăng nhập dừng script, không thử lần nữa.

Ví dụ lệnh khi lead giao simulator (chưa chạy): `bash qa/maestro/ios/preflight.sh <UDID> [path/to/ios/project.yml]`.
