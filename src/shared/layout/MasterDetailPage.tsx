import type { ReactNode } from "react";
import { Icon } from "../ui";
import { useLayout } from "./useLayout";
import s from "./layout.module.css";

export interface MasterDetailPageProps {
  master: ReactNode;
  detail?: ReactNode;
  detailOpen: boolean;
  onCloseDetail: () => void;
  detailTitle: ReactNode;
  footer?: ReactNode;
  mobileDetail?: "sheet" | "push";
}

export function MasterDetailPage({ master, detail, detailOpen, onCloseDetail, detailTitle, footer, mobileDetail = "sheet" }: MasterDetailPageProps) {
  const layout = useLayout();
  const showSheet = detailOpen && layout === "tablet";
  const showMobileSheet = detailOpen && layout === "mobile" && mobileDetail === "sheet";
  const showPush = detailOpen && layout === "mobile" && mobileDetail === "push";
  return <div className={`${s.masterDetail} ${showPush ? s.pushOpen : ""}`}>
    <div className={s.master}>{master}</div>
    {layout === "desktop" && detailOpen ? <aside className={s.desktopDetail} aria-label={String(detailTitle)}><header className={s.detailHeader}><h2>{detailTitle}</h2></header><div className={s.detailBody}>{detail}</div>{footer ? <footer className={s.detailFooter}>{footer}</footer> : null}</aside> : null}
    {(showSheet || showMobileSheet) && <div className={`${s.detailScrim} ${showSheet ? s.tabletScrim : s.mobileScrim}`} onClick={onCloseDetail} />}
    {(showSheet || showMobileSheet || showPush) && <section className={`${s.detailPanel} ${showSheet ? s.tabletPanel : ""} ${showMobileSheet ? s.mobilePanel : ""} ${showPush ? s.pushPanel : ""}`} role="dialog" aria-modal={showSheet || showMobileSheet || showPush} aria-label={String(detailTitle)}>
      <header className={s.detailHeader}><h2>{detailTitle}</h2><button type="button" className={s.closeDetail} onClick={onCloseDetail} aria-label="Đóng chi tiết"><Icon name="back" /></button></header>
      <div className={s.detailBody}>{detail}</div>
      {footer ? <footer className={s.detailFooter}>{footer}</footer> : null}
    </section>}
  </div>;
}
