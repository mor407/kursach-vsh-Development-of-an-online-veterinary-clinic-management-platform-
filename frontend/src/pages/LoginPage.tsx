import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiPath } from "../lib/api";
import { TOKEN_KEY, USER_KEY } from "../lib/authStorage";

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    setLoading(true);
    try {
      const res = await fetch(apiPath("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Не удалось войти");
        return;
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      navigate("/");
    } catch {
      setError("Нет связи с сервером. Запустите backend: cd prototype/backend && npm run dev");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <a className="skip-link" href="#auth-main">
        Перейти к форме
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="brand-mark" aria-hidden="true">
              🐾
            </span>
            <span className="brand-name">ВетКлиника Online</span>
          </Link>
          <Link className="nav-link" to="/register">
            О демо-регистрации
          </Link>
        </div>
      </header>

      <main id="auth-main" className="auth-main">
        <div className="container">
          <div className="auth-card hero-panel">
            <h1 className="auth-title">Вход (демо)</h1>
            <p className="auth-lead">
              Тестовый аккаунт прототипа: <strong>demo@vet.local</strong> / <strong>demo123</strong>
            </p>
            <form className="form" onSubmit={onSubmit}>
              {error ? (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              ) : null}
              <label className="field">
                <span className="field-label">Email</span>
                <input className="input" type="email" name="email" autoComplete="email" required />
              </label>
              <label className="field">
                <span className="field-label">Пароль</span>
                <input
                  className="input"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
                {loading ? "Вход…" : "Войти"}
              </button>
            </form>
            <p className="auth-switch">
              <Link to="/">На главную</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
