import { useLocation } from "react-router-dom";
import { getSession } from "../../data/auth/session";
import { useStore } from "../../data/store";
import { RejectedBanner } from "../../shared/SaveStatus/RejectedBanner";
import { AppShell } from "../../shared/layout";
import { PageTransition } from "../../shared/motion";

function isDetailPath(pathname: string) {
  return pathname.split("/").filter(Boolean).length > 2;
}

export function Component() {
  const store = useStore();
  const { pathname } = useLocation();
  const session = getSession();
  const membership = session?.me.memberships.find((item) => item.id === session.activeMembershipId && item.status === "active");
  const activeMember = store.members.find((member) => member.id === store.activeMemberId);
  const userName = session?.user.display_name ?? activeMember?.name ?? "";
  const workspaceLabel = userName ? `Lớp của ${userName}` : membership?.workspace.name ?? "Lớp học";

  return <AppShell classes={store.classes} currentClassId={store.currentClassId ?? undefined} workspaceLabel={workspaceLabel}>
    <RejectedBanner />
    <PageTransition detail={isDetailPath(pathname)} />
  </AppShell>;
}
