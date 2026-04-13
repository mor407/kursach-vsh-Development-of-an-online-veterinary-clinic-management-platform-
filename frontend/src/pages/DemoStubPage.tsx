import { Link } from "react-router-dom";

/** Заглушка для маршрутов вне главной — в демо-репозитории нет остальных страниц. */
export function DemoStubPage() {
  return (
    <main id="main" className="page">
      <div className="container container--wide demo-stub">
        <h1 className="demo-stub-title">Демо-режим</h1>
        <p className="demo-stub-text">
          В этом репозитории выложена только <strong>главная страница</strong> курсового проекта
          «ВетКлиника&nbsp;Online». Каталог услуг, записи, личный кабинет и API — в полной версии
          приложения.
        </p>
        <Link className="btn btn-primary" to="/">
          Вернуться на главную
        </Link>
      </div>
    </main>
  );
}
