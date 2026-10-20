import type { HomeworkGrade, StarLevel, StoreState } from "./types";
// Nạp defaults trước store: store gọi createSeed() ngay khi khởi tạo.
import { defaultMembers, defaultRoles, MEMBER_IDS } from "./defaults";
import { defaultStaffTuition } from "./staffTuitionDefaults";
import { hydratePayrollState } from "./payroll";
import { replaceStore } from "./store";

export function createSeed(): StoreState {
  // Khai báo trong hàm: store.ts gọi createSeed() ngay khi nạp module này.
  // Ngày buổi học của hai lớp mẫu (6A: thứ Hai/thứ Tư, IELTS: thứ Ba/thứ Năm).
  const CLASS_6A_DATES = [
    "2026-09-21",
    "2026-09-23",
    "2026-09-28",
    "2026-09-30",
    "2026-10-05",
    "2026-10-07",
    "2026-10-12",
    "2026-10-14",
    "2026-10-19",
  ];
  const IELTS_DATES = [
    "2026-09-22",
    "2026-09-24",
    "2026-09-29",
    "2026-10-01",
    "2026-10-06",
    "2026-10-08",
    "2026-10-13",
    "2026-10-15",
    "2026-10-20",
  ];
  const state: StoreState = {
    classes: [],
    students: [],
    sessions: [],
    attendance: [],
    tests: [],
    scores: [],
    comments: [],
    homeworkSections: [],
    homeworkGrades: [],
    reports: [],
    changeLogs: [],
    pending: [],
    auth: {
      email: "colan@example.test",
      // Cô Lan có ba membership: Admin, Giáo viên và Phụ huynh (hai con ở lớp 6A).
      memberIds: [
        MEMBER_IDS.lanAdmin,
        MEMBER_IDS.lanTeacher,
        MEMBER_IDS.lanGuardian,
      ],
    },
    currentClassId: "6a",
    roles: defaultRoles(),
    members: defaultMembers(),
    // Admin đứng đầu nên mặc định đăng nhập là Admin.
    activeMemberId: MEMBER_IDS.lanAdmin,
    lectures: [
      {
        id: "lecture-present-perfect",
        title: "Unit 3: Present Perfect",
        createdBy: MEMBER_IDS.lanTeacher,
        createdAt: "2026-10-10T08:00:00.000Z",
        archived: false,
        sections: [
          {
            id: "lecture-present-perfect-s1",
            title: "Khởi động",
            description: "Hỏi đáp về trải nghiệm đã từng có.",
            files: [],
          },
          {
            id: "lecture-present-perfect-s2",
            title: "Ngữ pháp trọng tâm",
            description: "Cấu trúc since/for và trạng từ just, already, yet.",
            files: [
              {
                id: "file-present-perfect-1",
                name: "present-perfect.pdf",
                size: 318000,
                type: "application/pdf",
              },
            ],
          },
          {
            id: "lecture-present-perfect-s3",
            title: "Luyện tập",
            description: "Bài tập chia động từ theo ngữ cảnh.",
            files: [],
          },
          {
            id: "lecture-present-perfect-s4",
            title: "Bài tập về nhà",
            description: "Viết 5 câu kể về bản thân.",
            files: [],
          },
        ],
      },
      {
        id: "lecture-travel-vocab",
        title: "Từ vựng chủ đề Travel",
        createdBy: MEMBER_IDS.minh,
        createdAt: "2026-10-12T08:00:00.000Z",
        archived: false,
        sections: [
          {
            id: "lecture-travel-vocab-s1",
            title: "Từ vựng sân bay",
            description: "Check-in, boarding pass, luggage, delay.",
            files: [],
          },
          {
            id: "lecture-travel-vocab-s2",
            title: "Hội thoại mẫu",
            description: "Đặt phòng khách sạn và hỏi đường.",
            files: [
              {
                id: "file-travel-vocab-1",
                name: "travel-vocab.pdf",
                size: 245000,
                type: "application/pdf",
              },
            ],
          },
          {
            id: "lecture-travel-vocab-s3",
            title: "Thực hành nói",
            description: "Kể lại một chuyến đi đã đi.",
            files: [],
          },
        ],
      },
    ],
    sessionLectures: [
      { sessionId: "6a-session-0", lectureId: "lecture-present-perfect", position: 0 },
      { sessionId: "6a-session-1", lectureId: "lecture-present-perfect", position: 0 },
      { sessionId: "6a-session-1", lectureId: "lecture-travel-vocab", position: 1 },
      { sessionId: "ielts-session-0", lectureId: "lecture-travel-vocab", position: 0 },
    ],
    sessionStaffBase: [],
    payrollSnapshots: [],
    ...defaultStaffTuition(),
  };
  const names = [
    "Nguyễn Minh Anh",
    "Trần Gia Bảo",
    "Lê Khánh Chi",
    "Phạm Đức Dũng",
    "Hoàng Thu Hà",
    "Vũ Quang Huy",
    "Đặng Ngọc Lan",
    "Bùi Tuấn Kiệt",
    "Ngô Bảo Ngọc",
    "Đỗ Hải Nam",
  ];
  for (const [c, id] of ["6a", "ielts"].entries()) {
    state.classes.push({
      id,
      name: c ? "IELTS 7.0" : "Tiếng Anh giao tiếp 6A",
      weekdays: c ? [2, 4] : [1, 3],
      time: c ? "19:30" : "18:00",
      status: "active",
    });
    const dates = c ? IELTS_DATES : CLASS_6A_DATES;
    dates.forEach((date, i) =>
      state.sessions.push({
        id: id + "-session-" + i,
        classId: id,
        date,
        time: c ? "19:30" : "18:00",
        origin: "recurring",
        status: i === 8 ? "planned" : "held",
      }),
    );
    if (!c)
      state.sessions.push({
        id: "6a-extra-session",
        classId: id,
        date: "2026-10-25",
        time: "17:00",
        origin: "manual",
        note: "Buổi học bù",
        makeup: true,
        status: "planned",
      });
    // Buổi bù 16/10 của lớp 6A bị hủy: BTVN giao ở buổi 14/10 chấm ở buổi 19/10.
    if (!c)
      state.sessions.push({
        id: "6a-extra-cancelled",
        classId: id,
        date: "2026-10-16",
        time: "18:00",
        origin: "manual",
        note: "Buổi bù bị hủy",
        makeup: true,
        status: "cancelled",
      });
    names.forEach((name, i) => {
      const studentId = id + "-student-" + i;
      state.students.push({
        id: studentId,
        classId: id,
        name,
        parentPhone: "09xx xxx xxx",
        enrolledAt: "2026-09-01",
        leftAt: i === 9 ? "2026-10-09" : null,
        status: i === 9 ? "left" : "active",
      });
      dates.slice(0, 8).forEach((date, j) => {
        if (i === 9 && date > "2026-10-09") return;
        const status =
          i === 0 && j >= 6
            ? "absent"
            : i === 1 && j === 7
              ? "excused"
              : i === 2 && j === 7
                ? "late"
                : "present";
        state.attendance.push({
          id: studentId + "-attendance-" + j,
          sessionId: id + "-session-" + j,
          studentId,
          status,
          note: "",
          lateAt: status === "late" ? "18:10" : null,
        });
      });
      for (let j = 0; j < 4; j++)
        state.scores.push({
          id: studentId + "-score-" + j,
          testId: id + "-test-" + j,
          studentId,
          // Em vắng buổi kiểm tra cũng là "Chưa có điểm".
          value: i === 3 && j === 3 ? null : i === 4 && j === 3 ? null : 6 + ((i + j) % 5),
        });
      state.reports.push({
        id: studentId + "-report",
        classId: id,
        studentId,
        month: "2026-10",
        status: i < 2 ? "published" : "draft",
        needsRepublish: false,
        // Nhận xét chung và nội dung cho phụ huynh: xem seedReportAndGuardianViews().
        generalComment: "",
        publishedAt: i < 2 ? "2026-10-12T09:00:00.000Z" : null,
      });
    });
    for (let j = 0; j < 4; j++)
      state.tests.push({
        id: id + "-test-" + j,
        classId: id,
        name: ["Từ vựng", "Ngữ pháp", "Nghe", "Nói"][j],
        date: dates[j + 3],
        max: 10,
        archived: false,
      });
  }
  seedComments(state);
  seedHomework(state);
  seedReportAndGuardianViews(state);
  return hydratePayrollState(state);
}

/**
 * Phiếu buổi học mẫu: đã gửi, nháp, đang chờ mạng và chưa chọn sao; phiếu cũ
 * của em đã rời lớp vẫn giữ.
 */
function seedComments(state: StoreState): void {
  const comment = (
    id: string,
    classId: string,
    studentId: string,
    sessionId: string,
    stars: 1 | 2 | 3,
    options: {
      note?: string;
      status: "draft" | "sent";
      sendQueued?: boolean;
      at: string;
    },
  ) => {
    const sent = options.status === "sent";
    state.comments.push({
      id,
      classId,
      studentId,
      sessionId,
      stars,
      note: options.note ?? "",
      status: options.status,
      sendQueued: options.sendQueued ?? false,
      sentAt: sent ? options.at : null,
      updatedAt: options.at,
      createdAt: options.at,
    });
  };
  // Buổi 14/10 của lớp 6A (chấm BTVN buổi 12/10): một phiếu đã gửi, một nháp,
  // một đang chờ mạng; các em còn lại chưa chọn sao.
  comment(
    "6a-student-1-comment-s8",
    "6a",
    "6a-student-1",
    "6a-session-7",
    3,
    {
      note: "Hôm nay con xung phong kể chuyện trước lớp rất tự tin.",
      status: "sent",
      at: "2026-10-14T13:14:00.000Z",
    },
  );
  comment(
    "6a-student-2-comment-s8",
    "6a",
    "6a-student-2",
    "6a-session-7",
    2,
    { status: "draft", at: "2026-10-14T13:05:00.000Z" },
  );
  comment(
    "6a-student-3-comment-s8",
    "6a",
    "6a-student-3",
    "6a-session-7",
    2,
    {
      note: "Con cần luyện nghe thêm mỗi ngày.",
      status: "draft",
      sendQueued: true,
      at: "2026-10-14T13:07:00.000Z",
    },
  );
  // Em đã rời lớp 09/10: phiếu buổi 07/10 trở về trước vẫn giữ.
  comment(
    "6a-student-9-comment-s6",
    "6a",
    "6a-student-9",
    "6a-session-5",
    2,
    {
      note: "Con đã ghi chép đầy đủ, cần nói to hơn khi luyện nói.",
      status: "sent",
      at: "2026-10-07T12:30:00.000Z",
    },
  );
  // Lớp IELTS: phiếu đã gửi và phiếu nháp của buổi 15/10.
  comment("ielts-student-0-comment-s8", "ielts", "ielts-student-0", "ielts-session-7", 3, {
    note: "Con chuẩn bị bài kỹ và trả lời lưu loát.",
    status: "sent",
    at: "2026-10-15T13:40:00.000Z",
  });
  comment("ielts-student-1-comment-s8", "ielts", "ielts-student-1", "ielts-session-7", 3, {
    status: "draft",
    at: "2026-10-15T13:42:00.000Z",
  });
}

/**
 * BTVN mẫu:
 * - 6A buổi 12/10: 2 phần đã chấm dở ở buổi 14/10 (2 em còn "Chưa chấm",
 *   trong đó một em vắng buổi giao bài).
 * - 6A buổi 14/10: 3 phần giao mới; buổi chấm 19/10 vì buổi bù 16/10 bị hủy.
 * - IELTS buổi 20/10 (buổi cuối): 2 phần giao mới, chưa có buổi chấm.
 * - 6A buổi 21/09 (buổi đầu) và 23/09 (buổi trước không giao) để trống.
 */
function seedHomework(state: StoreState): void {
  state.homeworkSections.push(
    {
      id: "6a-hw-6-vocabulary",
      sessionId: "6a-session-6",
      kind: "vocabulary",
      title: "Unit 5 · 12 từ chủ đề Food",
      description: "Học nghĩa và cách đọc, chép mỗi từ 2 lần vào vở.",
    },
    {
      id: "6a-hw-6-exercise",
      sessionId: "6a-session-6",
      kind: "exercise",
      title: "Workbook trang 38–39",
      description: "",
    },
    {
      id: "6a-hw-7-vocabulary",
      sessionId: "6a-session-7",
      kind: "vocabulary",
      title: "Unit 6 · 15 từ chủ đề Travel",
      description: "Học nghĩa và cách đọc, chép mỗi từ 2 lần vào vở.",
    },
    {
      id: "6a-hw-7-speaking",
      sessionId: "6a-session-7",
      kind: "speaking",
      title: "Kể về chuyến đi gần nhất",
      description: "Nói khoảng 1 phút, nhờ bố mẹ nghe và góp ý.",
    },
    {
      id: "6a-hw-7-exercise",
      sessionId: "6a-session-7",
      kind: "exercise",
      title: "Workbook trang 42–43",
      description: "",
    },
    {
      id: "ielts-hw-8-vocabulary",
      sessionId: "ielts-session-8",
      kind: "vocabulary",
      title: "Unit 7 · 15 từ chủ đề Health",
      description: "",
    },
    {
      id: "ielts-hw-8-exercise",
      sessionId: "ielts-session-8",
      kind: "exercise",
      title: "Workbook trang 50–51",
      description: "",
    },
  );
  const grade = (
    sectionId: string,
    studentIds: string[],
    level: HomeworkGrade["level"],
  ) =>
    studentIds.forEach((studentId) =>
      state.homeworkGrades.push({ sectionId, studentId, level }),
    );
  // Phần Luyện từ vựng: 8/9 em đã chấm. Phần Bài tập: 7/9 em đã chấm.
  // Chưa chấm: em 0 (cả hai phần, vắng buổi giao bài), em 3 (phần Bài tập).
  grade("6a-hw-6-vocabulary", ["6a-student-1", "6a-student-3", "6a-student-5", "6a-student-7"], "excellent");
  grade("6a-hw-6-vocabulary", ["6a-student-2", "6a-student-4", "6a-student-8"], "done");
  grade("6a-hw-6-vocabulary", ["6a-student-6"], "not_done");
  grade("6a-hw-6-exercise", ["6a-student-2", "6a-student-7"], "excellent");
  grade("6a-hw-6-exercise", ["6a-student-1", "6a-student-4", "6a-student-6", "6a-student-8"], "done");
  grade("6a-hw-6-exercise", ["6a-student-5"], "not_done");
}

/**
 * Bổ sung của Lính A2 (thêm ở cuối seed, không đổi dữ liệu của phần trên) để
 * báo cáo tháng và màn phụ huynh có dữ liệu đẹp:
 *
 * - Nhận xét chung của tháng cho báo cáo tháng 10 đã phát hành của Trần Gia Bảo
 *   (`6a-student-1-report`, ảnh 13/26). Báo cáo của các em khác để trống → màn
 *   duyệt báo cáo hiện "Thiếu nhận xét chung".
 * - Phiếu sao đã gửi trong tháng 10 cho hai con của membership phụ huynh Cô Lan
 *   (`6a-student-1` = Trần Gia Bảo, `6a-student-8` = Ngô Bảo Ngọc) để báo cáo
 *   tháng có phần "Nhận xét theo sao" (ảnh 07, 10) và màn Nhận xét của phụ
 *   huynh có danh sách phiếu (ảnh 14). Thêm 3 sao/2 sao/1 sao cho em 1 để đủ ba mức.
 * - Một phần BTVN giao ở buổi học bù 25/10 (buổi cuối của 6A) để màn BTVN của
 *   phụ huynh có trạng thái "Chưa có buổi chấm" (ảnh 35).
 *
 * Phiếu buổi 14/10 của em 1 (`6a-student-1-comment-s8`) vẫn là phiếu đã gửi ở
 * seedComments(); các phiếu dưới đây là các buổi trước đó trong tháng 10.
 */
function seedReportAndGuardianViews(state: StoreState): void {
  const sent = (
    id: string,
    studentId: string,
    sessionId: string,
    stars: StarLevel,
    note: string,
    at: string,
  ) =>
    state.comments.push({
      id,
      classId: "6a",
      studentId,
      sessionId,
      stars,
      note,
      status: "sent",
      sendQueued: false,
      sentAt: at,
      updatedAt: at,
      createdAt: at,
    });

  sent(
    "6a-student-1-comment-s5",
    "6a-student-1",
    "6a-session-4",
    3,
    "Con làm bài đầy đủ và phát âm tốt hơn tuần trước.",
    "2026-10-05T13:10:00.000Z",
  );
  sent(
    "6a-student-1-comment-s6",
    "6a-student-1",
    "6a-session-5",
    2,
    "",
    "2026-10-07T13:05:00.000Z",
  );
  sent(
    "6a-student-1-comment-s7",
    "6a-student-1",
    "6a-session-6",
    1,
    "Con chưa tập trung ở phần luyện nói.",
    "2026-10-12T13:20:00.000Z",
  );
  sent(
    "6a-student-8-comment-s6",
    "6a-student-8",
    "6a-session-5",
    2,
    "",
    "2026-10-07T13:08:00.000Z",
  );
  sent(
    "6a-student-8-comment-s7",
    "6a-student-8",
    "6a-session-6",
    3,
    "Con chuẩn bị bài và xung phong phát biểu.",
    "2026-10-12T13:22:00.000Z",
  );

  const publishedReport = state.reports.find(
    (report) => report.id === "6a-student-1-report",
  );
  if (publishedReport)
    publishedReport.generalComment =
      "Tháng này con tiến bộ ở kỹ năng nghe và tự tin hơn khi nói trước lớp. Cần ôn từ vựng đều hơn ở nhà.";

  // Buổi học bù 25/10 là buổi cuối của lớp 6A: BTVN giao ở đây chưa có buổi chấm.
  state.homeworkSections.push({
    id: "6a-hw-extra-vocabulary",
    sessionId: "6a-extra-session",
    kind: "vocabulary",
    title: "Ôn 15 từ chủ đề Travel",
    description: "Ôn lại nghĩa và cách đọc, chuẩn bị kiểm tra nói ở buổi sau.",
  });
}

export function resetSeed(): void {
  replaceStore(createSeed());
}