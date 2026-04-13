import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  getVisibleNavGroups,
  navGroupHasActiveItem,
  type NavGroup,
} from "../../lib/navigation";
import type { MeUser } from "../../types/user";
import { toSurnameWithInitials } from "../../lib/formatName";

type SiteHeaderProps = {
  me: MeUser | null;
  onLogout: () => void;
};

function navClass({ isActive }: { isActive: boolean }) {
  return `nav-link nav-link--dropdown${isActive ? " nav-link-active" : ""}`;
}

function useMobileNav() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 900px)").matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}

type NavGroupBlockProps = {
  group: NavGroup;
  closeNav: () => void;
  mobile: boolean;
  openGroupKey: string | null;
  setOpenGroupKey: (key: string | null) => void;
};

function NavGroupBlock({
  group,
  closeNav,
  mobile,
  openGroupKey,
  setOpenGroupKey,
}: NavGroupBlockProps) {
  const isOpen = openGroupKey === group.key;
  const location = useLocation();
  const pathname = location.pathname;
  const groupActive = navGroupHasActiveItem(pathname, group.items);

  if (mobile) {
    return (
      <div className="nav-group nav-group--stack">
        <div className="nav-group-heading">{group.label}</div>
        <div className="nav-group-links">
          {group.items.map((item) => (
            <NavLink
              key={item.to + item.label}
              className={navClass}
              to={item.to}
              end={item.end}
              onClick={closeNav}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`nav-group${isOpen ? " nav-group--open" : ""}${groupActive ? " nav-group--has-active" : ""}`}
    >
      <button
        type="button"
        className="nav-group-trigger"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls={`nav-panel-${group.key}`}
        id={`nav-trigger-${group.key}`}
        onClick={() => setOpenGroupKey(isOpen ? null : group.key)}
      >
        <span>{group.label}</span>
        <span className="nav-group-chevron" aria-hidden />
      </button>
      <div
        id={`nav-panel-${group.key}`}
        className="nav-group-panel"
        role="region"
        aria-labelledby={`nav-trigger-${group.key}`}
      >
        <div className="nav-group-panel-inner">
          {group.items.map((item) => (
            <NavLink
              key={item.to + item.label}
              className={navClass}
              to={item.to}
              end={item.end}
              onClick={() => {
                closeNav();
                setOpenGroupKey(null);
              }}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SiteHeader({ me, onLogout }: SiteHeaderProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const mobile = useMobileNav();
  const navGroups = getVisibleNavGroups(me);
  const location = useLocation();
  const canCreateAppointment = me?.role.name !== "doctor";

  useEffect(() => {
    setOpenGroupKey(null);
  }, [location.pathname]);

  useEffect(() => {
    if (!navOpen && openGroupKey === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setNavOpen(false);
        setOpenGroupKey(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen, openGroupKey]);

  useEffect(() => {
    if (openGroupKey === null) return;
    function handle(e: MouseEvent) {
      if (!(e.target instanceof Node)) return;
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setOpenGroupKey(null);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [openGroupKey]);

  useEffect(() => {
    function onResize() {
      if (window.matchMedia("(min-width: 901px)").matches) setNavOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function closeNav() {
    setNavOpen(false);
  }

  return (
    <header ref={headerRef} className={`site-header${navOpen ? " site-header--nav-open" : ""}`}>
      <div className="container header-inner">
        <Link to="/" className="brand" aria-label="На главную">
          <span className="brand-mark" aria-hidden="true">
            🐾
          </span>
          <span className="brand-name">ВетКлиника Online</span>
        </Link>

        <nav id="site-nav" className="nav nav-main" aria-label="Основная навигация">
          {navGroups.map((group) => (
            <NavGroupBlock
              key={group.key}
              group={group}
              closeNav={closeNav}
              mobile={mobile}
              openGroupKey={openGroupKey}
              setOpenGroupKey={setOpenGroupKey}
            />
          ))}
        </nav>

        <button
          type="button"
          className="nav-burger"
          aria-label={navOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={navOpen}
          aria-controls="site-nav"
          onClick={() => setNavOpen((o) => !o)}
        >
          <span className="nav-burger-bar" aria-hidden="true" />
          <span className="nav-burger-bar" aria-hidden="true" />
          <span className="nav-burger-bar" aria-hidden="true" />
        </button>

        <div className="header-actions">
          {me ? (
            <>
              <span className="nav-link header-user" aria-live="polite">
                {toSurnameWithInitials(me.fullName)}
              </span>
              <button type="button" className="btn btn-ghost" onClick={onLogout}>
                Выйти
              </button>
              {canCreateAppointment ? (
                <Link className="btn btn-primary" to="/appointments" onClick={closeNav}>
                  Записаться
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <Link className="btn btn-ghost" to="/register" onClick={closeNav}>
                Регистрация
              </Link>
              <Link className="btn btn-primary" to="/login" onClick={closeNav}>
                Войти
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
