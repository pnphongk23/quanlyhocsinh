import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { createSeed } from "../../data/seed";
import { replaceStore } from "../../data/store";
import ScoreReportPage from "./ScoreReportPage";
import StudentScoreReportPage from "./StudentScoreReportPage";
import TestScoresPage from "./TestScoresPage";

function render(path: string, route: string, page: React.ReactElement): string {
  const router = createMemoryRouter([{ path: route, element: page }], {
    initialEntries: [path],
  });
  return renderToStaticMarkup(<RouterProvider router={router} />);
}

const report = () =>
  render("/lop/6a/bao-cao-diem", "/lop/:classId/bao-cao-diem", <ScoreReportPage />);

const studentReport = (studentId: string) =>
  render(
    `/lop/6a/bao-cao-diem/${studentId}`,
    "/lop/:classId/bao-cao-diem/:studentId",
    <StudentScoreReportPage />,
  );

describe("màn báo cáo điểm không còn trạng thái Vắng thi", () => {
  it("Cần chú ý có câu quy tắc mới với đúng hai lý do", () => {
    replaceStore(createSeed());
    const html = report();
    expect(html).toContain("Cần chú ý");
    expect(html).toContain(
      "Gồm em có: bài gần nhất giảm từ 20% thang trở lên so với bài có điểm trước đó; hoặc từ 2 bài chưa có điểm.",
    );
    expect(html).toContain("Bài gần nhất giảm 40% so với bài trước");
    expect(html).toContain("có điểm ·");
    expect(html).toContain("chưa có điểm");
    expect(html).not.toMatch(/vắng thi/i);
    expect(html).not.toContain("chưa nhập");
    expect(html).not.toContain("dưới 5");
  });

  it("báo cáo điểm lớp bỏ hẳn khối phân bố và mọi chỗ ghi trung bình", () => {
    replaceStore(createSeed());
    const html = report();
    expect(html).not.toContain("phân bố");
    expect(html).not.toContain("Trung bình");
    expect(html).not.toContain("TB");
    // Các khối còn lại vẫn đủ.
    expect(html).toContain("Tiến độ nhập điểm");
    expect(html).toContain("Học sinh · 9");
    expect(html).toContain("Tăng 10% so với bài trước");
    expect(html).toContain("Giảm 40% so với bài trước");
  });

  it("lớp không còn em nào cần chú ý hiện trạng thái rỗng", () => {
    const state = createSeed();
    for (const score of state.scores) score.value = 8;
    replaceStore(state);
    const html = report();
    expect(html).toContain("Cần chú ý");
    expect(html).toContain("Hiện chưa có học sinh nào cần chú ý.");
    expect(html).not.toMatch(/vắng thi/i);
  });

  it("báo cáo một học viên chỉ có điểm hoặc Chưa có điểm, không có trung bình", () => {
    replaceStore(createSeed());
    const html = studentReport("6a-student-4");
    expect(html).toContain("Chưa có điểm");
    expect(html).toContain("Chưa có bài gần nhất để so sánh");
    expect(html).not.toMatch(/vắng thi/i);
    expect(html).not.toContain(">Vắng<");
    expect(html).not.toContain("Trung bình");
    expect(html).not.toContain("TB");
  });

  it("báo cáo một học viên hiện điểm từng bài trên thang của bài và chênh lệch phần trăm", () => {
    replaceStore(createSeed());
    const html = studentReport("6a-student-0");
    // Bài đầu 6.0/10 … bài cuối 9.0/10; chênh lệch 8/10 → 9/10 = +10%.
    expect(html).toContain("6.0");
    expect(html).toContain("/10");
    expect(html).toContain("+10%");
    expect(html).toContain("So với bài có điểm trước đó");
  });

  it("chênh lệch âm dùng dấu trừ U+2212", () => {
    replaceStore(createSeed());
    const html = studentReport("6a-student-2");
    expect(html).toContain("−40%");
    expect(html).not.toContain("-40%");
  });

  it("biểu đồ xu hướng chuẩn hoá theo thang điểm của từng bài", () => {
    const state = createSeed();
    // Bài cuối thang 20: 10/20 = 50% thang, không phải 10/10.
    state.tests.find((test) => test.id === "6a-test-3")!.max = 20;
    state.scores.find(
      (score) => score.id === "6a-student-0-score-3",
    )!.value = 10;
    replaceStore(state);
    const html = studentReport("6a-student-0");
    expect(html).toContain("thang 0 đến 100%");
    expect(html).toContain("80%");
    expect(html).toContain("50%");
    expect(html).not.toContain('thang 0 đến 10"');
  });
});

describe("màn nhập điểm không còn ô Vắng thi", () => {
  it("mỗi em chỉ có điểm hoặc Chưa có điểm", () => {
    replaceStore(createSeed());
    const html = render(
      "/lop/6a/bai-kiem-tra/6a-test-3",
      "/lop/:classId/bai-kiem-tra/:testId",
      <TestScoresPage />,
    );
    expect(html).toContain("Chưa có điểm");
    expect(html).toContain("Lưu điểm");
    expect(html).not.toMatch(/vắng thi/i);
    expect(html).not.toContain("role=\"switch\"");
  });
});
