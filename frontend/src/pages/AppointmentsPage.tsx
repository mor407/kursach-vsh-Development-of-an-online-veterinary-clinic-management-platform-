import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Modal } from "../components/Modal";
import { PageContent } from "../components/PageContent";
import {
  APPOINTMENT_STATUS_LABELS,
  formatAppointmentDate,
  toDatetimeLocalInputValue,
} from "../lib/appointmentLabels";
import {
  defaultAppointmentsPrefs,
  loadAppointmentsPrefs,
  resetAppointmentsPrefs,
  saveAppointmentsPrefs,
  type AppointmentsPrefs,
} from "../lib/appointmentsPrefs";
import { apiPath, fetchApi } from "../lib/api";
import { getToken } from "../lib/authStorage";
import type { Appointment } from "../types/appointment";
import "../styles/pages/appointments.css";
import type { MeUser } from "../types/user";
import type { Pet } from "../types/pet";
import type { Service } from "../types/service";
import type { VeterinarianBrief } from "../types/veterinarian";

const STATUS_OPTIONS = Object.keys(APPOINTMENT_STATUS_LABELS);
const WORKING_HOURS_HINT = "Рабочие часы: Пн–Пт 08:00–21:00, Сб 09:00–18:00, Вс 10:00–16:00.";

function isWithinClinicWorkingHours(date: Date): boolean {
  const day = date.getDay(); // 0: Sunday ... 6: Saturday
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (day >= 1 && day <= 5) return minutes >= 8 * 60 && minutes < 21 * 60;
  if (day === 6) return minutes >= 9 * 60 && minutes < 18 * 60;
  return minutes >= 10 * 60 && minutes < 16 * 60;
}

export function AppointmentsPage() {
  const [searchParams] = useSearchParams();
  const lastServiceIdFromUrl = useRef<number | null>(null);
  const lastVeterinarianIdFromUrl = useRef<number | null>(null);

  const [me, setMe] = useState<MeUser | null>(null);
  const [prefs, setPrefs] = useState<AppointmentsPrefs>(() => loadAppointmentsPrefs());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [veterinarians, setVeterinarians] = useState<VeterinarianBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<number | null>(null);

  const [petId, setPetId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [veterinarianId, setVeterinarianId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const hasToken = Boolean(getToken());
  const role = me?.role.name;
  const isClient = role === "client";
  const isDoctor = role === "doctor";
  const isAdmin = role === "admin";

  useEffect(() => {
    saveAppointmentsPrefs(prefs);
  }, [prefs]);

  const loadData = useCallback(async () => {
    if (!me) return;
    setError(null);
    const q = new URLSearchParams();
    if (prefs.status) q.set("status", prefs.status);
    q.set("order", prefs.order);

    const apRes = await fetchApi(`/api/appointments?${q}`);
    const apJson = await apRes.json().catch(() => ({}));
    if (!apRes.ok) {
      setAppointments([]);
      setError(typeof apJson.error === "string" ? apJson.error : "Ошибка списка записей");
      return;
    }
    setAppointments(Array.isArray(apJson) ? apJson : []);

    const svcRes = await fetch(apiPath(`/api/services?sort=name&order=asc`));
    const svcJson = await svcRes.json().catch(() => []);
    setServices(Array.isArray(svcJson) ? svcJson : []);

    const vetRes = await fetchApi("/api/veterinarians");
    const vetJson = await vetRes.json().catch(() => []);
    if (vetRes.ok && Array.isArray(vetJson)) {
      setVeterinarians(vetJson);
    } else {
      setVeterinarians([]);
    }

    if (isClient || isAdmin) {
      const petRes = await fetchApi("/api/pets");
      const petJson = await petRes.json().catch(() => []);
      if (petRes.ok && Array.isArray(petJson)) {
        setPets(petJson);
      } else {
        setPets([]);
      }
    } else {
      setPets([]);
    }
  }, [me, prefs.status, prefs.order, isClient, isAdmin]);

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
      .then((user) => {
        if (cancelled) return;
        if (!user) {
          setMe(null);
          setError("Не удалось загрузить профиль. Войдите снова.");
          setLoading(false);
          return;
        }
        setMe(user);
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
  }, [hasToken]);

  useEffect(() => {
    if (!me) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadData()
      .catch(() => {
        if (!cancelled) setError("Нет связи с сервером");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [me, loadData]);

  useEffect(() => {
    if (services.length === 0 || !me) return;
    const raw = searchParams.get("serviceId");
    if (!raw) return;
    const id = Number(raw);
    if (!Number.isInteger(id) || id < 1) return;
    if (!services.some((s) => s.id === id)) return;
    if (lastServiceIdFromUrl.current === id) return;
    lastServiceIdFromUrl.current = id;
    setServiceId(String(id));
    if (me.role.name === "client") {
      setCreateModalOpen(true);
    }
  }, [searchParams, services, me]);

  useEffect(() => {
    if (veterinarians.length === 0 || !me) return;
    const raw = searchParams.get("veterinarianId");
    if (!raw) return;
    const id = Number(raw);
    if (!Number.isInteger(id) || id < 1) return;
    if (!veterinarians.some((v) => v.id === id)) return;
    if (lastVeterinarianIdFromUrl.current === id) return;
    lastVeterinarianIdFromUrl.current = id;
    setVeterinarianId(String(id));
    if (me.role.name === "client") {
      setCreateModalOpen(true);
    }
  }, [searchParams, veterinarians, me]);

  function resetFilters() {
    setPrefs({ ...defaultAppointmentsPrefs });
    resetAppointmentsPrefs();
  }

  async function onCreateSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isClient) return;
    setFormError(null);
    setBusy(true);
    try {
      const pid = Number(petId);
      const sid = Number(serviceId);
      const vid = Number(veterinarianId);
      if (!Number.isInteger(pid) || !Number.isInteger(sid) || !Number.isInteger(vid)) {
        setFormError("Выберите питомца, услугу и врача");
        setBusy(false);
        return;
      }
      if (!scheduledAt.trim()) {
        setFormError("Укажите дату и время");
        setBusy(false);
        return;
      }
      const selected = new Date(scheduledAt);
      if (Number.isNaN(selected.getTime())) {
        setFormError("Некорректная дата");
        setBusy(false);
        return;
      }
      if (selected.getTime() < Date.now() - 60_000) {
        setFormError("Выберите будущую дату и время");
        setBusy(false);
        return;
      }
      if (!isWithinClinicWorkingHours(selected)) {
        setFormError(`Запись доступна только в рабочие часы клиники. ${WORKING_HOURS_HINT}`);
        setBusy(false);
        return;
      }
      const res = await fetchApi("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId: pid,
          serviceId: sid,
          veterinarianId: vid,
          scheduledAt: selected.toISOString(),
          clientNotes: clientNotes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(typeof data.error === "string" ? data.error : "Не удалось создать запись");
        setBusy(false);
        return;
      }
      setPetId("");
      setServiceId("");
      setVeterinarianId("");
      setScheduledAt("");
      setClientNotes("");
      setCreateModalOpen(false);
      await loadData();
    } catch {
      setFormError("Нет связи с сервером");
    } finally {
      setBusy(false);
    }
  }

  async function patchRow(
    id: number,
    body: Record<string, string | null | undefined>,
  ) {
    setFormError(null);
    if (body.scheduledAt != null) {
      const selected = new Date(String(body.scheduledAt));
      if (Number.isNaN(selected.getTime())) {
        setFormError("Некорректная дата");
        return;
      }
      if (selected.getTime() < Date.now() - 60_000) {
        setFormError("Выберите будущую дату и время");
        return;
      }
      if (!isWithinClinicWorkingHours(selected)) {
        setFormError(`Запись доступна только в рабочие часы клиники. ${WORKING_HOURS_HINT}`);
        return;
      }
    }
    setRowBusy(id);
    try {
      const res = await fetchApi(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(typeof data.error === "string" ? data.error : "Не удалось сохранить");
        return;
      }
      await loadData();
    } catch {
      setFormError("Нет связи с сервером");
    } finally {
      setRowBusy(null);
    }
  }

  function minDatetimeLocal(): string {
    const d = new Date(Date.now() + 3600000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  if (!hasToken) {
    return (
      <PageContent
        title="Записи на приём"
        lead="Войдите как клиент, чтобы оформить приём, или как врач / администратор для управления расписанием."
      >
        <p className="page-placeholder">
          <Link className="text-link" to="/login">
            Войти
          </Link>{" "}
          или{" "}
          <Link className="text-link" to="/register">
            зарегистрироваться
          </Link>
          .
        </p>
      </PageContent>
    );
  }

  return (
    <PageContent
      title="Записи на приём"
      lead="Управляйте расписанием, статусами и комментариями в одном месте. Настройки фильтров сохраняются локально до ручного сброса."
    >
      {loading && hasToken ? (
        <div className="appointments-catalog" aria-busy="true">
          <div className="appointments-skeleton-grid" aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="services-skeleton-card appointments-skeleton-card" />
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="services-banner services-banner--error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && me ? (
        <>
          <section className="appointments-intro" aria-label="Как устроен раздел">
            {isClient ? (
              <>
                <p className="appointments-intro-lead">
                  Выберите питомца, услугу и врача — мы сразу покажем запись в списке. Время можно сдвинуть,
                  пока визит не завершён или отменён; комментарий уточните в любой момент.
                </p>
                <ul className="appointments-intro-points">
                  <li>Статус «ожидает» или «подтверждена» — вы ещё можете перенести или отменить</li>
                  <li>Пришли из каталога услуг с ссылкой — форма откроется уже с выбранной услугой</li>
                  <li>Нет питомца в списке — сначала добавьте его в разделе «Питомцы»</li>
                </ul>
              </>
            ) : isDoctor ? (
              <>
                <p className="appointments-intro-lead">
                  Здесь ваши приёмы в хронологическом порядке. Читайте комментарий клиента перед визитом и
                  обновляйте статус по факту: от подтверждения до завершения или отмены.
                </p>
                <ul className="appointments-intro-points">
                  <li>Комментарий открывается отдельной кнопкой — удобно на планшете</li>
                  <li>Фильтр по статусу помогает не потеряться в списке</li>
                </ul>
              </>
            ) : (
              <>
                <p className="appointments-intro-lead">
                  Обзор записей по клинике: кто, к какому врачу и на какую услугу. Редактируйте статус и
                  комментарии там, где это нужно по регламенту.
                </p>
                <ul className="appointments-intro-points">
                  <li>Сортировка по дате и фильтр по статусу — как у клиента и врача</li>
                  <li>Сброс настроек затрагивает только эту страницу</li>
                </ul>
              </>
            )}
          </section>

          {formError ? (
            <p className="services-banner services-banner--error" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="services-toolbar appointments-toolbar">
            <label className="services-field services-field--narrow">
              <span className="services-field-label">Статус</span>
              <select
                className="input select-input"
                value={prefs.status}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    status: e.target.value,
                  }))
                }
              >
                <option value="">Все</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {APPOINTMENT_STATUS_LABELS[s] ?? s}
                  </option>
                ))}
              </select>
            </label>
            <label className="services-field services-field--narrow">
              <span className="services-field-label">Дата приёма</span>
              <select
                className="input select-input"
                value={prefs.order}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    order: e.target.value as AppointmentsPrefs["order"],
                  }))
                }
              >
                <option value="desc">Сначала новые</option>
                <option value="asc">Сначала ранние</option>
              </select>
            </label>
            <button type="button" className="btn btn-ghost services-reset" onClick={resetFilters}>
              Сбросить настройки
            </button>
            {isClient ? (
              <button
                type="button"
                className="btn btn-primary services-add-btn"
                onClick={() => {
                  setFormError(null);
                  setCreateModalOpen(true);
                }}
              >
                Новая запись
              </button>
            ) : null}
          </div>
          <div className="appointments-catalog">
            {appointments.length === 0 ? (
              <div className="appointments-empty">
                <p className="appointments-empty-title">Пока пусто по этим условиям</p>
                <p className="appointments-empty-text">
                  {isClient
                    ? "Смените фильтр по статусу или создайте новую запись. Если только что оформляли приём — обновление уже в этом списке."
                    : "Попробуйте сбросить фильтры или выберите другой статус. Если записей в системе ещё нет — они появятся после бронирования клиентами."}
                </p>
                {isClient ? (
                  <div className="appointments-empty-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        setFormError(null);
                        setCreateModalOpen(true);
                      }}
                    >
                      Записаться
                    </button>
                    <Link className="btn btn-ghost" to="/services">
                      Каталог услуг
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="appointments-grid" role="list">
                {appointments.map((a) => (
                  <AppointmentCard
                    key={a.id}
                    a={a}
                    isClient={isClient}
                    isDoctor={isDoctor}
                    isAdmin={isAdmin}
                    rowBusy={rowBusy}
                    onPatch={patchRow}
                  />
                ))}
              </div>
            )}
          </div>

          <section className="appointments-cta" aria-label="Полезные ссылки">
            <div className="appointments-cta-inner">
              <div>
                <h2 className="appointments-cta-title">Рядом с расписанием</h2>
                <p className="appointments-cta-text">
                  {isClient
                    ? "Уточните услугу, пополните карточки питомцев или напишите нам, если нужна консультация до визита."
                    : "Контакты и каталог услуг — под рукой, если клиент просит подсказать формат приёма."}
                </p>
              </div>
              <div className="appointments-cta-buttons">
                <Link className="btn btn-primary" to="/services">
                  Услуги и цены
                </Link>
                {isClient ? (
                  <Link className="btn btn-ghost" to="/pets">
                    Мои питомцы
                  </Link>
                ) : null}
                <Link className="btn btn-ghost" to="/contacts">
                  Контакты
                </Link>
              </div>
            </div>
          </section>
        </>
      ) : null}

      <Modal
        title="Новая запись"
        open={isClient && createModalOpen}
        wide
        onClose={() => {
          if (!busy) setCreateModalOpen(false);
        }}
      >
        {pets.length === 0 ? (
          <p className="page-placeholder">
            Сначала добавьте питомца в разделе{" "}
            <Link className="text-link" to="/pets">
              Питомцы
            </Link>
            .
          </p>
        ) : (
          <form className="form" onSubmit={onCreateSubmit}>
            <div className="services-admin-row">
              <label className="field">
                <span className="field-label">Питомец</span>
                <select
                  className="input select-input"
                  value={petId}
                  onChange={(e) => setPetId(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Выберите
                  </option>
                  {pets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.species})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Услуга</span>
                <select
                  className="input select-input"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Выберите
                  </option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              <span className="field-label">Врач</span>
              <select
                className="input select-input"
                value={veterinarianId}
                onChange={(e) => setVeterinarianId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Выберите
                </option>
                {veterinarians.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.fullName} — {v.specialization}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Дата и время</span>
              <input
                className="input"
                type="datetime-local"
                value={scheduledAt}
                min={minDatetimeLocal()}
                step={1800}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
              <span className="field-hint">{WORKING_HOURS_HINT}</span>
            </label>
            <label className="field">
              <span className="field-label">Комментарий</span>
              <textarea
                className="input services-textarea"
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                rows={3}
                placeholder="Симптомы, пожелания по времени…"
              />
            </label>
            <div className="modal-footer-actions">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "Отправка…" : "Записаться"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => setCreateModalOpen(false)}
              >
                Отмена
              </button>
            </div>
          </form>
        )}
      </Modal>
    </PageContent>
  );
}

type CardProps = {
  a: Appointment;
  isClient: boolean;
  isDoctor: boolean;
  isAdmin: boolean;
  rowBusy: number | null;
  onPatch: (id: number, body: Record<string, string | null | undefined>) => void;
};

function AppointmentCard({ a, isClient, isDoctor, isAdmin, rowBusy, onPatch }: CardProps) {
  const [editingTime, setEditingTime] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [localTime, setLocalTime] = useState(toDatetimeLocalInputValue(a.scheduledAt));
  const [localNotes, setLocalNotes] = useState(a.clientNotes ?? "");
  const disabled = rowBusy === a.id;
  const commentReadOnlyModal = isDoctor;

  useEffect(() => {
    setLocalTime(toDatetimeLocalInputValue(a.scheduledAt));
    setLocalNotes(a.clientNotes ?? "");
    setEditingTime(false);
  }, [a.scheduledAt, a.clientNotes, a.id]);

  const canClientEdit = isClient && a.status !== "completed" && a.status !== "cancelled";
  const showStaffStatus = isDoctor || isAdmin;
  const canEditNotes = (isClient && canClientEdit) || isAdmin;
  const hasNotes = Boolean(a.clientNotes && a.clientNotes.trim().length > 0);
  const shouldShowCommentButton = canEditNotes || hasNotes;
  const hasFooter =
    (isClient || isDoctor || isAdmin) &&
    ((isClient && a.status !== "cancelled" && a.status !== "completed") || showStaffStatus);

  return (
    <>
      <article className="appt-card" role="listitem">
        <div className="appt-card-top">
          <div className="appt-card-when">
            <p className="appt-card-datetime">{formatAppointmentDate(a.scheduledAt)}</p>
            {canClientEdit && editingTime ? (
              <div className="appt-row-edit appt-card-reschedule">
                <input
                  className="input"
                  type="datetime-local"
                  value={localTime}
                  step={1800}
                  onChange={(e) => setLocalTime(e.target.value)}
                />
                <span className="field-hint">{WORKING_HOURS_HINT}</span>
                <div className="appt-card-reschedule-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={disabled}
                    onClick={() => onPatch(a.id, { scheduledAt: new Date(localTime).toISOString() })}
                  >
                    Сохранить время
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={disabled}
                    onClick={() => {
                      setLocalTime(toDatetimeLocalInputValue(a.scheduledAt));
                      setEditingTime(false);
                    }}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : null}
            {canClientEdit && !editingTime ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm appt-card-schedule-btn"
                disabled={disabled}
                onClick={() => setEditingTime(true)}
              >
                Перенести время
              </button>
            ) : null}
          </div>
          <span className={`appt-status-pill appt-status-pill--${a.status}`}>
            {APPOINTMENT_STATUS_LABELS[a.status] ?? a.status}
          </span>
        </div>

        <div className="appt-card-main">
          <div className="appt-card-tile">
            <span className="appt-card-label">Питомец</span>
            <p className="appt-card-strong">{a.pet.name}</p>
            <p className="appt-card-sub">{a.pet.species}</p>
          </div>
          <div className="appt-card-tile appt-card-tile--grow">
            <span className="appt-card-label">Услуга</span>
            <p className="appt-card-text">{a.service.name}</p>
          </div>
          <div className="appt-card-tile">
            <span className="appt-card-label">Врач</span>
            <p className="appt-card-strong">{a.veterinarian.fullName}</p>
            <p className="appt-card-sub">{a.veterinarian.specialization}</p>
          </div>
        </div>

        <div className="appt-card-comment">
          <span className="appt-card-label">Комментарий</span>
          {hasNotes ? (
            <p className="appt-comment-preview appt-card-comment-preview">{a.clientNotes}</p>
          ) : (
            <span className="appt-comment-empty appt-card-comment-empty">Не указан</span>
          )}
          {shouldShowCommentButton ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm appt-card-comment-btn"
              onClick={() => setCommentModalOpen(true)}
            >
              {hasNotes ? "Открыть" : "Добавить"}
            </button>
          ) : null}
        </div>

        {hasFooter ? (
          <div className="appt-card-footer">
            {isClient && a.status !== "cancelled" && a.status !== "completed" ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm services-btn-danger"
                disabled={disabled}
                onClick={() => onPatch(a.id, { status: "cancelled" })}
              >
                Отменить запись
              </button>
            ) : null}
            {showStaffStatus ? (
              <label className="appt-status-select-wrap appt-card-status-wrap">
                <span className="appt-card-label appt-card-label--inline">Статус записи</span>
                <select
                  className="input select-input"
                  value={a.status}
                  disabled={disabled}
                  onChange={(e) => onPatch(a.id, { status: e.target.value })}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {APPOINTMENT_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}
      </article>
      <Modal
      title={canEditNotes ? "Комментарий к записи" : "Комментарий клиента"}
      open={commentModalOpen}
      onClose={() => setCommentModalOpen(false)}
    >
      {commentReadOnlyModal ? (
        <p className="modal-comment-readonly">{a.clientNotes?.trim() || "Комментарий не указан."}</p>
      ) : (
        <textarea
          className="input modal-comment-textarea"
          rows={12}
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          disabled={!canClientEdit && !isAdmin}
        />
      )}
      <div className="modal-footer-actions">
        {!commentReadOnlyModal && (canClientEdit || isAdmin) ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={disabled}
            onClick={() => {
              onPatch(a.id, { clientNotes: localNotes.trim() || null });
              setCommentModalOpen(false);
            }}
          >
            Сохранить
          </button>
        ) : null}
        <button type="button" className="btn btn-ghost" onClick={() => setCommentModalOpen(false)}>
          Закрыть
        </button>
      </div>
    </Modal>
    </>
  );
}
