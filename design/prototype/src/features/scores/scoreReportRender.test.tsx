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

describe("màn báo cáo điểm không còn trạng thái Vắng thi", () => {
  it("Cần chú ý có câu quy tắc mới và lý do theo ảnh 22–25", () => {
    replaceStore(createSeed());
    const html = report();
    expect(html).toContain("Cần chú ý");
    expect(html).toContain(
      "Gồm em có: trung bình dưới 5; hoặc bài gần nhất giảm từ 2 điểm trở lên so với bài có điểm trước đó; hoặc từ 2 bài chưa có điểm.",
    );
    expect(html).toContain("Bài gần nhất giảm 4.0 điểm");
    expect(html).toContain("có điểm ·");
    expect(html).toContain("chưa có điểm");
    expect(html).not.toMatch(/vắng thi/i);
    expect(html).not.toContain("chưa nhập");
    // Không hiện trung bình lớp hay trung bình từng bài.
    expect(html).not.toContain("Trung bình lớp");
    expect(html).not.toContain("TB lớp");
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

  it("báo cáo một học viên chỉ có điểm hoặc Chưa có điểm", () => {
    replaceStore(createSeed());
    const html = render(
      "/lop/6a/bao-cao-diem/6a-student-4",
      "/lop/:classId/bao-cao-diem/:studentId",
      <StudentScoreReportPage />,
    );
    expect(html).toContain("Chưa có điểm");
    expect(html).toContain("Chưa có bài gần nhất để so sánh");
    expect(html).not.toMatch(/vắng thi/i);
    expect(html).not.toContain(">Vắng<");
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
