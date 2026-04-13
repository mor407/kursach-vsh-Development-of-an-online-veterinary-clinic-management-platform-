import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { APPOINTMENT_STATUS_LABELS, formatAppointmentDate } from "../lib/appointmentLabels";
import { fetchApi } from "../lib/api";
import { getToken } from "../lib/authStorage";
import type { Appointment } from "../types/appointment";
import type { MeUser } from "../types/user";

/** Герой-баннер: файл из public/images/ */
const HERO_IMAGE = "/images/home-hero-banner.png";
const WIDGET_STRIP_IMAGE = "/images/home-vet-care.jpg";
const SPLIT_LOOP_GIF = "/images/home-split-loop.gif";

export function HomePage() {
  const [loggedIn, setLoggedIn] = useState(() => Boolean(getToken()));
  const [me, setMe] = useState<MeUser | null>(null);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [widgetLoading, setWidgetLoading] = useState(false);

  useEffect(() => {
    const hasToken = Boolean(getToken());
    setLoggedIn(hasToken);
    if (!hasToken) {
      setMe(null);
      setNextAppointment(null);
      return;
    }

    let cancelled = false;
    setWidgetLoading(true);
    Promise.all([fetchApi("/api/me"), fetchApi("/api/appointments?order=asc")])
      .then(async ([meRes, apptRes]) => {
        const user = meRes.ok ? ((await meRes.json()) as MeUser) : null;
        const appts = apptRes.ok ? ((await apptRes.json()) as Appointment[]) : [];
        if (cancelled) return;
        setMe(user);
        const now = Date.now();
        const upcoming = (Array.isArray(appts) ? appts : []).find((a) => {
          const ts = new Date(a.scheduledAt).getTime();
          return Number.isFinite(ts) && ts >= now && a.status !== "cancelled";
        });
        setNextAppointment(upcoming ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setMe(null);
          setNextAppointment(null);
        }
      })
      .finally(() => {
        if (!cancelled) setWidgetLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const roleName = me?.role.name;
  const widgetTitle =
    roleName === "doctor" || roleName === "admin" ? "Ближайший приём" : "Ближайшая запись";
  const statusClass = nextAppointment
    ? `home-widget-status home-widget-status--${nextAppointment.status}`
    : "home-widget-status";

  return (
    <main id="main" className="page page--home">
      <section
        className="home-hero-masthead"
        style={{ "--home-hero-image": `url(${HERO_IMAGE})` } as CSSProperties}
      >
        <div className="home-hero-masthead-edge home-hero-masthead-edge--left" aria-hidden="true" />
        <div className="home-hero-masthead-edge home-hero-masthead-edge--right" aria-hidden="true" />
        <div className="container container--wide home-hero-masthead-layout">
          <div className="home-hero-masthead-copy">
            <div className="home-hero-masthead-glass">
              <p className="home-hero-masthead-kicker">ВетКлиника Online</p>
              <h1 className="home-hero-masthead-title">Забота о питомце начинается с простой записи</h1>
              <p className="home-hero-masthead-lead">
                Онлайн-запись, история визитов и рекомендации — всё в одном спокойном сервисе для вас и
                вашего хвоста.
              </p>
              <div className="hero-actions home-hero-masthead-actions" id="appointment">
                <Link className="btn btn-primary" to="/appointments">
                  Записаться на приём
                </Link>
                <Link className="btn btn-hero-outline" to={loggedIn ? "/pets" : "/register"}>
                  {loggedIn ? "Мои питомцы" : "Создать аккаунт"}
                </Link>
              </div>
            </div>
            <ul className="home-hero-masthead-highlights">
              <li>Онлайн-запись</li>
              <li>Статус приёма</li>
              <li>Медкарта питомца</li>
            </ul>
          </div>
        </div>
        <div className="home-hero-masthead-accent" aria-hidden="true" />
      </section>

      <section className="home-hero-widgets" aria-label="Ближайшая запись">
        <div className="container container--wide home-hero-widgets-inner">
          <aside className="home-hero-widget-panel">
            <div className="home-widget-card">
              <p className="home-widget-label">{widgetTitle}</p>
              {!loggedIn ? (
                <>
                  <h3 className="home-widget-title">Войдите, чтобы увидеть ближайший визит</h3>
                  <p className="home-widget-text">
                    После входа здесь отображается ближайшая запись и её статус.
                  </p>
                </>
              ) : widgetLoading ? (
                <>
                  <h3 className="home-widget-title">Загружаем данные...</h3>
                  <p className="home-widget-text">Проверяем ваши ближайшие записи.</p>
                </>
              ) : nextAppointment ? (
                <>
                  <h3 className="home-widget-title">
                    {formatAppointmentDate(nextAppointment.scheduledAt)} — {nextAppointment.service.name}
                  </h3>
                  <p className="home-widget-text">
                    Питомец: {nextAppointment.pet.name}, врач: {nextAppointment.veterinarian.fullName}
                  </p>
                  <div className={statusClass}>
                    {APPOINTMENT_STATUS_LABELS[nextAppointment.status] ?? nextAppointment.status}
                  </div>
                </>
              ) : (
                <>
                  <h3 className="home-widget-title">Ближайших записей пока нет</h3>
                  <p className="home-widget-text">Выберите услугу и время, чтобы оформить первый приём.</p>
                </>
              )}
            </div>

            <div className="home-widget-card home-widget-card--small">
              <p className="home-widget-label">После записи</p>
              <ul className="home-widget-list">
                <li>Понятный статус визита</li>
                <li>Напоминание о дате приёма</li>
                <li>История и советы в карточке питомца</li>
              </ul>
            </div>
          </aside>

          <div className="home-hero-widget-photo" aria-hidden="true">
            <img src={WIDGET_STRIP_IMAGE} alt="" className="home-hero-widget-photo-img" loading="lazy" />
          </div>
        </div>
      </section>

      <section className="section home-features-section">
        <div className="container container--wide">
          <h2 className="section-title section-title--center">Почему с нами спокойнее</h2>
          <p className="section-lead section-lead--center">
            Всё необходимое для записи и сопровождения визита — без лишнего шума.
          </p>
          <div className="home-feature-grid" role="list">
            <article className="home-feature-card" role="listitem">
              <div className="home-feature-icon" aria-hidden="true">
                🐾
              </div>
              <h3 className="home-feature-title">Онлайн-запись</h3>
              <p className="home-feature-text">Выбираете услугу и удобное время без звонков и ожидания.</p>
            </article>
            <article className="home-feature-card" role="listitem">
              <div className="home-feature-icon" aria-hidden="true">
                📋
              </div>
              <h3 className="home-feature-title">История питомца</h3>
              <p className="home-feature-text">Визиты и рекомендации собраны в одной карточке питомца.</p>
            </article>
            <article className="home-feature-card" role="listitem">
              <div className="home-feature-icon" aria-hidden="true">
                🛡️
              </div>
              <h3 className="home-feature-title">Прозрачный статус</h3>
              <p className="home-feature-text">Видно, подтверждена ли запись, переносится или уже завершена.</p>
            </article>
            <article className="home-feature-card" role="listitem">
              <div className="home-feature-icon" aria-hidden="true">
                💉
              </div>
              <h3 className="home-feature-title">Уход и профилактика</h3>
              <p className="home-feature-text">Прививки, осмотры и плановые визиты — всё можно заранее спланировать.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section home-split-section">
        <div className="container container--wide home-split">
          <div className="home-split-text">
            <h2 className="home-split-title">Ветеринария, которая укладывается в ваш день</h2>
            <p className="home-split-lead">
              Сервис помогает не забыть про здоровье питомца: записаться, отследить статус и вернуться к
              назначениям врача в любой момент.
            </p>
            <p className="home-split-lead">
              После приёма вся важная информация остаётся в вашем аккаунте — удобно и для одного питомца, и
              для целого «зверинца».
            </p>
            <Link className="btn btn-primary" to="/services">
              Смотреть услуги
            </Link>
          </div>
          <div className="home-split-visual">
            <img
              src={SPLIT_LOOP_GIF}
              alt="Забота о питомце"
              className="home-split-img home-split-video"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container container--wide">
          <h2 className="section-title section-title--center">Как это работает</h2>
          <div className="home-flow" role="list">
            <article className="home-flow-item" role="listitem">
              <span className="home-flow-step">01</span>
              <h3>Создаёте питомца</h3>
              <p>Добавляете карточку питомца и базовые данные для дальнейших приёмов.</p>
            </article>
            <article className="home-flow-item" role="listitem">
              <span className="home-flow-step">02</span>
              <h3>Оформляете запись</h3>
              <p>Выбираете услугу, врача и удобное время — заявка сразу у клиники.</p>
            </article>
            <article className="home-flow-item" role="listitem">
              <span className="home-flow-step">03</span>
              <h3>Следите за результатом</h3>
              <p>После визита рекомендации и история хранятся в карточке питомца.</p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
