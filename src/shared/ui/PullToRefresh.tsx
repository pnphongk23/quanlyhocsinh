import type { PullToRefreshController } from "../hooks/usePullToRefresh";
import { Spinner } from "./Spinner";
import s from "./pullToRefresh.module.css";

export function PullToRefresh({ controller }: { controller: PullToRefreshController }) {
  const visible = controller.message !== "";
  return (
    <div
      className={s.indicator}
      data-state={controller.state}
      style={{ "--pull-distance": `${controller.distance}px` } as React.CSSProperties}
      aria-hidden={!visible && controller.distance === 0}
    >
      <span role="status" aria-live="polite" aria-atomic="true">
        {controller.state === "loading" && <span aria-hidden="true"><Spinner /></span>}
        {controller.message}
      </span>
    </div>
  );
}

export function RefreshButton({ controller, className = "" }: { controller: PullToRefreshController; className?: string }) {
  return (
    <button
      type="button"
      className={`${s.button} ${className}`.trim()}
      onClick={() => void controller.refresh()}
      disabled={controller.state === "loading"}
      aria-busy={controller.state === "loading"}
    >
      {controller.state === "loading" && <Spinner />}
      {controller.state === "loading" ? "Đang tải…" : "Tải lại"}
    </button>
  );
}
