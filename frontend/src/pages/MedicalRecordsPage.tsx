import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Modal } from "../components/Modal";
import { PageContent } from "../components/PageContent";
import {
  APPOINTMENT_STATUS_LABELS,
  formatAppointmentDate,
  toDatetimeLocalInputValue,
} from "../lib/appointmentLabels";
import { fetchApi } from "../lib/api";
import { getToken } from "../lib/authStorage";
import {
  defaultMedicalRecordsPrefs,
  loadMedicalRecordsPrefs,
  resetMedicalRecordsPrefs,
  saveMedicalRecordsPrefs,
  type MedicalRecordsPrefs,
} from "../lib/medicalRecordsPrefs";
import type { Appointment } from "../types/appointment";
import "../styles/pages/medical-records.css";
import type { MedicalRecord } from "../types/medicalRecord";
import type { MeUser } from "../types/user";
import type { Pet } from "../types/pet";
import type { VeterinarianBrief } from "../types/veterinarian";

type PetOption = { id: number; name: string; species: string };

/** Одна строка-превью без скролла в карточке */
function textPreview(text: string | null, maxChars = 130): string {
  if (text == null || !String(text).trim()) return "—";
  const oneLine = String(text).replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxChars) return oneLine;
  return `${oneLine.slice(0, maxChars).trimEnd()}…`;
}

/** Дата приёма для отображения: указанная врачом → из записи на приём → момент создания карточки */
function recordVisitIso(r: MedicalRecord): string {
  if (r.visitedAt != null && r.visitedAt !== "") return r.visitedAt;
  if (r.appointment) return r.appointment.scheduledAt;
  return r.createdAt;
}

export function MedicalRecordsPage() {
  const [me, setMe] = useState<MeUser | null>(null);
  const [prefs, setPrefs] = useState<MedicalRecordsPrefs>(() => loadMedicalRecordsPrefs());
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [veterinarians, setVeterinarians] = useState<VeterinarianBrief[]>([]);
  const [meLoading, setMeLoading] = useState(Boolean(getToken()));
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editRecord, setEditRecord] = useState<MedicalRecord | null>(null);
  const [editDiagnosis, setEditDiagnosis] = useState("");
  const [editTreatment, setEditTreatment] = useState("");
  const [editVisitedAt, setEditVisitedAt] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  const [formPetId, setFormPetId] = useState("");
  const [formVetId, setFormVetId] = useState("");
  const [formAppointmentId, setFormAppointmentId] = useState("");
  const [formDiagnosis, setFormDiagnosis] = useState("");
  const [formTreatment, setFormTreatment] = useState("");
  const [formVisitedAt, setFormVisitedAt] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<MedicalRecord | null>(null);

  const hasToken = Boolean(getToken());
  const role = me?.role.name;
  const isClient = role === "client";
  const isDoctor = role === "doctor";
  const isAdmin = role === "admin";
  const canStaff = isDoctor || isAdmin;

  useEffect(() => {
    saveMedicalRecordsPrefs(prefs);
  }, [prefs]);

  const petOptionsForStaff: PetOption[] = useMemo(() => {
    if (isAdmin) {
      return pets.map((p) => ({ id: p.id, name: p.name, species: p.species }));
    }
    if (isDoctor) {
      const map = new Map<number, PetOption>();
      for (const a of appointments) {
        map.set(a.pet.id, {
          id: a.pet.id,
          name: a.pet.name,
          species: a.pet.species,
        });
      }
      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "ru"));
    }
    return [];
  }, [isAdmin, isDoctor, pets, appointments]);

  const appointmentsForPet = useMemo(() => {
    if (!formPetId) return [];
    const pid = Number(formPetId);
    let list = appointments.filter((a) => a.petId === pid && a.status !== "cancelled");
    if (isAdmin && formVetId) {
      const vid = Number(formVetId);
      if (Number.isInteger(vid)) list = list.filter((a) => a.veterinarianId === vid);
    }
    return list;
  }, [appointments, formPetId, isAdmin, formVetId]);

  const loadRecords = useCallback(async () => {
    if (!me) return;
    setError(null);
    const q = new URLSearchParams();
    if (prefs.petId) q.set("petId", prefs.petId);
    q.set("order", prefs.order);
    const res = await fetchApi(`/api/medical-records?${q}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setRecords([]);
      setError(typeof data.error === "string" ? data.error : "Ошибка загрузки");
      return;
    }
    setRecords(Array.isArray(data) ? data : []);
  }, [me, prefs.petId, prefs.order]);

  useEffect(() => {
    if (!hasToken) {
      setMeLoading(false);
      setMe(null);
      return;
    }
    let cancelled = false;
    setMeLoading(true);
    fetchApi("/api/me")
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as MeUser;
      })
      .then((user) => {
        if (cancelled) return;
        if (!user) {
          setMe(null);
          setError("Не удалось загрузить профиль.");
          return;
        }
        setMe(user);
      })
      .catch(() => {
        if (!cancelled) setError("Нет связи с сервером");
      })
      .finally(() => {
        if (!cancelled) setMeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasToken]);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    const roleInner = me.role.name;

    async function loadAux() {
      if (roleInner === "client" || roleInner === "admin") {
        const res = await fetchApi("/api/pets");
        const j = await res.json().catch(() => []);
        if (!cancelled) setPets(res.ok && Array.isArray(j) ? j : []);
      } else if (!cancelled) {
        setPets([]);
      }

      if (roleInner === "admin") {
        const res = await fetchApi("/api/veterinarians");
        const j = await res.json().catch(() => []);
        if (!cancelled) setVeterinarians(res.ok && Array.isArray(j) ? j : []);
      } else if (!cancelled) {
        setVeterinarians([]);
      }

      if (roleInner === "doctor" || roleInner === "admin") {
        const res = await fetchApi("/api/appointments");
        const j = await res.json().catch(() => []);
        if (!cancelled) setAppointments(res.ok && Array.isArray(j) ? j : []);
      } else if (!cancelled) {
        setAppointments([]);
      }
    }

    loadAux().catch(() => {
      if (!cancelled) setError("Нет связи с сервером");
    });

    return () => {
      cancelled = true;
    };
  }, [me]);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    setRecordsLoading(true);
    loadRecords()
      .catch(() => {
        if (!cancelled) setError("Нет связи с сервером");
      })
      .finally(() => {
        if (!cancelled) setRecordsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadRecords]);

  function resetFilters() {
    setPrefs({ ...defaultMedicalRecordsPrefs });
    resetMedicalRecordsPrefs();
  }

  function closeCreateModal() {
    setAddModalOpen(false);
    setFormPetId("");
    setFormVetId("");
    setFormAppointmentId("");
    setFormVisitedAt("");
    setFormDiagnosis("");
    setFormTreatment("");
    setFormError(null);
  }

  async function onCreateRecord(e: FormEvent) {
    e.preventDefault();
    if (!canStaff) return;
    setFormError(null);
    setBusy(true);
    try {
      const pid = Number(formPetId);
      if (!Number.isInteger(pid)) {
        setFormError("Выберите питомца");
        setBusy(false);
        return;
      }
      if (!formDiagnosis.trim() && !formTreatment.trim()) {
        setFormError("Укажите диагноз и/или назначения");
        setBusy(false);
        return;
      }
      const body: Record<string, unknown> = {
        petId: pid,
        diagnosis: formDiagnosis.trim() || null,
        treatmentNotes: formTreatment.trim() || null,
      };
      if (isAdmin) {
        const vid = Number(formVetId);
        if (!Number.isInteger(vid)) {
          setFormError("Выберите врача");
          setBusy(false);
          return;
        }
        body.veterinarianId = vid;
      }
      if (formAppointmentId) {
        const aid = Number(formAppointmentId);
        if (Number.isInteger(aid)) body.appointmentId = aid;
      }
      if (formVisitedAt.trim()) {
        body.visitedAt = new Date(formVisitedAt).toISOString();
      }
      const res = await fetchApi("/api/medical-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(typeof data.error === "string" ? data.error : "Не удалось сохранить");
        setBusy(false);
        return;
      }
      closeCreateModal();
      await loadRecords();
    } catch {
      setFormError("Нет связи с сервером");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editRecord) return;
    setEditBusy(true);
    setFormError(null);
    try {
      const res = await fetchApi(`/api/medical-records/${editRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosis: editDiagnosis.trim() || null,
          treatmentNotes: editTreatment.trim() || null,
          visitedAt: editVisitedAt.trim() ? new Date(editVisitedAt).toISOString() : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(typeof data.error === "string" ? data.error : "Не удалось сохранить");
        return;
      }
      setEditRecord(null);
      await loadRecords();
    } catch {
      setFormError("Нет связи с сервером");
    } finally {
      setEditBusy(false);
    }
  }

  function openEdit(r: MedicalRecord) {
    setEditRecord(r);
    setEditDiagnosis(r.diagnosis ?? "");
    setEditTreatment(r.treatmentNotes ?? "");
    setEditVisitedAt(
      r.visitedAt
        ? toDatetimeLocalInputValue(r.visitedAt)
        : r.appointment
          ? toDatetimeLocalInputValue(r.appointment.scheduledAt)
          : "",
    );
    setFormError(null);
  }

  if (!hasToken) {
    return (
      <PageContent
        title="История приёмов в одном месте"
        lead="Войдите, чтобы видеть медкарты своих питомцев: что нашли на приёме, что назначили и когда визит был."
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

  const showRecordsSkeleton = Boolean(me && recordsLoading && records.length === 0 && !error);

  return (
    <PageContent
      title="Медкарты — спокойно и по делу"
      lead="Краткие карточки в списке, полный текст диагноза и назначений — в окне «Подробнее». Фильтр по питомцу и порядок дат сохраняются в браузере."
    >
      {meLoading && hasToken ? (
        <div className="med-page-skeleton" aria-busy="true">
          <div className="services-skeleton-card med-intro-skeleton" aria-hidden="true" />
          <div className="med-skeleton-grid" aria-hidden="true">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="services-skeleton-card med-record-skeleton-card" />
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="services-banner services-banner--error" role="alert">
          {error}
        </p>
      ) : null}

      {!meLoading && me ? (
        <>
          <section className="med-intro" aria-label="О медкартах">
            {isClient ? (
              <>
                <p className="med-intro-lead">
                  Здесь копится история визитов: без телефонных расспросов можно вспомнить, что врач говорил в прошлый раз.
                  Откройте карточку целиком — там полный диагноз и назначения в удобном виде.
                </p>
                <ul className="med-intro-points">
                  <li>Фильтр по питомцу, если любимцев несколько</li>
                  <li>Новые записи появляются после того, как врач или админ сохранят приём в системе</li>
                  <li>Редактирование текста — только сотрудники клиники; вы читаете и планируете следующий визит</li>
                </ul>
              </>
            ) : isDoctor ? (
              <>
                <p className="med-intro-lead">
                  Фиксируйте находки и план лечения сразу после приёма. Можно привязать запись к существующему слоту в расписании
                  или завести карточку отдельно — удобно для повторных осмотров.
                </p>
                <ul className="med-intro-points">
                  <li>Список питомцев строится из ваших активных записей</li>
                  <li>Клиент увидит ту же карточку у себя в кабинете</li>
                  <li>Сложные случаи допишите в «Подробнее» или при редактировании</li>
                </ul>
              </>
            ) : (
              <>
                <p className="med-intro-lead">
                  Полный обзор медкарт по клинике: выбирайте питомца и врача при создании, сверяйтесь с привязкой к записи на приём.
                </p>
                <ul className="med-intro-points">
                  <li>Порядок по дате приёма — от свежих к старым или наоборот</li>
                  <li>Сброс настроек касается только этой страницы</li>
                </ul>
              </>
            )}
          </section>

          {formError ? (
            <p className="services-banner services-banner--error" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="services-toolbar med-toolbar">
            <label className="services-field services-field--narrow">
              <span className="services-field-label">Питомец</span>
              <select
                className="input select-input"
                value={prefs.petId}
                onChange={(e) => setPrefs((p) => ({ ...p, petId: e.target.value }))}
              >
                <option value="">Все</option>
                {(isClient || isAdmin ? pets : petOptionsForStaff).map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name} ({p.species})
                  </option>
                ))}
              </select>
            </label>
            <label className="services-field services-field--narrow">
              <span className="services-field-label">Порядок</span>
              <select
                className="input select-input"
                value={prefs.order}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    order: e.target.value as MedicalRecordsPrefs["order"],
                  }))
                }
              >
                <option value="desc">Сначала новые</option>
                <option value="asc">Сначала старые</option>
              </select>
            </label>
            <button type="button" className="btn btn-ghost services-reset" onClick={resetFilters}>
              Сбросить настройки
            </button>
            {canStaff ? (
              <button
                type="button"
                className="btn btn-primary services-add-btn"
                onClick={() => {
                  setFormError(null);
                  setAddModalOpen(true);
                }}
              >
                Добавить запись
              </button>
            ) : null}
          </div>

          <div className="med-records-list">
            {showRecordsSkeleton ? (
              <div className="med-skeleton-grid" aria-busy="true" aria-hidden="true">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="services-skeleton-card med-record-skeleton-card" />
                ))}
              </div>
            ) : records.length > 0 ? (
              <div className="med-cards-grid" role="list">
                {records.map((r) => {
                  const apptStatusLabel = r.appointment
                    ? APPOINTMENT_STATUS_LABELS[r.appointment.status] ?? r.appointment.status
                    : null;
                  return (
                    <article key={r.id} className="med-card" role="listitem">
                      <div className="med-card-top">
                        <div className="med-card-when">
                          <p className="med-card-date">{formatAppointmentDate(recordVisitIso(r))}</p>
                          {r.appointment ? (
                            <span className="med-card-badge">По записи · {apptStatusLabel}</span>
                          ) : (
                            <span className="med-card-badge med-card-badge--soft">Без привязки к слоту</span>
                          )}
                        </div>
                      </div>
                      <div className="med-card-title-row">
                        <h2 className="med-card-title">
                          {r.pet.name}
                          <span className="med-card-species"> · {r.pet.species}</span>
                        </h2>
                      </div>
                      <div className="med-card-meta">
                        <div className="med-card-vet">
                          <span className="med-card-kicker">Врач</span>
                          <span className="med-card-vet-name">{r.veterinarian.fullName}</span>
                          <span className="med-card-sub">{r.veterinarian.specialization}</span>
                        </div>
                        {r.appointment ? (
                          <div className="med-card-slot">
                            <span className="med-card-kicker">Запись</span>
                            <span className="med-card-slot-time">
                              {formatAppointmentDate(r.appointment.scheduledAt)}
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <div className="med-card-previews">
                        <div className="med-card-preview-block">
                          <span className="med-card-kicker">Диагноз / находки</span>
                          <p className="med-card-preview-text">{textPreview(r.diagnosis)}</p>
                        </div>
                        <div className="med-card-preview-block">
                          <span className="med-card-kicker">Назначения</span>
                          <p className="med-card-preview-text">{textPreview(r.treatmentNotes)}</p>
                        </div>
                      </div>
                      <div className="med-card-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => setDetailRecord(r)}
                        >
                          Открыть полностью
                        </button>
                        {canStaff ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEdit(r)}
                          >
                            Изменить
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : !recordsLoading && !error ? (
              <div className="med-empty">
                <p className="med-empty-title">Пока нет записей в этом списке</p>
                <p className="med-empty-text">
                  {isClient
                    ? "Выберите другого питомца в фильтре или дождитесь, когда после приёма врач добавит карточку. Если только что были у нас — обновите страницу чуть позже."
                    : canStaff
                      ? "Добавьте первую запись кнопкой выше или смените фильтр по питомцу. Для врача список питомцев берётся из раздела «Записи»."
                      : "Записей с выбранными условиями не найдено."}
                </p>
                <div className="med-empty-actions">
                  {isClient ? (
                    <>
                      <Link className="btn btn-primary" to="/appointments">
                        Записи на приём
                      </Link>
                      <Link className="btn btn-ghost" to="/pets">
                        Мои питомцы
                      </Link>
                    </>
                  ) : canStaff ? (
                    <Link className="btn btn-ghost" to="/appointments">
                      К расписанию
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <section className="med-cta" aria-label="Дальше">
            <div className="med-cta-inner">
              <div>
                <h2 className="med-cta-title">Связка с остальным кабинетом</h2>
                <p className="med-cta-text">
                  {isClient
                    ? "Запланируйте следующий визит, посмотрите услуги с ценами или уточните контакты клиники."
                    : "Быстрый переход к расписанию записей и каталогу услуг — чтобы не искать в меню."}
                </p>
              </div>
              <div className="med-cta-buttons">
                <Link className="btn btn-primary" to="/appointments">
                  Записи
                </Link>
                <Link className="btn btn-ghost" to="/services">
                  Услуги
                </Link>
                {isClient ? (
                  <Link className="btn btn-ghost" to="/pets">
                    Питомцы
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
        title={
          detailRecord
            ? `${detailRecord.pet.name} · ${formatAppointmentDate(recordVisitIso(detailRecord))}`
            : ""
        }
        open={detailRecord != null}
        onClose={() => setDetailRecord(null)}
        wide
      >
        {detailRecord ? (
          <>
            <div className="med-detail-meta med-detail-meta--panel">
              <div>
                <span className="med-detail-meta-label">Когда был приём</span>
                {formatAppointmentDate(recordVisitIso(detailRecord))}
                {detailRecord.visitedAt != null && detailRecord.visitedAt !== "" ? (
                  <span className="med-card-sub"> (дата указана врачом)</span>
                ) : null}
              </div>
              <div>
                <span className="med-detail-meta-label">Врач</span>
                {detailRecord.veterinarian.fullName}
                <span className="med-card-sub"> · {detailRecord.veterinarian.specialization}</span>
              </div>
              <div>
                <span className="med-detail-meta-label">Запись на приём</span>
                {detailRecord.appointment
                  ? `${formatAppointmentDate(detailRecord.appointment.scheduledAt)} · ${APPOINTMENT_STATUS_LABELS[detailRecord.appointment.status] ?? detailRecord.appointment.status}`
                  : "—"}
              </div>
              <div>
                <span className="med-detail-meta-label">Карточка в системе</span>
                {formatAppointmentDate(detailRecord.createdAt)}
              </div>
            </div>
            <section className="med-detail-section med-detail-section--panel">
              <h3 className="med-detail-heading">Диагноз / находки</h3>
              <p className="med-detail-text">{detailRecord.diagnosis ?? "—"}</p>
            </section>
            <section className="med-detail-section med-detail-section--panel">
              <h3 className="med-detail-heading">Назначения / лечение</h3>
              <p className="med-detail-text">{detailRecord.treatmentNotes ?? "—"}</p>
            </section>
            <div className="modal-footer-actions">
              {canStaff ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const r = detailRecord;
                    setDetailRecord(null);
                    openEdit(r);
                  }}
                >
                  Изменить
                </button>
              ) : null}
              <button type="button" className="btn btn-ghost" onClick={() => setDetailRecord(null)}>
                Закрыть
              </button>
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        title="Новая запись в медкарту"
        open={addModalOpen}
        onClose={() => {
          if (!busy) closeCreateModal();
        }}
        wide
      >
        {isDoctor && petOptionsForStaff.length === 0 ? (
          <p className="page-placeholder">
            Появятся питомцы из ваших записей на приём в разделе{" "}
            <Link className="text-link" to="/appointments">
              Записи
            </Link>
            .
          </p>
        ) : (
          <form className="form" onSubmit={onCreateRecord}>
            <div className="services-admin-row">
              <label className="field">
                <span className="field-label">Питомец</span>
                <select
                  className="input select-input"
                  value={formPetId}
                  onChange={(e) => {
                    setFormPetId(e.target.value);
                    setFormAppointmentId("");
                    setFormVisitedAt("");
                  }}
                  required
                >
                  <option value="" disabled>
                    Выберите
                  </option>
                  {petOptionsForStaff.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.species})
                    </option>
                  ))}
                </select>
              </label>
              {isAdmin ? (
                <label className="field">
                  <span className="field-label">Врач</span>
                  <select
                    className="input select-input"
                    value={formVetId}
                    onChange={(e) => {
                      setFormVetId(e.target.value);
                      setFormAppointmentId("");
                      setFormVisitedAt("");
                    }}
                    required
                  >
                    <option value="" disabled>
                      Выберите
                    </option>
                    {veterinarians.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.fullName}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            {canStaff && formPetId && (isDoctor || (isAdmin && formVetId)) ? (
              <label className="field">
                <span className="field-label">Привязать к приёму (необязательно)</span>
                <select
                  className="input select-input"
                  value={formAppointmentId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormAppointmentId(v);
                    if (!v) return;
                    const ap = appointmentsForPet.find((a) => String(a.id) === v);
                    if (ap) setFormVisitedAt(toDatetimeLocalInputValue(ap.scheduledAt));
                  }}
                >
                  <option value="">Без привязки</option>
                  {appointmentsForPet.map((a) => (
                    <option key={a.id} value={a.id}>
                      {formatAppointmentDate(a.scheduledAt)} — {a.service.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="field">
              <span className="field-label">Когда был приём</span>
              <input
                className="input"
                type="datetime-local"
                value={formVisitedAt}
                onChange={(e) => setFormVisitedAt(e.target.value)}
              />
              <span className="field-hint">Необязательно: если не указать, подставится дата из привязанного приёма или останется по факту сохранения.</span>
            </label>
            <label className="field">
              <span className="field-label">Диагноз / находки</span>
              <textarea
                className="input services-textarea"
                rows={3}
                value={formDiagnosis}
                onChange={(e) => setFormDiagnosis(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Назначения / лечение</span>
              <textarea
                className="input services-textarea"
                rows={3}
                value={formTreatment}
                onChange={(e) => setFormTreatment(e.target.value)}
              />
            </label>
            <div className="modal-footer-actions">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "Сохранение…" : "Добавить запись"}
              </button>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={closeCreateModal}>
                Отмена
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        title="Редактировать запись"
        open={editRecord != null}
        onClose={() => setEditRecord(null)}
        wide
      >
        {editRecord ? (
          <>
            <p className="med-modal-meta">
              {editRecord.pet.name} · {formatAppointmentDate(recordVisitIso(editRecord))}
            </p>
            <label className="field">
              <span className="field-label">Когда был приём</span>
              <input
                className="input"
                type="datetime-local"
                value={editVisitedAt}
                onChange={(e) => setEditVisitedAt(e.target.value)}
              />
              <span className="field-hint">
                Пустое значение при сохранении сбрасывает дату: дальше показывается время записи на приём или создание карточки.
              </span>
            </label>
            <label className="field">
              <span className="field-label">Диагноз</span>
              <textarea
                className="input modal-comment-textarea"
                rows={6}
                value={editDiagnosis}
                onChange={(e) => setEditDiagnosis(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Назначения</span>
              <textarea
                className="input modal-comment-textarea"
                rows={6}
                value={editTreatment}
                onChange={(e) => setEditTreatment(e.target.value)}
              />
            </label>
            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={editBusy}
                onClick={saveEdit}
              >
                {editBusy ? "Сохранение…" : "Сохранить"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={editBusy}
                onClick={() => setEditRecord(null)}
              >
                Закрыть
              </button>
            </div>
          </>
        ) : null}
      </Modal>
    </PageContent>
  );
}
