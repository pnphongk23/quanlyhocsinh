# Prompt tạo ảnh — Mít

Ảnh do AI tạo, chưa rà nhãn hiệu/bản quyền.

Các prompt dưới đây dùng built-in `image_gen`. Ảnh `vui.png`, `dong-vien.png`, `cho.png` và ảnh cutout dùng ảnh `main.png` làm ảnh tham chiếu để giữ nhận diện.

## `main.png`

```text
Use case: stylized-concept. Asset type: original mascot main PNG. Primary request: Create Mít, an original cute round chick like a tiny jackfruit, sunny yellow, chibi with a bigger head than body, friendly large dark simple eyes, tiny orange beak, tiny wings and feet, wearing a small vivid blue #2F5BEA backpack. Playful and curious. Scene: solid warm ivory background. Full-body standing open pose, centered with margin, square composition. Polished clean 3D cartoon illustration, soft studio light, simple smooth shapes, crisp silhouette recognizable at 24–48 px. Invent an original character; no similarity to existing copyrighted birds, chicks, mascots or characters. No text, logo, watermark, props or other characters.
```

## `vui.png`

```text
Use case: stylized-concept. Asset type: expressive mascot pose variant PNG. Input image: Image 1 is the final character identity reference; preserve Mít's exact sunny-yellow round chick design, larger chibi head, three-feather tuft, large dark eyes, tiny orange beak, tiny orange feet, and vivid blue #2F5BEA backpack and body proportions. Primary request: show the same Mít celebrating a correct answer with both little wings raised high, bright delighted eyes, a joyful open tiny beak, and a lively slight bounce. Scene/backdrop: same solid warm ivory background as the reference. Composition: single full-body character centered with feet and wing tips visible, square image, generous margin, readable at 24–48 px. Style: same polished clean 3D cartoon, soft studio light and smooth simple shapes as reference. Constraints: retain exact character identity and colors; friendly child-appropriate expression. No stars, confetti, text, logo, watermark, extra objects or characters; no copyrighted character resemblance.
```

## `dong-vien.png`

```text
Use case: stylized-concept. Asset type: encouraging mascot pose variant PNG. Input image: Image 1 is the final character identity reference; preserve Mít's exact sunny-yellow round chick design, larger chibi head, three-feather tuft, large dark eyes, tiny orange beak, tiny orange feet, and vivid blue #2F5BEA backpack and body proportions. Primary request: show the same Mít gently encouraging a learner after a mistake: one little wing held out in a kind inviting gesture, the other near its chest, warm reassuring smile, attentive curious eyes, calm friendly stance. The pose should say 'let's try again' without words; no sadness or disappointment. Scene/backdrop: same solid warm ivory background as reference. Composition: single full-body character centered with feet visible, square image, generous margin, recognizable at 24–48 px. Style: same polished clean 3D cartoon, soft studio light and smooth simple shapes as reference. Constraints: retain identity and colors; caring and upbeat for ages 6–11. No text, logo, watermark, extra objects or characters; no copyrighted character resemblance.
```

## `cho.png`

```text
Use case: stylized-concept. Asset type: waiting mascot pose variant PNG for an empty/idle state. Input image: Image 1 is the final character identity reference; preserve Mít's exact sunny-yellow round chick design, larger chibi head, three-feather tuft, large dark eyes, tiny orange beak, tiny orange feet, and vivid blue #2F5BEA backpack and body proportions. Primary request: show the same Mít waiting with a mildly curious relaxed expression, head tipped slightly to one side and one wing lifted near its cheek as if wondering what comes next; beak closed in a tiny soft smile. Scene/backdrop: same solid warm ivory background as reference. Composition: single full-body character centered with feet visible, square image, generous margin, recognizable at 24–48 px. Style: same polished clean 3D cartoon, soft studio light and smooth simple shapes as reference. Constraints: retain identity and colors; no sadness or boredom that feels negative, no yawn, no props, no text, logo, watermark or other characters; no copyrighted character resemblance.
```

## `tren-man-hinh.png`

```text
Use case: stylized-concept. Asset type: transparent mascot sticker cutout for compositing on a desktop class-session screen. Input image: Image 1 is the final character identity reference; preserve Mít's exact sunny-yellow round chick design, larger chibi head, three-feather tuft, large dark eyes, tiny orange beak, tiny orange feet, and vivid blue #2F5BEA backpack and body proportions. Primary request: create the same Mít in a friendly small wave, full body, both feet visible, smiling warmly and looking at the viewer. Scene/backdrop: genuinely transparent background, isolated character with clean natural edges and no floor shadow. Composition: one character centered, full body, square, generous margin; suitable to display at about 250 px tall over a light app UI. Style: same polished clean 3D cartoon as the reference, soft even light, simple shapes. Constraints: character only; preserve identity and colors; transparent pixels around all edges; no text, logo, watermark, props, background, extra objects or characters; no copyrighted character resemblance.
```

Cutout trong suốt trên được ghép bằng Pillow lên bản sao `plans/20261021-mvp/design/prototype-shots/p1/01-buoi-hoc.png`, tại góc dưới bên phải bên dưới thẻ “Lịch lặp” (kích thước mascot khoảng 330 px trước khi thu ảnh toàn màn hình). Ảnh prototype gốc được giữ nguyên.
