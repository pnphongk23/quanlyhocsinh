import { useEffect, useRef, type ReactNode } from "react";
import { useLayout } from "./useLayout";
import s from "./layout.module.css";

export interface MasterDetailPageProps {
  master: ReactNode;
  mobileMaster?: ReactNode;
  detail?: ReactNode;
  detailOpen: boolean;
  onCloseDetail: () => void;
  detailTitle: ReactNode;
  footer?: ReactNode;
  mobileDetail?: "sheet" | "push";
}

export function MasterDetailPage({ master, mobileMaster, detail, detailOpen, onCloseDetail, detailTitle, footer, mobileDetail = "sheet" }: MasterDetailPageProps) {
  const layout = useLayout();
  const modalLayout = layout === "tablet" || (layout === "mobile" && mobileDetail === "sheet");
  const showMobileSheet = layout === "mobile" && detailOpen && mobileDetail === "sheet";
  const showPush = layout === "mobile" && detailOpen && mobileDetail === "push";
  const masterContent = layout === "mobile" && mobileMaster ? mobileMaster : master;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const masterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!modalLayout) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (detailOpen) {
      if (!dialog.open) {
        const active = document.activeElement;
        if (!returnFocusRef.current) returnFocusRef.current = active instanceof HTMLElement ? active : null;
        dialog.showModal();
      }
      return;
    }
    if (dialog.open) dialog.close();
    const trigger = returnFocusRef.current;
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    returnFocusRef.current = null;
  }, [detailOpen, modalLayout]);

  function captureTrigger(event: { target: EventTarget | null }) {
    const target = event.target instanceof HTMLElement ? event.target : document.activeElement;
    if (target instanceof HTMLElement && masterRef.current?.contains(target)) returnFocusRef.current = target;
  }

  return <div className={`${s.masterDetail} ${detailOpen ? s.hasDetail : ""} ${showPush ? s.pushOpen : ""}`}>
    <div ref={masterRef} className={s.master} data-measure="content" onClickCapture={captureTrigger} onKeyDownCapture={captureTrigger}>{masterContent}</div>
    {layout === "desktop" && detailOpen ? <aside className={s.desktopDetail} aria-label={String(detailTitle)}><header className={s.detailHeader}><h2>{detailTitle}</h2></header><div className={`${s.detailBody} detail-body`}>{detail}</div>{footer ? <footer className={`${s.detailFooter} detail-foot`}>{footer}</footer> : null}</aside> : null}
    {modalLayout ? <dialog ref={dialogRef} className={`${s.detailPanel} ${s.detailDialog} ${layout === "tablet" ? s.tabletPanel : s.mobilePanel}`} aria-label={String(detailTitle)} tabIndex={-1}
      onCancel={(event) => { event.preventDefault(); onCloseDetail(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onCloseDetail(); }}>
      <header className={s.detailHeader}><h2>{detailTitle}</h2><button type="button" className={s.closeDetail} onClick={onCloseDetail} aria-label="Đóng chi tiết">×</button></header>
      <div className={`${s.detailBody} detail-body`}>{detail}</div>
      {footer ? <footer className={`${s.detailFooter} detail-foot`}>{footer}</footer> : null}
    </dialog> : null}
    {showPush && <section className={`${s.detailPanel} ${s.pushPanel}`} role="dialog" aria-modal="true" aria-label={String(detailTitle)}>
      <header className={s.detailHeader}><h2>{detailTitle}</h2><button type="button" className={s.closeDetail} onClick={onCloseDetail} aria-label="Đóng chi tiết">×</button></header>
      <div className={`${s.detailBody} detail-body`}>{detail}</div>
      {footer ? <footer className={`${s.detailFooter} detail-foot`}>{footer}</footer> : null}
    </section>}
  </div>;
}
