# Worker · Vẽ lại Mít 1 sao (hơi buồn)

Ghi CHỈ `plans/20261021-mvp/design/mascot-v2/concepts/mit/poses/sao-1.png` (ghi đè) và thêm một dòng vào `poses/prompts.md` (prompt nguyên văn). Không sửa gì khác.

Người dùng yêu cầu: tư thế 1 sao của Mít phải HƠI BUỒN (cập nhật theo yêu cầu mới, thay bản mỉm cười cũ).

Dùng built-in `image_gen` của Codex (skill `imagegen`), tham chiếu `concepts/mit/main.png` và `poses/sao-2.png` để giữ nhân vật GIỐNG HỆT (gà con vàng tròn, 3 chỏm lông, mỏ cam, cặp sách xanh `#2F5BEA`, 3D mềm, nền kem phẳng `#FFFDF4`, toàn thân).

Biểu cảm 1 sao: buồn nhẹ, đáng thương dễ thương: lông mày hơi cụp xuống phía ngoài, mắt to hơi nhìn xuống/nhìn lên ngập ngừng, miệng nhỏ mím nhẹ hoặc cong xuống rất ít, đầu hơi cúi, hai cánh chắp trước ngực hoặc ôm quai cặp, 1 ngôi sao vàng nhỏ bên cạnh. KHÔNG khóc, KHÔNG giọt nước mắt, KHÔNG giận, KHÔNG đáng sợ; vẫn ấm áp, khích lệ (trẻ 6–11 tuổi nhìn không thấy bị chê). Không chữ/logo.

PNG 1024×1024 (≤ 1,2 MB, `sips -Z 1024`). Tự kiểm: mở ảnh, đúng biểu cảm và cùng nhân vật; sai thì tạo lại. Nếu gặp lỗi "model at capacity", thử lại tối đa 3 lần rồi báo BLOCKED. Không hỏi lại người dùng, không dừng chờ trả lời: yêu cầu "hơi buồn" ở trên là chắc chắn.

Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.
