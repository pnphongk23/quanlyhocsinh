import { describe, expect, it } from "vitest";
import { createSeed } from "../../data/seed";
import { classScoreReport, studentScoreReport } from "./scoreReport";

/** Đặt điểm các bài của một em theo thứ tự bài; null = chưa có điểm. */
function setScores(
  state: ReturnType<typeof createSeed>,
  studentId: string,
  values: Array<number | null>,
) {
  const scores = state.scores
    .filter((score) => score.studentId === studentId)
    .sort((a, b) => a.testId.localeCompare(b.testId));
  scores.forEach((score, index) => {
    score.value = values[index] ?? null;
  });
}

/** Đổi thang điểm của một bài trong dữ liệu mẫu (mặc định mọi bài là thang 10). */
function setTestMax(
  state: ReturnType<typeof createSeed>,
  testId: string,
  max: number,
) {
  const test = state.tests.find((item) => item.id === testId);
  if (!test) throw new Error("Thiếu bài kiểm tra mẫu");
  test.max = max;
}

describe("Báo cáo điểm một học sinh", () => {
  it("xếp bài theo ngày và tính chênh lệch phần trăm thang của bài gần nhất", () => {
    const state = createSeed();
    const report = studentScoreReport(state, "6a-student-0");
    expect(report.rows.map((row) => row.test.id)).toEqual([
      "6a-test-0",
      "6a-test-1",
      "6a-test-2",
      "6a-test-3",
    ]);
    expect(report.rows.map((row) => row.value)).toEqual([6, 7, 8, 9]);
    // 8/10 → 9/10 là tăng 10% thang.
    expect(report.latestDelta).toBe(10);
  });

  it("chỉ có điểm hoặc chưa có điểm, không còn trường trung bình", () => {
    const state = createSeed();
    const report = studentScoreReport(state, "6a-student-3");
    // Mỗi dòng chỉ gồm bài và điểm (null = chưa có điểm), không còn `state`/`absent`.
    expect(Object.keys(report.rows[3])).toEqual(["test", "value"]);
    expect(Object.keys(report)).toEqual(["student", "rows", "latestDelta"]);
    expect(report).not.toHaveProperty("average");
  });

  it("bài không có điểm (kể cả vắng buổi kiểm tra) không tạo chênh lệch", () => {
    const state = createSeed();
    const report = studentScoreReport(state, "6a-student-3");
    expect(report.rows[3].value).toBeNull();
    // Bài gần nhất chưa có điểm nên không có chênh lệch.
    expect(report.latestDelta).toBeNull();
  });

  it("không có bản ghi điểm và có bản ghi điểm rỗng là như nhau", () => {
    const state = createSeed();
    const withRecord = studentScoreReport(state, "6a-student-3");
    state.scores = state.scores.filter(
      (score) => score.id !== "6a-student-3-score-3",
    );
    const withoutRecord = studentScoreReport(state, "6a-student-3");
    expect(withoutRecord.rows.map((row) => row.value)).toEqual(
      withRecord.rows.map((row) => row.value),
    );
    expect(withoutRecord.latestDelta).toBe(withRecord.latestDelta);
  });

  it("coi bài không có bản ghi điểm là chưa có điểm", () => {
    const state = createSeed();
    state.scores = state.scores.filter(
      (score) => score.id !== "6a-student-0-score-3",
    );
    const report = studentScoreReport(state, "6a-student-0");
    expect(report.rows[3].value).toBeNull();
    expect(report.latestDelta).toBeNull();
  });

  it("chưa đủ hai bài có điểm thì không có chênh lệch", () => {
    const state = createSeed();
    setScores(state, "6a-student-0", [null, null, null, 9]);
    expect(studentScoreReport(state, "6a-student-0").latestDelta).toBeNull();
  });

  it("latestDelta chỉ tính khi bài gần nhất có điểm", () => {
    const state = createSeed();
    // 6a-student-4: ba bài có điểm rồi bài cuối chưa có điểm.
    expect(studentScoreReport(state, "6a-student-4").latestDelta).toBeNull();

    // 6a-student-2: bài cuối 6/10 sau bài 10/10 → −40%.
    expect(studentScoreReport(state, "6a-student-2").latestDelta).toBe(-40);
  });

  it("chênh lệch tính theo phần trăm thang của từng bài, không theo điểm thô", () => {
    const state = createSeed();
    // Bài trước 50/50 (100%), bài gần nhất 8/10 (80%) → giảm 20% thang.
    setTestMax(state, "6a-test-2", 50);
    setScores(state, "6a-student-0", [null, null, 50, 8]);
    expect(studentScoreReport(state, "6a-student-0").latestDelta).toBe(-20);
  });

  it("chênh lệch phần trăm được làm tròn số nguyên", () => {
    const state = createSeed();
    // 8/10 (80%) → 14/15 (93,3%) → +13.
    setTestMax(state, "6a-test-3", 15);
    setScores(state, "6a-student-0", [null, null, 8, 14]);
    expect(studentScoreReport(state, "6a-student-0").latestDelta).toBe(13);
  });

  it("bài đã lưu trữ biến mất khỏi báo cáo của một học sinh", () => {
    const state = createSeed();
    const before = studentScoreReport(state, "6a-student-0");
    expect(before.rows).toHaveLength(4);

    state.tests.find((test) => test.id === "6a-test-1")!.archived = true;
    const after = studentScoreReport(state, "6a-student-0");
    // Giảm đúng một bài, không còn điểm 7 của bài đã lưu trữ.
    expect(after.rows).toHaveLength(before.rows.length - 1);
    expect(after.rows.map((row) => row.test.id)).toEqual([
      "6a-test-0",
      "6a-test-2",
      "6a-test-3",
    ]);
    expect(after.rows.some((row) => row.value === 7)).toBe(false);
  });

  it("báo lỗi khi không tìm thấy học sinh", () => {
    expect(() => studentScoreReport(createSeed(), "khong-co")).toThrow(
      "Không tìm thấy học sinh.",
    );
  });
});

describe("Báo cáo điểm tổng hợp lớp", () => {
  it("chỉ lấy học sinh đang học và không còn khối phân bố", () => {
    const state = createSeed();
    const report = classScoreReport(state, "6a");
    expect(report.students).toHaveLength(9);
    expect(
      report.students.some((item) => item.student.id === "6a-student-9"),
    ).toBe(false);
    expect(Object.keys(report)).toEqual(["students", "progress", "attention"]);
    expect(report).not.toHaveProperty("distribution");
  });

  it("tiến độ nhập điểm từng bài chỉ đếm có điểm và chưa có điểm", () => {
    const state = createSeed();
    const report = classScoreReport(state, "6a");
    expect(report.progress.map((item) => item.test.id)).toEqual([
      "6a-test-0",
      "6a-test-1",
      "6a-test-2",
      "6a-test-3",
    ]);
    expect(
      report.progress.find((item) => item.test.id === "6a-test-3"),
    ).toMatchObject({ scored: 8, missing: 2 });
    expect(Object.keys(report.progress[0])).toEqual([
      "test",
      "scored",
      "missing",
    ]);
  });

  it("danh sách cần chú ý theo từng lý do", () => {
    const state = createSeed();
    expect(
      classScoreReport(state, "6a").attention.map((item) => ({
        name: item.student.name,
        reasons: item.reasons,
      })),
    ).toEqual([
      { name: "Bùi Tuấn Kiệt", reasons: ["Bài gần nhất giảm 40% so với bài trước"] },
      { name: "Lê Khánh Chi", reasons: ["Bài gần nhất giảm 40% so với bài trước"] },
    ]);
  });

  it("cần chú ý khi bài gần nhất giảm từ 20% thang trở lên", () => {
    const state = createSeed();
    setScores(state, "6a-student-0", [8, 8, 8, 6]);
    expect(
      classScoreReport(state, "6a").attention.find(
        (item) => item.student.id === "6a-student-0",
      )?.reasons,
    ).toEqual(["Bài gần nhất giảm 20% so với bài trước"]);
  });

  it("ngưỡng giảm tính theo phần trăm thang của bài", () => {
    const state = createSeed();
    // 9/10 (90%) → 14/20 (70%) → giảm 20% thang dù điểm thô tăng.
    setTestMax(state, "6a-test-3", 20);
    setScores(state, "6a-student-0", [null, null, 9, 14]);
    expect(
      classScoreReport(state, "6a").attention.find(
        (item) => item.student.id === "6a-student-0",
      )?.reasons,
    ).toEqual([
      "Bài gần nhất giảm 20% so với bài trước",
      "2 bài chưa có điểm",
    ]);
  });

  it("giảm dưới 20% thang hoặc bài gần nhất chưa có điểm thì không tính lý do giảm", () => {
    const state = createSeed();
    // Giảm 1.5 điểm trên thang 10 = 15%: chưa tới ngưỡng.
    setScores(state, "6a-student-0", [8, 8, 8, 6.5]);
    expect(
      classScoreReport(state, "6a").attention.some(
        (item) => item.student.id === "6a-student-0",
      ),
    ).toBe(false);

    // Bài gần nhất chưa có điểm: không có "bài gần nhất giảm".
    setScores(state, "6a-student-1", [10, 10, 10, null]);
    expect(
      classScoreReport(state, "6a").attention.find(
        (item) => item.student.id === "6a-student-1",
      )?.reasons,
    ).toBeUndefined();
  });

  it("không còn lý do trung bình dưới 5", () => {
    const state = createSeed();
    setScores(state, "6a-student-0", [4, 4, 4, 4]);
    expect(
      classScoreReport(state, "6a").attention.some(
        (item) => item.student.id === "6a-student-0",
      ),
    ).toBe(false);
    expect(
      classScoreReport(state, "6a")
        .attention.flatMap((item) => item.reasons)
        .join(" ")
        .toLocaleLowerCase("vi"),
    ).not.toContain("trung bình");
  });

  it("cần chú ý khi từ 2 bài chưa có điểm", () => {
    const state = createSeed();
    setScores(state, "6a-student-2", [8, 8, null, null]);
    expect(
      classScoreReport(state, "6a").attention.find(
        (item) => item.student.id === "6a-student-2",
      )?.reasons,
    ).toEqual(["2 bài chưa có điểm"]);
  });

  it("một em có thể có hai lý do, xếp theo thứ tự giảm điểm rồi chưa có điểm", () => {
    const state = createSeed();
    setScores(state, "6a-student-5", [null, null, 6, 1]);
    expect(
      classScoreReport(state, "6a").attention.find(
        (item) => item.student.id === "6a-student-5",
      )?.reasons,
    ).toEqual([
      "Bài gần nhất giảm 50% so với bài trước",
      "2 bài chưa có điểm",
    ]);

    setScores(state, "6a-student-6", [1, null, null, 4]);
    expect(
      classScoreReport(state, "6a").attention.find(
        (item) => item.student.id === "6a-student-6",
      )?.reasons,
    ).toEqual(["2 bài chưa có điểm"]);
  });

  it("bài đã lưu trữ không vào báo cáo, tiến độ hay danh sách cần chú ý", () => {
    const state = createSeed();
    setScores(state, "6a-student-0", [null, null, 8, 9]);
    expect(
      classScoreReport(state, "6a").attention.some(
        (item) => item.student.id === "6a-student-0",
      ),
    ).toBe(true);

    // Lưu trữ hai bài còn thiếu điểm: em này không còn lý do nào.
    state.tests.find((test) => test.id === "6a-test-0")!.archived = true;
    state.tests.find((test) => test.id === "6a-test-1")!.archived = true;
    const report = classScoreReport(state, "6a");
    expect(report.progress.map((item) => item.test.id)).toEqual([
      "6a-test-2",
      "6a-test-3",
    ]);
    expect(
      report.attention.some((item) => item.student.id === "6a-student-0"),
    ).toBe(false);
  });

  it("học sinh chưa có điểm vẫn tính tiến độ", () => {
    const state = createSeed();
    setScores(state, "6a-student-0", [null, null, null, null]);
    const report = classScoreReport(state, "6a");
    expect(
      report.progress.find((item) => item.test.id === "6a-test-3"),
    ).toMatchObject({ scored: 7, missing: 3 });
  });

  it("học sinh đã nghỉ không vào danh sách cần chú ý", () => {
    const state = createSeed();
    for (const score of state.scores)
      if (score.studentId === "6a-student-9") score.value = 2;
    expect(
      classScoreReport(state, "6a").attention.some(
        (item) => item.student.id === "6a-student-9",
      ),
    ).toBe(false);
  });

  it("lớp chưa có điểm vẫn trả báo cáo rỗng", () => {
    const state = createSeed();
    state.scores = [];
    const report = classScoreReport(state, "6a");
    expect(report.students).toHaveLength(9);
    expect(report.attention).toHaveLength(9);
    expect(report.attention[0].reasons).toEqual(["4 bài chưa có điểm"]);
    expect(report.progress[0]).toMatchObject({ scored: 0, missing: 10 });
  });
});
