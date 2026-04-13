import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { fetchApi } from "../../lib/api";
import { clearAuth, getToken } from "../../lib/authStorage";
import type { MeUser } from "../../types/user";
import { SiteHeader } from "./SiteHeader";

const year = new Date().getFullYear();

export function MainLayout() {
  const [me, setMe] = useState<MeUser | null>(null);

  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    fetchApi("/api/me")
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) {
            clearAuth();
            if (!cancelled) setMe(null);
          }
          return;
        }
        const data = (await res.json()) as MeUser;
        if (!cancelled) setMe(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function logout() {
    clearAuth();
    setMe(null);
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Перейти к содержимому
      </a>
      <div className="app-shell">
        <SiteHeader me={me} onLogout={logout} />
        <div className="app-content">
          <Outlet />
        </div>
        <footer className="site-footer">
          <div className="container footer-inner">
            <div className="footer-brand">
              <div className="footer-brand-title">ВетКлиника Online</div>
              <p className="footer-brand-text">
                Цифровой сервис для записи на приём, ведения медкарт и работы персонала клиники.
              </p>
              <span className="muted">© {year} ВетКлиника Online</span>
            </div>
            <div className="footer-links">
              <div className="footer-col">
                <div className="footer-col-title">Разделы</div>
                <Link to="/">Главная</Link>
                <Link to="/services">Услуги</Link>
                <Link to="/appointments">Записи</Link>
              </div>
              <div className="footer-col">
                <div className="footer-col-title">Рабочие страницы</div>
                <Link to="/medical-records">Медкарты</Link>
                <Link to="/doctor">Врачам</Link>
                <Link to="/reports">Отчёты</Link>
              </div>
              <div className="footer-col">
                <div className="footer-col-title">Контакты</div>
                <a href="tel:+375291234567">+375 (29) 123-45-67</a>
                <a href="mailto:info@vetclinic.local">info@vetclinic.local</a>
                <Link to="/contacts">Адрес и график</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
