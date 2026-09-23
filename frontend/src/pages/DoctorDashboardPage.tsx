import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageContent } from "../components/PageContent";
import {
  APPOINTMENT_STATUS_LABELS,
  formatAppointmentDate,
} from "../lib/appointmentLabels";
import { fetchApi } from "../lib/api";
import { getToken } from "../lib/authStorage";
import type { Appointment } from "../types/appointment";
import type { MeUser } from "../types/user";
import "../styles/pages/doctor-dashboard.css";

const STATUS_OPTIONS = Object.keys(APPOINTMENT_STATUS_LABELS);

function calendarDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayFromIso(iso: string) {
  const x = new Date(iso);
  return calendarDay(x);
}

function isToday(iso: string) {
  return dayFromIso(iso) === calendarDay(new Date());
}

function isUpcomingInWeek(iso: string) {
  const t = calendarDay(new Date());
  const end = t + 7 * 86400000;
  const x = dayFromIso(iso);
  return x > t && x <= end;
}

function matchesQuery(a: Appointment, query: string) {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return (
    a.pet.name.toLowerCase().includes(q) ||
    a.pet.species.toLowerCase().includes(q) ||
    a.service.name.toLowerCase().includes(q) ||
    a.veterinarian.fullName.toLowerCase().includes(q)
  );
}

function initials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "В";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function DoctorDashboardPage() {
  const [me, setMe] = useState<MeUser | null>(null);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const hasToken = Boolean(getToken());
  const role = me?.role.name;
  const allowed = role === "doctor" || role === "admin";

  const loadAppts = useCallback(async () => {
    setError(null);
    const res = await fetchApi("/api/appointments?order=asc");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setAppts([]);
      setError(typeof data.error === "string" ? data.error : "Не удалось загрузить записи");
      return;
    }
    setAppts(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    if (!hasToken) {
      setLoading(false);
      setMe(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchApi("/api/me")
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as MeUser;
      })
      .then(async (user) => {
        if (cancelled) return;
        setMe(user);
        if (user?.role.name === "doctor" || user?.role.name === "admin") {
          await loadAppts();
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Нет связи с сервером");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hasToken, loadAppts]);

  const todayList = useMemo(
    () => appts.filter((a) => isToday(a.scheduledAt) && a.status !== "cancelled"),
    [appts],
  );
  const upcomingList = useMemo(
    () =>
      appts.filter(
        (a) =>
          isUpcomingInWeek(a.scheduledAt) &&
          !isToday(a.scheduledAt) &&
          a.status !== "cancelled",
      ),
    [appts],
  );

  const summary = useMemo(() => {
    const pending = appts.filter((a) => a.status === "pending").length;
    const completed = appts.filter((a) => a.status === "completed").length;
    return {
      today: todayList.length,
      week: upcomingList.length,
      pending,
      completed,
    };
  }, [appts, todayList.length, upcomingList.length]);

  const statusCounters = useMemo(() => {
    const pending = appts.filter((a) => a.status === "pending").length;
    const confirmed = appts.filter((a) => a.status === "confirmed").length;
    const completed = appts.filter((a) => a.status === "completed").length;
    const cancelled = appts.filter((a) => a.status === "cancelled").length;
    return { pending, confirmed, completed, cancelled };
  }, [appts]);

  const filteredToday = useMemo(
    () =>
      todayList.filter(
        (a) => matchesQuery(a, query) && (statusFilter ? a.status === statusFilter : true),
      ),
    [todayList, query, statusFilter],
  );

  const filteredUpcoming = useMemo(
    () =>
      upcomingList.filter(
        (a) => matchesQuery(a, query) && (statusFilter ? a.status === statusFilter : true),
      ),
    [upcomingList, query, statusFilter],
  );

  async function patchStatus(id: number, status: string) {
    setRowBusy(id);
    setError(null);
    try {
      const res = await fetchApi(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Не удалось сохранить");
        return;
      }
      await loadAppts();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setRowBusy(null);
    }
  }

  if (!hasToken) {
    return (
      <PageContent title="Кабинет врача" lead="Войдите под учётной записью врача или администратора.">
        <p className="page-placeholder">
          <Link className="text-link" to="/login">
            Войти
          </Link>
        </p>
      </PageContent>
    );
  }

  if (!loading && me && !allowed) {
    return (
      <PageContent title="Кабинет врача" lead="Раздел только для врача и администратора.">
        <p className="page-placeholder">
          <Link className="text-link" to="/">
            На главную
          </Link>
        </p>
      </PageContent>
    );
  }

  return (
    <PageContent
      title="Кабинет врача"
      lead={
        role === "admin"
          ? "Сводка по всем приёмам клиники. Быстрый просмотр и смена статусов."
          : "Ваши приёмы на сегодня и на неделю вперёд. Полный список — в разделе «Записи»."
      }
    >
      {loading ? <p className="services-status">Загрузка…</p> : null}
      {error ? (
        <p className="services-banner services-banner--error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && allowed ? (
        <>
          <section className="doctor-profile-card" aria-label="Профиль специалиста">
            <div className="doctor-profile-avatar" aria-hidden="true">
              {initials(me?.fullName ?? "Врач")}
            </div>
            <div className="doctor-profile-main">
              <p className="doctor-profile-kicker">Профиль специалиста</p>
              <h2 className="doctor-profile-name">{me?.fullName}</h2>
              <p className="doctor-profile-role">
                {me?.veterinarian?.specialization ?? "Специалист клиники"}
              </p>
              <div className="doctor-profile-meta">
                <span>{me?.email}</span>
                {me?.phone ? <span>{me.phone}</span> : <span>Телефон не указан</span>}
                {me?.veterinarian?.licenseNumber ? (
                  <span>Лицензия: {me.veterinarian.licenseNumber}</span>
                ) : null}
              </div>
            </div>
          </section>

          <section className="doctor-dash-insights" aria-label="Сводка кабинета врача">
            <article className="doctor-dash-stat-card">
              <span className="doctor-dash-stat-label">Сегодня</span>
              <strong className="doctor-dash-stat-value">{summary.today}</strong>
            </article>
            <article className="doctor-dash-stat-card">
              <span className="doctor-dash-stat-label">Следующие 7 дней</span>
              <strong className="doctor-dash-stat-value">{summary.week}</strong>
            </article>
            <article className="doctor-dash-stat-card">
              <span className="doctor-dash-stat-label">Ожидают подтверждения</span>
              <strong className="doctor-dash-stat-value">{summary.pending}</strong>
            </article>
            <article className="doctor-dash-stat-card">
              <span className="doctor-dash-stat-label">Завершено</span>
              <strong className="doctor-dash-stat-value">{summary.completed}</strong>
            </article>
          </section>

          <section className="doctor-dash-controls" aria-label="Фильтры кабинета врача">
            <label className="services-field">
              <span className="services-field-label">Поиск по питомцу, услуге, врачу</span>
              <input
                className="input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Например: УЗИ или Барсик"
              />
            </label>
          </section>
          <section className="doctor-dash-quick-filters" aria-label="Быстрые фильтры по статусу">
            <button
              type="button"
              className={`doctor-dash-chip${statusFilter === "" ? " is-active" : ""}`}
              onClick={() => setStatusFilter("")}
            >
              Все ({appts.length})
            </button>
            <button
              type="button"
              className={`doctor-dash-chip${statusFilter === "pending" ? " is-active" : ""}`}
              onClick={() => setStatusFilter("pending")}
            >
              Ожидают ({statusCounters.pending})
            </button>
            <button
              type="button"
              className={`doctor-dash-chip${statusFilter === "confirmed" ? " is-active" : ""}`}
              onClick={() => setStatusFilter("confirmed")}
            >
              Подтверждённые ({statusCounters.confirmed})
            </button>
            <button
              type="button"
              className={`doctor-dash-chip${statusFilter === "completed" ? " is-active" : ""}`}
              onClick={() => setStatusFilter("completed")}
            >
              Завершённые ({statusCounters.completed})
            </button>
            <button
              type="button"
              className={`doctor-dash-chip${statusFilter === "cancelled" ? " is-active" : ""}`}
              onClick={() => setStatusFilter("cancelled")}
            >
              Отменённые ({statusCounters.cancelled})
            </button>
          </section>

          <section className="doctor-dash-section" aria-labelledby="dash-today">
            <h2 id="dash-today" className="doctor-dash-heading">
              Сегодня ({filteredToday.length})
            </h2>
            {filteredToday.length === 0 ? (
              <p className="services-status">На сегодня активных записей нет.</p>
            ) : (
              <DashTable
                rows={filteredToday}
                rowBusy={rowBusy}
                onStatusChange={patchStatus}
                showVetColumn={role === "admin"}
              />
            )}
          </section>

          <section className="doctor-dash-section" aria-labelledby="dash-week">
            <h2 id="dash-week" className="doctor-dash-heading">
              Следующие 7 дней ({filteredUpcoming.length})
            </h2>
            {filteredUpcoming.length === 0 ? (
              <p className="services-status">В ближайшую неделю нет других записей.</p>
            ) : (
              <DashTable
                rows={filteredUpcoming}
                rowBusy={rowBusy}
                onStatusChange={patchStatus}
                showVetColumn={role === "admin"}
              />
            )}
          </section>
        </>
      ) : null}
    </PageContent>
  );
}

type DashProps = {
  rows: Appointment[];
  rowBusy: number | null;
  onStatusChange: (id: number, status: string) => void;
  showVetColumn: boolean;
};

function DashTable({ rows, rowBusy, onStatusChange, showVetColumn }: DashProps) {
  return (
    <div className="services-table-wrap">
      <table className="services-table appt-table">
        <caption className="visually-hidden">Приёмы</caption>
        <thead>
          <tr>
            <th scope="col">Дата и время</th>
            <th scope="col">Питомец</th>
            <th scope="col">Услуга</th>
            {showVetColumn ? <th scope="col">Врач</th> : null}
            <th scope="col">Статус</th>
            <th scope="col">Быстрое действие</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td>{formatAppointmentDate(a.scheduledAt)}</td>
              <td>
                {a.pet.name}
                <div className="pets-owner-email">{a.pet.species}</div>
              </td>
              <td className="services-table-desc">{a.service.name}</td>
              {showVetColumn ? (
                <td>
                  {a.veterinarian.fullName}
                  <div className="pets-owner-email">{a.veterinarian.specialization}</div>
                </td>
              ) : null}
              <td className="appt-actions">
                <label className="appt-status-select-wrap">
                  <span className="visually-hidden">Статус</span>
                  <select
                    className="input select-input"
                    value={a.status}
                    disabled={rowBusy === a.id}
                    onChange={(e) => onStatusChange(a.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {APPOINTMENT_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>
              </td>
              <td className="appt-actions">
                {a.status === "pending" ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={rowBusy === a.id}
                    onClick={() => onStatusChange(a.id, "confirmed")}
                  >
                    Подтвердить
                  </button>
                ) : a.status === "confirmed" ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={rowBusy === a.id}
                    onClick={() => onStatusChange(a.id, "completed")}
                  >
                    Завершить
                  </button>
                ) : (
                  <span className="pets-owner-email">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
