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

describe("Báo cáo điểm một học sinh", () => {
  it("xếp bài theo ngày, tính TB, xu hướng và chênh lệch bài gần nhất", () => {
    const state = createSeed();
    const report = studentScoreReport(state, "6a-student-0");
    expect(report.rows.map((row) => row.test.id)).toEqual([
      "6a-test-0",
      "6a-test-1",
      "6a-test-2",
      "6a-test-3",
    ]);
    expect(report.rows.map((row) => row.value)).toEqual([6, 7, 8, 9]);
    expect(report.trend).toEqual([6, 7, 8, 9]);
    expect(report.average).toBe(7.5);
    expect(report.latestDelta).toBe(1);
  });

  it("chỉ có điểm hoặc chưa có điểm: không còn trạng thái Vắng thi", () => {
    const state = createSeed();
    const report = studentScoreReport(state, "6a-student-3");
    // Mỗi dòng chỉ gồm bài và điểm (null = chưa có điểm), không còn `state`/`absent`.
    expect(Object.keys(report.rows[3])).toEqual(["test", "value"]);
    expect(Object.keys(report)).toEqual([
      "student",
      "rows",
      "average",
      "trend",
      "latestDelta",
    ]);
  });

  it("bài không có điểm (kể cả vắng buổi kiểm tra) không tính vào TB", () => {
    const state = createSeed();
    const report = studentScoreReport(state, "6a-student-3");
    expect(report.rows[3].value).toBeNull();
    expect(report.trend).toEqual([9, 10, 6]);
    expect(report.average).toBeCloseTo(25 / 3);
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
    expect(withoutRecord.average).toBe(withRecord.average);
    expect(withoutRecord.latestDelta).toBe(withRecord.latestDelta);
  });

  it("coi bài không có bản ghi điểm là chưa có điểm", () => {
    const state = createSeed();
    state.scores = state.scores.filter(
      (score) => score.id !== "6a-student-0-score-3",
    );
    const report = studentScoreReport(state, "6a-student-0");
    expect(report.rows[3].value).toBeNull();
    expect(report.average).toBe(7);
  });

  it("chưa đủ hai bài có điểm thì không có chênh lệch", () => {
    const state = createSeed();
    setScores(state, "6a-student-0", [null, null, null, 9]);
    const report = studentScoreReport(state, "6a-student-0");
    expect(report.trend).toEqual([9]);
    expect(report.average).toBe(9);
    expect(report.latestDelta).toBeNull();
  });

  it("latestDelta chỉ tính khi bài gần nhất có điểm", () => {
    const state = createSeed();
    // 6a-student-4: ba bài có điểm rồi bài cuối chưa có điểm.
    expect(studentScoreReport(state, "6a-student-4").latestDelta).toBeNull();

    // 6a-student-2: bài cuối có điểm 6 sau bài 10 → −4.
    expect(studentScoreReport(state, "6a-student-2").latestDelta).toBe(-4);
  });

  it("báo lỗi khi không tìm thấy học sinh", () => {
    expect(() => studentScoreReport(createSeed(), "khong-co")).toThrow(
      "Không tìm thấy học sinh.",
    );
  });
});

describe("Báo cáo điểm tổng hợp lớp", () => {
  it("chỉ lấy học sinh đang học, phân bố theo dải và không có TB lớp", () => {
    const state = createSeed();
    const report = classScoreReport(state, "6a");
    expect(report.students).toHaveLength(9);
    expect(
      report.students.some((item) => item.student.id === "6a-student-9"),
    ).toBe(false);
    expect(report.distribution).toEqual([
      { label: "< 5", count: 0 },
      { label: "5 – 6.4", count: 0 },
      { label: "6.5 – 7.9", count: 3 },
      { label: "8 – 10", count: 6 },
    ]);
    expect(
      report.distribution.reduce((total, band) => total + band.count, 0),
    ).toBe(
      report.students.filter((item) => item.average !== null).length,
    );
    expect(Object.keys(report)).toEqual([
      "students",
      "distribution",
      "progress",
      "attention",
    ]);
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
      { name: "Bùi Tuấn Kiệt", reasons: ["Bài gần nhất giảm 4.0 điểm"] },
      { name: "Lê Khánh Chi", reasons: ["Bài gần nhất giảm 4.0 điểm"] },
    ]);
  });

  it("cần chú ý khi trung bình dưới 5", () => {
    const state = createSeed();
    setScores(state, "6a-student-0", [4, 4, 4, 4]);
    expect(
      classScoreReport(state, "6a").attention.find(
        (item) => item.student.id === "6a-student-0",
      )?.reasons,
    ).toEqual(["Trung bình 4.0, dưới 5"]);
  });

  it("cần chú ý khi bài gần nhất giảm từ 2 điểm trở lên", () => {
    const state = createSeed();
    setScores(state, "6a-student-0", [8, 8, 8, 6]);
    expect(
      classScoreReport(state, "6a").attention.find(
        (item) => item.student.id === "6a-student-0",
      )?.reasons,
    ).toEqual(["Bài gần nhất giảm 2.0 điểm"]);
  });

  it("giảm dưới 2 điểm hoặc bài gần nhất chưa có điểm thì không tính lý do giảm", () => {
    const state = createSeed();
    // Giảm 1.5 điểm: chưa tới ngưỡng.
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

  it("cần chú ý khi từ 2 bài chưa có điểm", () => {
    const state = createSeed();
    setScores(state, "6a-student-2", [8, 8, null, null]);
    expect(
      classScoreReport(state, "6a").attention.find(
        (item) => item.student.id === "6a-student-2",
      )?.reasons,
    ).toEqual(["2 bài chưa có điểm"]);
  });

  it("một em có thể có nhiều lý do, xếp theo thứ tự TB, giảm điểm, chưa có điểm", () => {
    const state = createSeed();
    setScores(state, "6a-student-5", [null, null, 6, 1]);
    expect(
      classScoreReport(state, "6a").attention.find(
        (item) => item.student.id === "6a-student-5",
      )?.reasons,
    ).toEqual([
      "Trung bình 3.5, dưới 5",
      "Bài gần nhất giảm 5.0 điểm",
      "2 bài chưa có điểm",
    ]);

    setScores(state, "6a-student-6", [1, null, null, 4]);
    expect(
      classScoreReport(state, "6a").attention.find(
        (item) => item.student.id === "6a-student-6",
      )?.reasons,
    ).toEqual(["Trung bình 2.5, dưới 5", "2 bài chưa có điểm"]);
  });

  it("học sinh chưa có TB không vào dải nào nhưng vẫn tính tiến độ", () => {
    const state = createSeed();
    setScores(state, "6a-student-0", [null, null, null, null]);
    const report = classScoreReport(state, "6a");
    expect(
      report.students.find((item) => item.student.id === "6a-student-0")
        ?.average,
    ).toBeNull();
    expect(
      report.distribution.reduce((total, band) => total + band.count, 0),
    ).toBe(8);
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

  it("lớp chưa có điểm vẫn trả báo cáo rỗng theo dải", () => {
    const state = createSeed();
    state.scores = [];
    const report = classScoreReport(state, "6a");
    expect(report.distribution.map((band) => band.count)).toEqual([0, 0, 0, 0]);
    expect(report.attention).toHaveLength(9);
    expect(report.attention[0].reasons).toEqual(["4 bài chưa có điểm"]);
    expect(report.progress[0]).toMatchObject({ scored: 0, missing: 10 });
  });
});
