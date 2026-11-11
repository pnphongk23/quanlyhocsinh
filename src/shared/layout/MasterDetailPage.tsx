import type { ReactNode } from "react";
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
  const showSheet = detailOpen && layout === "tablet";
  const showMobileSheet = detailOpen && layout === "mobile" && mobileDetail === "sheet";
  const showPush = detailOpen && layout === "mobile" && mobileDetail === "push";
  const masterContent = layout === "mobile" && mobileMaster ? mobileMaster : master;
  return <div className={`${s.masterDetail} ${detailOpen ? s.hasDetail : ""} ${showPush ? s.pushOpen : ""}`}>
    <div className={s.master} data-measure="content">{masterContent}</div>
    {layout === "desktop" && detailOpen ? <aside className={s.desktopDetail} aria-label={String(detailTitle)}><header className={s.detailHeader}><h2>{detailTitle}</h2></header><div className={`${s.detailBody} detail-body`}>{detail}</div>{footer ? <footer className={`${s.detailFooter} detail-foot`}>{footer}</footer> : null}</aside> : null}
    {(showSheet || showMobileSheet) && <div className={`${s.detailScrim} ${showSheet ? s.tabletScrim : s.mobileScrim}`} onClick={onCloseDetail} />}
    {(showSheet || showMobileSheet || showPush) && <section className={`${s.detailPanel} ${showSheet ? s.tabletPanel : ""} ${showMobileSheet ? s.mobilePanel : ""} ${showPush ? s.pushPanel : ""}`} role="dialog" aria-modal={showSheet || showMobileSheet || showPush} aria-label={String(detailTitle)}>
      <header className={s.detailHeader}><h2>{detailTitle}</h2><button type="button" className={s.closeDetail} onClick={onCloseDetail} aria-label="Đóng chi tiết">×</button></header>
      <div className={`${s.detailBody} detail-body`}>{detail}</div>
      {footer ? <footer className={`${s.detailFooter} detail-foot`}>{footer}</footer> : null}
    </section>}
  </div>;
}
