import { describe, expect, it } from "vitest";
import {
  CRITERION_BITS,
  CRITERION_KEYS,
  CRITERION_LABELS,
  DEFAULT_CRITERION_LEVELS,
  LEVEL_LABELS,
  LEVELS,
  SKILL_KEYS,
  SKILL_LABELS,
  TOPIC_LABELS,
  composeComment,
  criteriaFromLevels,
  defaultLevels,
  defaultSkillLevels,
  effortSummary,
  homeworkLevelFromGrades,
  needsWorkCount,
  normalizeGradedSkills,
  normalizeTopics,
  parseLevels,
  parseSkillLevels,
  sameLevels,
  sameSkillLevels,
  starsFromLevels,
  todayTopicsPhrase,
  type Levels,
} from "./criteriaLevels";
import type { HomeworkGrade } from "./types";

const ALL_GOOD: Levels = {
  focus: "good",
  participation: "good",
  mastery: "good",
  notes: "good",
  homework: "good",
};

function grade(level: HomeworkGrade["level"]): HomeworkGrade {
  return { sectionId: `s-${level}`, studentId: "s1", level };
}

describe("hằng số và thứ tự tiêu chí", () => {
  it("giữ đúng thứ tự tiêu chí, bit và nhãn tiếng Việt", () => {
    expect(CRITERION_KEYS).toEqual(["focus", "participation", "mastery", "notes", "homework"]);
    expect(CRITERION_BITS).toEqual({ focus: 1, participation: 2, mastery: 4, notes: 8, homework: 16 });
    expect(CRITERION_LABELS).toEqual({
      focus: "Học tập trung",
      participation: "Tích cực tham gia",
      mastery: "Nắm bài hôm nay",
      notes: "Ghi chép và làm bài trên lớp",
      homework: "Bài tập về nhà",
    });
    expect(LEVELS).toEqual(["good", "ok", "needs_work"]);
    expect(LEVEL_LABELS).toEqual({ good: "Tốt", ok: "Đạt", needs_work: "Cần cố gắng" });
    expect(SKILL_KEYS).toEqual(["vocabulary", "grammar", "listening", "speaking", "reading", "writing"]);
    expect(SKILL_LABELS).toEqual({
      vocabulary: "Từ vựng",
      grammar: "Mẫu câu/Ngữ pháp",
      listening: "Nghe",
      speaking: "Nói",
      reading: "Đọc",
      writing: "Viết",
    });
    expect(TOPIC_LABELS.grammar).toBe("Mẫu câu");
  });
});

describe("phiếu mặc định và BTVN buổi trước", () => {
  it("mặc định: 4 tiêu chí Tốt, Nắm bài Đạt, BTVN Tốt khi chưa chấm/không giao", () => {
    expect(DEFAULT_CRITERION_LEVELS).toEqual({
      focus: "good",
      participation: "good",
      mastery: "ok",
      notes: "good",
      homework: "good",
    });
    expect(defaultLevels(null)).toEqual(DEFAULT_CRITERION_LEVELS);
    expect(defaultLevels([])).toEqual(DEFAULT_CRITERION_LEVELS);
    expect(homeworkLevelFromGrades(undefined)).toBe("good");
  });

  it("ánh xạ Hoàn thành tốt → Tốt, Hoàn thành → Đạt, Chưa hoàn thành → Cần cố gắng", () => {
    expect(homeworkLevelFromGrades([grade("excellent")])).toBe("good");
    expect(homeworkLevelFromGrades([grade("done")])).toBe("ok");
    expect(homeworkLevelFromGrades([grade("not_done")])).toBe("needs_work");
  });

  it("nhiều phần đã chấm lấy mức thấp nhất", () => {
    expect(homeworkLevelFromGrades([grade("excellent"), grade("done")])).toBe("ok");
    expect(homeworkLevelFromGrades([grade("done"), grade("not_done"), grade("excellent")])).toBe("needs_work");
  });

  it("mức kỹ năng mặc định là Đạt", () => {
    expect(defaultSkillLevels([])).toEqual({});
    expect(defaultSkillLevels(["speaking", "reading"])).toEqual({ speaking: "ok", reading: "ok" });
  });
});

describe("criteria bit và sao", () => {
  it("chỉ mức Tốt đặt bit, stars = số mức Tốt", () => {
    expect(criteriaFromLevels(ALL_GOOD)).toBe(31);
    expect(starsFromLevels(ALL_GOOD)).toBe(5);
    expect(criteriaFromLevels(DEFAULT_CRITERION_LEVELS)).toBe(1 + 2 + 8 + 16);
    expect(starsFromLevels(DEFAULT_CRITERION_LEVELS)).toBe(4);
    expect(starsFromLevels({ ...ALL_GOOD, focus: "needs_work", participation: "ok" })).toBe(3);
  });
});

describe("chip Hôm nay học", () => {
  it("lọc khoá hợp lệ, bỏ trùng, giữ thứ tự chọn", () => {
    expect(normalizeTopics(["speaking", "khong_hop_le", "speaking", "vocabulary"])).toEqual([
      "speaking",
      "vocabulary",
    ]);
    expect(normalizeTopics(null)).toEqual([]);
  });

  it("ghép {nội dung}: dấu phẩy + và, không chọn = bài", () => {
    expect(todayTopicsPhrase([])).toBe("bài");
    expect(todayTopicsPhrase(["vocabulary", "grammar"])).toBe("từ vựng và mẫu câu");
    expect(todayTopicsPhrase(["listening", "speaking", "reading"])).toBe("nghe, nói và đọc");
  });

  it("graded_skills chỉ gồm tập con của topics, theo thứ tự kỹ năng cố định", () => {
    expect(normalizeGradedSkills(["writing", "speaking"], ["speaking"])).toEqual(["speaking"]);
    expect(normalizeGradedSkills(["writing"], ["speaking"])).toEqual([]);
    expect(normalizeGradedSkills(["reading", "speaking"], ["speaking", "reading"])).toEqual([
      "speaking",
      "reading",
    ]);
  });
});

describe("ghép câu nhận xét", () => {
  it("gộp mục Tốt thành một câu khen, kèm {nội dung} từ chip", () => {
    expect(composeComment({ levels: ALL_GOOD, topics: ["vocabulary", "grammar"] })).toBe(
      "Con học tập trung, hăng hái tham gia các hoạt động, nắm chắc từ vựng và mẫu câu hôm nay, ghi bài và làm bài trên lớp cẩn thận và làm bài tập về nhà đầy đủ.",
    );
  });

  it("phiếu mặc định: câu khen trước, rồi câu Đạt của Nắm bài", () => {
    expect(composeComment({ levels: DEFAULT_CRITERION_LEVELS, topics: [] })).toBe(
      "Con học tập trung, hăng hái tham gia các hoạt động, ghi bài và làm bài trên lớp cẩn thận và làm bài tập về nhà đầy đủ. Con nắm được phần chính của bài hôm nay, cần ôn thêm cho chắc.",
    );
  });

  it("mỗi mục Đạt/Cần cố gắng một câu theo thứ tự tiêu chí", () => {
    expect(
      composeComment({
        levels: {
          focus: "needs_work",
          participation: "ok",
          mastery: "needs_work",
          notes: "good",
          homework: "good",
        },
        topics: [],
      }),
    ).toBe(
      "Con ghi bài và làm bài trên lớp cẩn thận và làm bài tập về nhà đầy đủ. Con còn hay mất tập trung, nói chuyện riêng, cần nhắc nhở thêm. Con có tham gia hoạt động nhưng chưa chủ động phát biểu. Con chưa nắm vững bài hôm nay, bố mẹ cho con ôn lại nhé.",
    );
  });

  it("không mục nào Tốt thì bỏ câu khen", () => {
    const levels: Levels = {
      focus: "needs_work",
      participation: "needs_work",
      mastery: "needs_work",
      notes: "needs_work",
      homework: "needs_work",
    };
    const text = composeComment({ levels });
    expect(text.startsWith("Con còn hay mất tập trung")).toBe(true);
    expect(text).toContain("Con chưa hoàn thành bài tập về nhà; bố mẹ nhắc con làm bù trước buổi sau nhé.");
  });

  it("kỹ năng Tốt vào câu khen; Đạt/Cần cố gắng sau tiêu chí, chỉ kỹ năng đang chấm", () => {
    const text = composeComment({
      levels: ALL_GOOD,
      topics: [],
      skillLevels: { speaking: "good", reading: "ok", writing: "needs_work" },
      gradedSkills: ["speaking", "reading", "writing"],
    });
    expect(text).toBe(
      "Con học tập trung, hăng hái tham gia các hoạt động, nắm chắc bài hôm nay, ghi bài và làm bài trên lớp cẩn thận, làm bài tập về nhà đầy đủ và nói tốt. Phần đọc con làm được, cần luyện thêm. Phần viết con còn yếu, bố mẹ cho con luyện thêm nhé.",
    );
    expect(text).not.toContain("Phần nói");

    const ungraded = composeComment({
      levels: ALL_GOOD,
      skillLevels: { listening: "good", reading: "needs_work" },
      gradedSkills: ["reading"],
    });
    expect(ungraded).not.toContain("nghe tốt");
    expect(ungraded).toContain("Phần đọc con còn yếu");
  });
});

describe("tóm tắt mục cần cố gắng", () => {
  it("đếm tiêu chí + kỹ năng đang chấm ở mức Cần cố gắng", () => {
    const input = {
      levels: {
        ...ALL_GOOD,
        mastery: "needs_work",
        focus: "needs_work",
      } as Levels,
      skillLevels: { reading: "needs_work", writing: "ok" } as const,
      gradedSkills: ["reading", "writing"] as const,
    };
    expect(needsWorkCount(input)).toBe(3);
    expect(effortSummary(input)).toBe("3 mục cần cố gắng");
    expect(effortSummary({ levels: ALL_GOOD })).toBeNull();
  });
});

describe("đọc và so sánh dữ liệu mức", () => {
  it("parse levels chỉ nhận đủ 5 khoá và mức hợp lệ", () => {
    expect(parseLevels(ALL_GOOD)).toEqual(ALL_GOOD);
    expect(parseLevels({ ...ALL_GOOD, extra: "good" })).toBeNull();
    expect(parseLevels({ focus: "good" })).toBeNull();
    expect(parseLevels({ ...ALL_GOOD, focus: "bad" })).toBeNull();
    expect(parseLevels(null)).toBeNull();
  });

  it("parse skill_levels bỏ khoá lạ, giữ object rỗng hợp lệ", () => {
    expect(parseSkillLevels({ speaking: "good", unknown: "ok" })).toEqual({ speaking: "good" });
    expect(parseSkillLevels({ speaking: "bad", reading: "ok" })).toEqual({ reading: "ok" });
    expect(parseSkillLevels({})).toEqual({});
    expect(parseSkillLevels([])).toBeNull();
    expect(parseSkillLevels(null)).toBeNull();
  });

  it("so sánh mức để tránh lệnh thừa", () => {
    expect(sameLevels(ALL_GOOD, { ...ALL_GOOD })).toBe(true);
    expect(sameLevels(ALL_GOOD, { ...ALL_GOOD, notes: "ok" })).toBe(false);
    expect(sameLevels(null, null)).toBe(true);
    expect(sameLevels(null, ALL_GOOD)).toBe(false);
    expect(sameSkillLevels({ speaking: "ok" }, { speaking: "ok" })).toBe(true);
    expect(sameSkillLevels({ speaking: "ok" }, { speaking: "good" })).toBe(false);
    expect(sameSkillLevels({ speaking: "ok" }, { reading: "ok" })).toBe(false);
    expect(sameSkillLevels({}, undefined)).toBe(true);
  });
});
