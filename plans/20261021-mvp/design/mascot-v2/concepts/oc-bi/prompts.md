# Prompt tạo ảnh — Ốc Bi

Ảnh do AI tạo, chưa rà nhãn hiệu/bản quyền.

Công cụ: built-in `image_gen` của Codex. Ảnh tư thế dùng ảnh trước làm tham chiếu nhân vật. Ảnh màn app cuối được ghép bằng Pillow lên screenshot gốc để giao diện không bị biến đổi.

## `main.png`

> Use case: stylized-concept. Asset type: original mascot concept image, main pose. Create Ốc Bi, an original baby snail mascot for a Vietnamese English class app for children aged 6–11: round plump snail, warm cream body, bold blue spiral shell #2F5BEA with only a few simple ABC letterform shapes; two tall soft eye stalks with large friendly eyes and tiny rounded feet. Patient, steady, encouraging. Plain pale warm-cream background, centered full-body front three-quarter view, shell clearly visible, polished soft 3D cartoon, simple smooth forms, gentle shadows, readable at small avatar size. One character only. No accessories or props. No words besides simple ABC shell motif; no logo or watermark. Original design, do not resemble existing mascots or copyrighted characters. No scary features or busy background.

## `vui.png`

> Use case: stylized-concept. Asset type: mascot expression variant. Input image: use the included image as the exact character reference for Ốc Bi; preserve its cream snail body, #2F5BEA spiral shell with ABC marks, rounded eye stalks, face design, proportions, materials, and studio style. Create a separate centered full-body image on the same plain pale warm-cream background. Pose/expression: happy and praising, one small hand raised in a gentle celebratory wave, eyes bright and a warm open smile; communicate encouragement for a small learning success. Keep shell clearly visible. Original child-friendly character, no extra props, no added text, logo, or watermark.

## `dong-vien.png`

> Use case: stylized-concept. Asset type: mascot expression variant. Input image: use the included image as the exact character reference for Ốc Bi; preserve the cream snail body, vivid blue #2F5BEA spiral shell with ABC marks, rounded eye stalks, face, proportions, material, and soft 3D style. Create a separate centered full-body image on the same plain pale warm-cream background. Pose/expression: gently encouraging a child who made a mistake: one small hand extended in a reassuring thumbs-up-like gesture, kind attentive eyes, soft closed smile, relaxed posture. Warm and patient, never sad, disappointed, scolding, or pitying. Keep shell visible. No props, text, logo, watermark, or extra characters.

## `cho.png`

> Use case: stylized-concept. Asset type: mascot idle expression variant. Input image: use included image as exact character reference for Ốc Bi; preserve cream snail body, blue #2F5BEA spiral shell with simple ABC motif, rounded eye stalks, facial design, proportions, smooth soft 3D style. Create a separate centered full-body image on the same plain pale warm-cream background. Pose/expression: waiting in a relaxed seated pose, looking gently curious with eyes glancing slightly upward and a tiny closed-mouth smile, as if ready for the next task. Calm and patient, not bored or sad. Keep full body and shell visible. No props, text, logo, watermark, or extra characters.

## `tren-man-hinh.png`

Nguồn nền: `plans/20261021-mvp/design/prototype-shots/p1/07-btvn-chua-co.png`.

Prompt cắt nền mascot tham chiếu các ảnh Ốc Bi:

> Use case: background-extraction. Asset type: transparent mascot cutout for app compositing. Use the supplied Ốc Bi character images as exact identity references, especially the main pose: preserve its round warm-cream baby snail body, large two stalk eyes, blue #2F5BEA spiral shell with simple ABC shapes, proportions, face, and smooth friendly 3D cartoon finish. Generate one full-body centered Ốc Bi in a calm, gently curious waiting pose with all body and shell visible, facing slightly toward the viewer. True transparent background, clean accurate outer edges, no ground plane or shadow baked in. No props, extra objects, text, logo, watermark, or extra characters. Original character, no resemblance to existing copyrighted mascots.

Ảnh cắt nền được thu nhỏ và ghép ở vùng trống góc dưới bên phải của screenshot bằng Pillow; screenshot gốc được giữ nguyên bên dưới.
