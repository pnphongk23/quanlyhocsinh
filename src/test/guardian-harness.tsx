import React from "react";
import "../shared/styles/tokens.css";
import "../shared/styles/reset.css";
import { createRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import RegisterPage from "../features/auth/RegisterPage";
import SettingsPage from "../features/settings/SettingsPage";
import { createSeed } from "./fixtures/seed";
import { replaceStore } from "../data/store";
import { getSession } from "../data/auth/session";
import type { StoreState } from "../data/types";
import GuardianClassPage from "../roles/guardian/GuardianClassPage";
import GuardianCommentsPage from "../roles/guardian/GuardianCommentsPage";
import GuardianSessionPage from "../roles/guardian/GuardianSessionPage";
import GuardianReportPage from "../roles/guardian/GuardianReportPage";
import GuardianScoresPage from "../roles/guardian/GuardianScoresPage";
import GuardianShell from "../roles/guardian/GuardianShell";

const seed = createSeed() as StoreState;
seed.homeworkSections.push({ id: "fixture-upcoming-homework", sessionId: "6a-extra-session", kind: "reading", title: "Đọc bài", description: "Ôn nội dung bài đọc." });
replaceStore({ ...seed, reportPublications: [] });
if (new URLSearchParams(window.location.search).get("child") === "none") {
  const session = getSession();
  const membership = session?.me.memberships.find((item) => item.id === session.activeMembershipId);
  if (membership?.role.scope_kind === "linked_students") membership.students = [];
}

const routes = [
  {
    path: "/ph",
    Component: GuardianShell,
    children: [
        { index: true, Component: GuardianClassPage },
        { path: "diem", Component: GuardianScoresPage },
        { path: "nhan-xet", Component: GuardianCommentsPage },
        { path: "buoi/:sessionId", Component: GuardianSessionPage },
      { path: "bao-cao", Component: GuardianReportPage },
    ],
  },
  { path: "/cai-dat", Component: SettingsPage },
  { path: "/dang-ky", Component: RegisterPage },
];

const params = new URLSearchParams(window.location.search);
const path = params.get("route") ?? "/ph";
const entry = params.get("from") === "comments"
  ? { pathname: path, state: { from: "nhan-xet" } }
  : path;
const router = createMemoryRouter(routes, { initialEntries: [entry] });
createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
if (params.get("sheet") === "1") {
  window.setTimeout(() => document.querySelector<HTMLButtonElement>("button[aria-haspopup='dialog']")?.click(), 300);
}
