import { lazy, Suspense } from "react";
import { getSession } from "../../data/auth/session";

const GuardianShell = lazy(() =>
  import("../guardian/GuardianShell").then(({ default: Component }) => ({
    default: Component,
  })),
);
const StaffShell = lazy(() =>
  import("../staff/StaffShell").then(({ Component }) => ({
    default: Component,
  })),
);

/** Account routes keep their URL while choosing the shell from the active role. */
export function Component() {
  const session = getSession();
  const activeMembership = session?.me.memberships.find(
    (membership) =>
      membership.id === session.activeMembershipId &&
      membership.status === "active",
  );
  const guardian =
    activeMembership?.role.scope_kind === "linked_students" ||
    (!activeMembership && session?.guardianAccount === true);
  const Shell = guardian ? GuardianShell : StaffShell;

  return (
    <Suspense fallback={null}>
      <Shell />
    </Suspense>
  );
}
