import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { setCurrentClass } from "../../data/repositories/classes";
import type { Class } from "../../data/types";
import { useDismiss } from "../hooks/useDismiss";
import SaveStatus from "../SaveStatus";
import { Icon } from "../ui";
import { navItems } from "./navItems";
import s from "./layout.module.css";
import shellStyles from "../../app/shell.module.css";

export interface AppShellProps {
  children: ReactNode;
  classes: Class[];
  currentClassId?: string;
  workspaceLabel: string;
}

function isDetailPath(pathname: string) {
  return /^\/lop\/[^/]+\/.+/.test(pathname);
}

export function AppShell({ children, classes, currentClassId, workspaceLabel }: AppShellProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [classMenuOpen, setClassMenuOpen] = useState(false);
  const classPickerRef = useRef<HTMLDivElement>(null);
  useDismiss(classMenuOpen, () => setClassMenuOpen(false), classPickerRef);
  const currentClass = classes.find((item) => item.id === currentClassId);
  const detail = isDetailPath(pathname);

  useEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute("data-staff-detail", detail);
    return () => root.removeAttribute("data-staff-detail");
  }, [detail]);

  const classPath = (item: (typeof navItems)[number]) => item.to(currentClass?.id);
  const isNavActive = (id: string) => {
    const item = navItems.find((navItem) => navItem.id === id)!;
    if (id === "classes") return pathname.startsWith("/lop") && !(currentClass && navItems.filter((child) => child.child).some((child) => pathname === child.to(currentClass.id) || pathname.startsWith(`${child.to(currentClass.id)}/`)));
    if (item.child) return pathname === classPath(item) || (id === "scores" && pathname.includes("/bao-cao-diem"));
    return pathname === classPath(item);
  };

  return <div className={`${s.appShell} ${detail ? s.isDetail : ""}`} data-role="staff">
    <a className={s.skip} href="#staff-content">Đến nội dung</a>
    <SaveStatus className={s.mobileSaveStatus} />
    <aside className={s.sidebar}>
      <Link to="/lop" className={s.brand}>{workspaceLabel}</Link>
      <div ref={classPickerRef} className={s.classPicker}>
        <button type="button" className={s.classScope} aria-expanded={classMenuOpen} aria-haspopup="listbox" onClick={() => setClassMenuOpen((open) => !open)}>
          <span>Đang xem lớp</span><strong><span>{currentClass?.name ?? "Chưa chọn lớp"}</span><span aria-hidden="true">⌄</span></strong>
        </button>
        {classMenuOpen && <div className={s.classMenu} role="listbox" aria-label="Chọn lớp">{classes.map((item) => <button key={item.id} role="option" aria-selected={item.id === currentClass?.id} onClick={() => { setCurrentClass(item.id); setClassMenuOpen(false); if (pathname.startsWith("/lop/")) navigate(`/lop/${item.id}`); }}>{item.name}</button>)}</div>}
      </div>
      <nav className={s.sideNav} aria-label="Điều hướng nhân sự">
        {navItems.filter((item) => !item.child || currentClass).map((item) => <Link key={item.id} to={classPath(item)} aria-current={isNavActive(item.id) ? "page" : undefined} className={`${s.sideLink} ${item.child ? s.sideChild : ""} ${isNavActive(item.id) ? s.active : ""}`}>
          <Icon name={item.icon} /><span>{item.label}</span>
        </Link>)}
      </nav>
      <SaveStatus className={s.desktopSaveStatus} />
    </aside>
    <nav className={s.rail} aria-label="Điều hướng chính">{navItems.filter((item) => !item.child || currentClass).map((item) => <NavLink key={item.id} to={classPath(item)} end={!item.child} aria-current={isNavActive(item.id) ? "page" : undefined} className={isNavActive(item.id) ? s.active : ""}><Icon name={item.icon} /><span>{item.shortLabel}</span></NavLink>)}</nav>
    <main id="staff-content" className={`${s.content} ${shellStyles.staffContent}`}>{children}</main>
    <nav className={s.tabbar} aria-label="Điều hướng chính">{navItems.filter((item) => !item.child).map((item) => <NavLink key={item.id} to={classPath(item)} end aria-current={isNavActive(item.id) ? "page" : undefined} className={isNavActive(item.id) ? s.active : ""}><Icon name={item.icon} /><span>{item.label}</span></NavLink>)}</nav>
  </div>;
}
