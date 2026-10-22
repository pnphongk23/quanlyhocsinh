import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../shared/styles/tokens.css";
import "../shared/styles/reset.css";
import {
  createMemoryRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import ClassSpaceLayout from "../features/class-space/ClassSpaceLayout";
import SessionsTab from "../features/class-space/SessionsTab";
import SessionDetailPage from "../features/class-space/SessionDetailPage";
import TestsTab from "../features/class-space/TestsTab";
import ScoreGridTab from "../features/class-space/ScoreGridTab";
import NewTestPage from "../features/scores/NewTestPage";
import TestScoresPage from "../features/scores/TestScoresPage";
import ReportsPage from "../features/reports/ReportsPage";
import { Component as StaffShell } from "../roles/staff/StaffShell";
import { createSeed } from "./fixtures/seed";
import { replaceStore } from "../data/store";

// This entry is served by Vite for screenshot review only and is never imported
// by the production application entry point.
const fixture = createSeed();
fixture.activeMemberId = "member-test-teacher";
fixture.scores.find((score) => score.id === "6a-score-1-0")!.value = 7.5;
replaceStore(fixture);

const initialPath = new URLSearchParams(window.location.search).get("path") ?? "/lop/6a/buoi-hoc";
const router = createMemoryRouter(
  [
    {
      element: <StaffShell />,
      children: [
        {
          path: "/lop/:classId",
          element: <ClassSpaceLayout />,
          children: [
            { index: true, element: <Navigate to="buoi-hoc" replace /> },
            { path: "buoi-hoc", element: <SessionsTab /> },
            { path: "buoi-hoc/:sessionId", element: <SessionDetailPage />, handle: { detail: true } },
            { path: "bai-kiem-tra", element: <TestsTab /> },
            { path: "bai-kiem-tra/moi", element: <NewTestPage />, handle: { detail: true } },
            { path: "bai-kiem-tra/:testId", element: <TestScoresPage />, handle: { detail: true } },
            { path: "diem", element: <ScoreGridTab /> },
            { path: "bao-cao", element: <ReportsPage /> },
          ],
        },
      ],
    },
  ],
  { initialEntries: [initialPath] },
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
