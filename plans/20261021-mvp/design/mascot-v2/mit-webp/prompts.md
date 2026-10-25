# Prompt ảnh Mít WebP

Quy trình hiện tại (2026-10-25): tham chiếu **chỉ là PNG gốc lông xù 3D trong `mit-webp/src/`**, gồm `sao-1.png`, `sao-2.png`, `sao-3.png`; có thể thêm `khen.png`, `main.png`. Không dùng `mit/_preview/` làm tham chiếu. Ảnh do built-in `image_gen` của Codex tạo ở 1254 × 1254 px, thu về PNG nguồn 1024 × 1024 RGB, nền kem #FFFDF4.

Các prompt khen/động viên/đang tải/avatar bên dưới là lịch sử đã dùng với `concepts/mit/main.png`.

## `khen.png`

```text
Use case: stylized-concept
Asset type: 1024x1024 source PNG character pose for a Vietnamese classroom app mascot
Input images: Image 1 is the exact character identity and style reference. Reproduce the same chick character faithfully.
Scene/backdrop: flat uniform warm cream #FFFDF4, no texture or gradient.
Subject: the same small fluffy yellow chick as reference, round oversized head, exactly three soft feather tufts, huge glossy brown eyes with white highlights, warm orange-pink cheeks, orange beak and feet, vivid blue #2F5BEA backpack with visible straps and small buckle.
Style/medium: soft polished 3D children's animation render, fine soft feather texture, warm gentle studio light.
Composition/framing: full body centered with comfortable margin; character jumping joyfully upward, BOTH wings raised high, open wide happy smile, sparkling eyes. A few small golden stars float around the character without covering its face.
Lighting/mood: soft, warm, bright celebratory.
Color palette: yellow chick, orange details, blue backpack, cream background.
Constraints: Keep the character recognizably identical to reference in colors, proportions, face, three tufts, and backpack. 1024x1024 square image. No text, no logo, no watermark, no heavy cast shadow.
Avoid: extra characters, extra accessories, dark shadows, cut-off limbs, stars over face, different feather tuft count.
```

## `dong-vien.png`

```text
Use case: stylized-concept
Asset type: 1024x1024 source PNG character pose for a Vietnamese classroom app mascot
Input images: Image 1 is the exact character identity and style reference. Reproduce the same chick character faithfully.
Scene/backdrop: flat uniform warm cream #FFFDF4, no texture or gradient.
Subject: the same small fluffy yellow chick as reference, round oversized head, exactly three soft feather tufts, huge glossy brown eyes with white highlights, warm orange-pink cheeks, orange beak and feet, vivid blue #2F5BEA backpack with visible straps and small buckle.
Style/medium: soft polished 3D children's animation render, fine soft feather texture, warm gentle studio light.
Composition/framing: full body centered with comfortable margin. The chick gently tilts its head, places one wing over its chest, and has softly curved, gently closed smiling eyes; warm reassuring expression, kind and encouraging.
Lighting/mood: soft, warm, calm and caring.
Color palette: yellow chick, orange details, blue backpack, cream background.
Constraints: Keep the character recognizably identical to reference in colors, proportions, face, three tufts, and backpack. Make the pose and eyes clearly different from the reference's upright open-eyed main pose. 1024x1024 square image. No text, no logo, no watermark, no heavy cast shadow.
Avoid: sadness, scolding, disapproval, tears, extra characters, extra accessories, dark shadows, cut-off limbs.
```

## `dang-tai.png`

```text
Use case: stylized-concept
Asset type: 1024x1024 source PNG character pose for a Vietnamese classroom app mascot
Input images: Image 1 is the exact character identity and style reference. Reproduce the same chick character faithfully.
Scene/backdrop: flat uniform warm cream #FFFDF4, no texture or gradient.
Subject: the same small fluffy yellow chick as reference, round oversized head, exactly three soft feather tufts, huge glossy brown eyes with white highlights, warm orange-pink cheeks, orange beak and feet, vivid blue #2F5BEA backpack with visible straps and small buckle.
Style/medium: soft polished 3D children's animation render, fine soft feather texture, warm gentle studio light.
Composition/framing: full body centered with comfortable margin. The chick is running eagerly, body leaning slightly forward, one orange foot raised, both wings waving as it runs; energetic friendly expression.
Lighting/mood: soft, warm, lively and eager.
Color palette: yellow chick, orange details, blue backpack, cream background.
Constraints: Keep the character recognizably identical to reference in colors, proportions, face, three tufts, and backpack. 1024x1024 square image. No text, no logo, no watermark, no heavy cast shadow.
Avoid: extra characters, extra accessories, dark shadows, cut-off limbs.
```

## `avatar.png`

```text
Use case: stylized-concept
Asset type: 1024x1024 source PNG avatar crop for a Vietnamese classroom app mascot
Input images: Image 1 is the exact character identity and style reference. Reproduce the same chick character faithfully.
Scene/backdrop: flat uniform warm cream #FFFDF4, no texture or gradient.
Subject: close-up of the same small fluffy yellow chick, showing the head and just a little shoulder only (not full body), exactly three soft feather tufts, very large glossy brown eyes with clear white highlights, orange beak, warm orange-pink cheeks. Keep a small visible hint of the blue #2F5BEA backpack at the shoulder if it fits.
Style/medium: soft polished 3D children's animation render, fine soft feather texture, warm gentle studio light.
Composition/framing: centered face close-up, friendly open-eyed smile, head and a little shoulder fill the square frame while keeping all three tufts and cheeks in frame. Face must remain readable when reduced to 32–48 px.
Lighting/mood: soft, warm and welcoming.
Color palette: yellow chick, orange details, subtle blue backpack hint, cream background.
Constraints: Keep the chick recognizably identical to reference in colors, eye and beak style, three tufts, cheeks, and feather texture. 1024x1024 square image. No text, no logo, no watermark, no heavy cast shadow.
Avoid: full body, cropped tufts, extra characters, extra accessories, dark shadows.
```

Ảnh do AI tạo, chưa rà nhãn hiệu/bản quyền.

## Dáng sao 0 / 4 / 5 · làm lại theo bộ lông xù 3D

Tham chiếu mỗi lần: `src/sao-1.png`, `src/sao-2.png`, `src/sao-3.png`, `src/khen.png`, `src/main.png` (tương đối với `mit-webp/`). Không dùng ảnh phẳng. Công cụ: built-in `image_gen` của Codex, nền không trong suốt để khớp nguồn cũ.

Prompt chung:

```text
Create ONE new full-body pose of EXACTLY the same Mít chick in the five original PNG references. Preserve polished fluffy 3D children's animation rendering, fine soft yellow feather fibers, huge round head and small plump body, exactly THREE soft feather tufts, glossy brown eyes with white surrounds and matching reflections, rounded orange beak with nostril dots, orange three-toed feet and warm orange-pink cheek blush. Same royal blue backpack, padded blue straps and buckles, backpack visible on viewer's left. Same slight three-quarter front view, proportions and warm soft studio light. Full body and all stars inside comfortable margins. Flat uniform warm cream #FFFDF4 square background, no scene or ground shadow. No text, logo, watermark, extra characters or accessories. Do not make flat illustration, vector, sticker or line art.
```

Biến thể biểu cảm thêm vào prompt chung:

- `sao-0.png`: standing quietly, both feet on ground, wings holding backpack straps; beak gently closed, neutral/mildly downcast expression, subtly raised inner eyebrows and kind eyes. No tears, anger, fear or exaggerated sadness. ZERO stars or floating ornaments.
- `sao-4.png`: a joyful airborne hop, both wings spread upwards higher than level 3, one foot kicked up, the other pointing down; happy bright open brown eyes, cheerful eyebrows, broad smiling beak and tongue. EXACTLY FOUR puffy golden five-point stars, two each side, separated from crest/face/wings.
- `sao-5.png`: utmost happiness in the spirit of khen, bigger jump, both wings raised, two feet kicked apart; eyes softly squeezed shut into naturally rendered smiling eyelids and a wide laughing beak. EXACTLY FIVE glossy golden five-point stars, one above and two each side; no extra confetti/rays.

Xuất bằng `tools/make-webp.py` như bộ cũ: WebP RGBA cạnh dài 256/512 px, quality 82, method 6, alpha quality 90; tên `mit-sao-N.webp` và `mit-sao-N@2x.webp`. Duyệt `_compare-0-5.png` (một hàng WebP thật 0–5) trước khi đưa vào app.
