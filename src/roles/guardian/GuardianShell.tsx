import { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { GuardianProvider, useGuardianContext } from "./guardianContext";
import GuardianIcon, { type GuardianIconName } from "./GuardianIcon";
import { initialsOf, shortNameOf } from "./guardianFormat";
import { tabFromState, type GuardianTabKey } from "./guardianUi";
import { Sheet } from "../../shared/ui";
import {
  PageTransition,
  motionClass,
  useSlideIndicator,
} from "../../shared/motion";
import g from "./guardian.module.css";
import s from "./guardianShell.module.css";

/**
 * Khung màn phụ huynh: đầu trang có chip con (mở sheet "Chọn con" khi có từ hai
 * con) và avatar tài khoản (mở Cài đặt), thanh tab chỉ 2 mục. Mobile: tab dưới
 * cùng; desktop ≥ 1024px: tab nằm trên đầu trang, nội dung tối đa 960px.
 * Màn con (Buổi học, Điểm, Báo cáo) giữ tab của nơi đi vào sáng qua
 * `location.state.from`.
 */
const tabs: Array<{
  key: GuardianTabKey;
  to: string;
  label: string;
  icon: GuardianIconName;
}> = [
  { key: "lop", to: "/ph", label: "Lớp học của con", icon: "home" },
  { key: "nhan-xet", to: "/ph/nhan-xet", label: "Nhận xét của cô", icon: "comments" },
];

function activeTabOf(pathname: string, state: unknown): GuardianTabKey | null {
  if (pathname === "/ph") return "lop";
  if (pathname.startsWith("/ph/nhan-xet")) return "nhan-xet";
  if (pathname.startsWith("/ph/")) return tabFromState(state);
  return null;
}

function ChildSwitcher() {
  const { children, child, selectChild } = useGuardianContext();
  const [open, setOpen] = useState(false);
  if (!child) return <span className={s.who} />;
  const multiple = children.length >= 2;
  const body = (
    <>
      <span className={g.avatar} aria-hidden="true">
        {initialsOf(child.student.name)}
      </span>
      <span className={s.whoName}>{shortNameOf(child.student.name)}</span>
      {multiple && <GuardianIcon name="chevron-down" size={16} />}
    </>
  );
  if (!multiple) return <span className={s.who}>{body}</span>;
  return (
    <>
      <button
        type="button"
        className={`${s.who} ${s.whoButton} ${motionClass.pressable}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {body}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Chọn con">
        <ul className={s.childList}>
          {children.map((item) => {
            const active = item.student.id === child.student.id;
            return (
              <li key={item.student.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  className={s.childOption + (active ? " " + s.childActive : "")}
                  onClick={() => {
                    selectChild(item.student.id);
                    setOpen(false);
                  }}
                >
                  <span className={g.avatar} aria-hidden="true">
                    {initialsOf(item.student.name)}
                  </span>
                  <span className={s.childText}>
                    <strong>{item.student.name}</strong>
                    <span>{item.className}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}

function GuardianTopbar() {
  const { pathname, state } = useLocation();
  const active = activeTabOf(pathname, state);
  const navRef = useRef<HTMLElement>(null);
  const ready = useSlideIndicator(navRef, active ?? "");
  const root = pathname === "/ph" || pathname === "/ph/nhan-xet";
  return (
    <header className={s.topbar + (root ? "" : " " + s.topbarSub)}>
      <div className={s.chipSlot}>
        <ChildSwitcher />
      </div>
      <nav ref={navRef} className={s.tabs} aria-label="Điều hướng chính">
        <span
          aria-hidden="true"
          className={[
            motionClass.indicator,
            ready ? motionClass.indicatorReady : "",
            s.bar,
            active ? "" : s.barHidden,
          ].join(" ")}
        />
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            to={tab.to}
            aria-current={active === tab.key ? "page" : undefined}
            className={
              s.tab +
              " " +
              motionClass.pressable +
              (active === tab.key ? " " + s.tabActive : "")
            }
          >
            <GuardianIcon name={tab.icon} />
            {tab.label}
          </Link>
        ))}
      </nav>
      <Link
        to="/cai-dat"
        className={`${s.account} ${motionClass.pressable}`}
        aria-label="Tài khoản và cài đặt"
      >
        <GuardianIcon name="user" size={20} />
      </Link>
    </header>
  );
}

function GuardianFrame() {
  const { pathname } = useLocation();
  return (
      <div className={s.app} data-role="guardian">
      <a className={s.skip} href="#noi-dung">
        Đến nội dung
      </a>
      <GuardianTopbar />
      <main id="noi-dung" className={s.content}>
        <PageTransition detail={pathname.startsWith("/ph/buoi/")} />
      </main>
    </div>
  );
}

export function Component() {
  return (
    <GuardianProvider>
      <GuardianFrame />
    </GuardianProvider>
  );
}

export default Component;
