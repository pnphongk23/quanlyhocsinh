import type { PullToRefreshController } from "../hooks/usePullToRefresh";
import { Spinner } from "./Spinner";
import s from "./pullToRefresh.module.css";

export function PullToRefresh({ controller }: { controller: PullToRefreshController }) {
  return (
    <div className={s.mobileOnly}>
      <div
        className={s.indicator}
        data-state={controller.state}
        style={{ "--pull-distance": `${controller.distance}px` } as React.CSSProperties}
        aria-hidden="true"
      >
        <span>
          {controller.state === "loading" && <Spinner />}
          {controller.message}
        </span>
      </div>
      <span role="status" aria-live="polite" aria-atomic="true" className={s.visuallyHidden}>{controller.liveMessage}</span>
    </div>
  );
}

export function RefreshButton({ controller, className = "" }: { controller: PullToRefreshController; className?: string }) {
  const loading = controller.state === "loading";
  const result = controller.state === "ok" || controller.state === "offline" || controller.state === "error";
  return (
    <span className={s.action}>
      <button
        type="button"
        className={`${s.button} ${className}`.trim()}
        onClick={() => void controller.refresh()}
        disabled={loading}
        aria-busy={loading}
      >
        {loading && <Spinner />}
        {loading ? "Đang tải…" : "Tải lại"}
      </button>
      <span role="status" aria-live="polite" aria-atomic="true" className={s.actionStatus} data-state={controller.state}>
        {result ? controller.message : ""}
      </span>
    </span>
  );
}
