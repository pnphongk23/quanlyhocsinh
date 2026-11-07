import { describe, expect, it } from "vitest";
import { cleanCriteriaText, codePointLength, normalizeCriteria, validateCriteria, type CriteriaDraft } from "./criteriaSetModel";

const criterion = (name: string, overrides: Partial<CriteriaDraft> = {}): CriteriaDraft => ({
  name,
  texts: { good: "Câu tốt.", ok: "Câu đạt.", needs_work: "Câu cần cố gắng." },
  default_level: "good",
  homework: false,
  ...overrides,
});

describe("criteria set model", () => {
  it("accepts one and eight criteria", () => {
    expect(validateCriteria([criterion("Một")])).toEqual([]);
    expect(validateCriteria(Array.from({ length: 8 }, (_, index) => criterion(`Mục ${index + 1}`)))).toEqual([]);
  });

  it("validates trimmed NFC text by Unicode code point", () => {
    expect(cleanCriteriaText("  e\u0301  ")).toBe("é");
    expect(codePointLength("😀".repeat(200))).toBe(200);
    expect(validateCriteria([criterion("T".repeat(41))])[0]).toMatchObject({ field: "name", reason: "name_length" });
    expect(validateCriteria([criterion("Emoji", { texts: { good: "😀".repeat(201), ok: "Đạt", needs_work: "Cố gắng" } })])[0]).toMatchObject({ field: "good", reason: "text_length" });
  });

  it("rejects duplicate names and more than one homework criterion", () => {
    const items = [criterion("Độ tập trung", { homework: true }), criterion("đỘ TẬP TRUNG", { homework: true })];
    expect(validateCriteria(items).map((item) => item.reason)).toEqual(["name_duplicate", "homework_multiple"]);
  });

  it("normalizes the teacher Thu six criterion set without changing its text", () => {
    const thu = [
      criterion("Độ tập trung", { texts: { good: "Con tập trung, chú ý nghe giảng.", ok: "Con thỉnh thoảng còn mất tập trung, còn phải nhắc nhở.", needs_work: "Con hay nói chuyện riêng trong giờ, cô phải nhắc nhiều. Cần chú ý hơn." } }),
      criterion("Sự tích cực tham gia bài học", { texts: { good: "Con tập trung, sôi nổi, hăng hái phát biểu.", ok: "Con có tham gia hoạt động khi được yêu cầu, chưa mạnh dạn chủ động.", needs_work: "Con hơi trầm, còn rụt rè, cần mạnh dạn sôi nổi hơn." } }),
      criterion("Ghi chép bài", { texts: { good: "Con ghi chép bài đầy đủ, cẩn thận.", ok: "Con ghi chép bài nhưng còn ẩu, cần cẩn thận hơn.", needs_work: "Con chưa chủ động ghi chép bài, cô phải nhắc nhở." } }),
      criterion("Phản xạ nói Tiếng Anh", { texts: { good: "Con phản xạ nhanh, tự tin nói câu hoàn chỉnh, phát âm rõ.", ok: "Con trả lời được khi cô gợi ý, cần tự tin hơn.", needs_work: "Con còn ngại nói, cần luyện tập các câu đã học ở nhà." } }),
      criterion("Nhớ từ và cấu trúc câu", { texts: { good: "Con nhớ tốt từ vựng và cấu trúc câu, vận dụng đúng khi trả lời.", ok: "Con nhớ từ vựng và cấu trúc câu nhưng chưa chắc chắn, đôi khi còn nhầm.", needs_work: "Con chưa nhớ từ và câu của bài. Cần ôn tập nghiêm túc." } }),
      criterion("Làm bài tập về nhà", { texts: { good: "Con làm bài tập đầy đủ, cẩn thận.", ok: "Con có làm bài tập nhưng chưa đầy đủ.", needs_work: "Con chưa làm bài về nhà, bố mẹ nhắc con làm bài trước buổi học sau." }, homework: true }),
    ];
    expect(validateCriteria(thu)).toEqual([]);
    expect(normalizeCriteria(thu)).toEqual(thu);
  });
});
