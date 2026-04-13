import { Link } from "react-router-dom";

/** В прототипе нет регистрации — только демо-логин. */
export function RegisterPage() {
  return (
    <div className="auth-page">
      <a className="skip-link" href="#auth-main">
        Перейти к тексту
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="brand-mark" aria-hidden="true">
              🐾
            </span>
            <span className="brand-name">ВетКлиника Online</span>
          </Link>
          <Link className="nav-link" to="/login">
            Вход
          </Link>
        </div>
      </header>

      <main id="auth-main" className="auth-main">
        <div className="container">
          <div className="auth-card hero-panel">
            <h1 className="auth-title">Регистрация</h1>
            <p className="auth-lead">
              В этом прототипе регистрация не реализована: используйте тестовый вход{" "}
              <strong>demo@vet.local</strong> / <strong>demo123</strong>.
            </p>
            <p className="auth-switch">
              <Link className="btn btn-primary" to="/login">
                Перейти ко входу
              </Link>
            </p>
            <p className="auth-switch">
              <Link to="/">На главную</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
