import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Modal } from "../components/Modal";
import { PageContent } from "../components/PageContent";
import { fetchApi } from "../lib/api";
import { getToken } from "../lib/authStorage";
import type { Pet } from "../types/pet";
import type { MeUser } from "../types/user";
import "../styles/pages/pets.css";

export function PetsPage() {
  const [me, setMe] = useState<MeUser | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [petModalOpen, setPetModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [notes, setNotes] = useState("");

  const hasToken = Boolean(getToken());
  const role = me?.role.name;
  const isClient = role === "client";
  const isAdmin = role === "admin";
  async function reloadPets() {
    setError(null);
    const res = await fetchApi("/api/pets");
    const data = await res.json().catch(() => ({}));
    if (res.status === 403) {
      setPets([]);
      setError(typeof data.error === "string" ? data.error : "Нет доступа");
      return;
    }
    if (!res.ok) {
      setPets([]);
      setError(typeof data.error === "string" ? data.error : "Ошибка загрузки");
      return;
    }
    setPets(Array.isArray(data) ? data : []);
  }

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
        if (!user) {
          setMe(null);
          setError("Не удалось загрузить профиль. Войдите снова.");
          return;
        }
        setMe(user);
        if (user.role.name === "doctor") {
          setPets([]);
          setError("Раздел «Питомцы» предназначен для клиентов. Врач работает с приёмами в своём кабинете.");
          return;
        }
        await reloadPets();
      })
      .catch(() => {
        if (!cancelled) setError("Нет связи с сервером");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- первичная загрузка
  }, [hasToken]);

  function fillForm(p: Pet) {
    setEditingId(p.id);
    setName(p.name);
    setSpecies(p.species);
    setBreed(p.breed ?? "");
    setBirthDate(p.birthDate ?? "");
    setNotes(p.notes ?? "");
    setFormError(null);
    setPetModalOpen(true);
  }

  function clearForm() {
    setEditingId(null);
    setName("");
    setSpecies("");
    setBreed("");
    setBirthDate("");
    setNotes("");
    setFormError(null);
    setPetModalOpen(false);
  }

  function openAddPetModal() {
    setEditingId(null);
    setName("");
    setSpecies("");
    setBreed("");
    setBirthDate("");
    setNotes("");
    setFormError(null);
    setPetModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!(isClient || (isAdmin && editingId != null))) return;
    setFormError(null);
    setBusy(true);
    try {
      const body = {
        name,
        species,
        breed: breed.trim() || null,
        birthDate: birthDate.trim() || null,
        notes: notes.trim() || null,
      };
      const path = editingId != null ? `/api/pets/${editingId}` : "/api/pets";
      const method = editingId != null ? "PATCH" : "POST";
      const res = await fetchApi(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(typeof data.error === "string" ? data.error : "Не удалось сохранить");
        return;
      }
      clearForm();
      await reloadPets();
    } catch {
      setFormError("Нет связи с сервером");
    } finally {
      setBusy(false);
    }
  }

  function requestRemove(id: number) {
    setDeleteConfirmId(id);
  }

  async function confirmRemove() {
    const id = deleteConfirmId;
    if (id == null) return;
    setDeleteConfirmId(null);
    setFormError(null);
    setDeletingId(id);
    try {
      const res = await fetchApi(`/api/pets/${id}`, { method: "DELETE" });
      if (res.status === 204) {
        setPets((prev) => prev.filter((p) => p.id !== id));
        if (editingId === id) clearForm();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setFormError(typeof data.error === "string" ? data.error : "Не удалось удалить");
    } catch {
      setFormError("Нет связи с сервером");
    } finally {
      setDeletingId(null);
    }
  }

  if (!hasToken) {
    return (
      <PageContent
        title="Мои питомцы"
        lead="Войдите под учётной записью клиента, чтобы вести карточки питомцев."
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
      title="Питомцы под рукой"
      lead={
        isAdmin
          ? "Как администратор вы видите всех питомцев клиники. Новые карточки клиенты добавляют сами."
          : "Добавьте тех, кого приводите к нам: при записи данные подставятся сами — меньше рутины на ресепшене."
      }
    >
      {loading && hasToken ? (
        <div className="pets-catalog" aria-busy="true">
          <div className="services-skeleton-grid" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="services-skeleton-card pets-skeleton-tall" />
            ))}
          </div>
        </div>
      ) : null}

      {!loading && error ? (
        <p className="services-banner services-banner--error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && (isClient || isAdmin) && !error ? (
        <>
          <section className="pets-intro" aria-label="О разделе">
            {isAdmin ? (
              <>
                <p className="pets-intro-lead">
                  Сводка по питомцам и владельцам — чтобы быстрее ориентироваться в звонках и записях.
                  Добавить нового питомца может клиент со своего кабинета.
                </p>
                <ul className="pets-intro-points">
                  <li>Контакт владельца рядом с карточкой</li>
                  <li>Заметки помогают врачу и администратору</li>
                </ul>
              </>
            ) : (
              <>
                <p className="pets-intro-lead">
                  Заполните карточку один раз — при следующей записи останется выбрать услугу и время.
                  Если есть аллергии, хронические диагнозы или особенности поведения, кратко укажите это в
                  заметках — врачу это сильно помогает.
                </p>
                <ul className="pets-intro-points">
                  <li>Меньше вопросов на стойке регистрации</li>
                  <li>Несколько питомцев — отдельная карточка на каждого</li>
                  <li>Данные используются только в работе клиники</li>
                </ul>
              </>
            )}
          </section>

          {isClient ? (
            <div className="pets-toolbar">
              <button type="button" className="btn btn-primary" onClick={openAddPetModal} disabled={busy}>
                Добавить питомца
              </button>
            </div>
          ) : null}

          {formError && !petModalOpen ? (
            <p className="services-banner services-banner--error" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="pets-catalog">
            {pets.length === 0 ? (
              <div className="pets-empty">
                <p className="pets-empty-title">{isClient ? "Пока никого не добавили" : "Пока нет карточек"}</p>
                <p className="pets-empty-text">
                  {isClient
                    ? "Нажмите «Добавить питомца» — кличка и вид обязательны, породу и дату рождения можно указать позже."
                    : "Когда клиенты добавят питомцев из личного кабинета, они появятся здесь."}
                </p>
                {isClient ? (
                  <button type="button" className="btn btn-primary pets-empty-cta" onClick={openAddPetModal} disabled={busy}>
                    Добавить первого питомца
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="pets-grid" role="list">
                {pets.map((p) => (
                  <article key={p.id} className="pet-card" role="listitem">
                    <div className="pet-card-head">
                      <h3 className="pet-card-title">{p.name}</h3>
                    </div>
                    <div className="pet-card-meta">
                      <span className="pet-chip">{p.species}</span>
                      {p.breed?.trim() ? <span className="pet-chip pet-chip--muted">{p.breed}</span> : null}
                    </div>
                    <p className="pet-card-birth">
                      {p.birthDate ? (
                        <>
                          <span className="pet-card-birth-label">Дата рождения</span>
                          <span className="pet-card-birth-value">{p.birthDate}</span>
                        </>
                      ) : (
                        <span className="pet-card-birth-placeholder">Дата рождения не указана</span>
                      )}
                    </p>
                    <p className="pet-card-notes">
                      {p.notes?.trim()
                        ? p.notes.trim()
                        : "Заметок пока нет — можно добавить аллергии, особенности кормления или характер."}
                    </p>
                    {isAdmin && p.owner ? (
                      <div className="pet-card-owner">
                        <span className="pet-card-owner-label">Владелец</span>
                        <span className="pet-card-owner-name">{p.owner.fullName}</span>
                        <span className="pets-owner-email">{p.owner.email}</span>
                      </div>
                    ) : null}
                    <div className="pet-card-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => fillForm(p)}
                        disabled={busy || deletingId != null}
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm services-btn-danger"
                        onClick={() => requestRemove(p.id)}
                        disabled={deletingId === p.id || busy}
                      >
                        {deletingId === p.id ? "…" : "Удалить"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {isClient ? (
            <section className="pets-cta" aria-label="Дальнейшие шаги">
              <div className="pets-cta-inner">
                <div>
                  <h2 className="pets-cta-title">Готовы к приёму?</h2>
                  <p className="pets-cta-text">
                    Запишитесь онлайн — питомец уже в списке, останется выбрать услугу, врача и время.
                  </p>
                </div>
                <div className="pets-cta-buttons">
                  <Link className="btn btn-primary" to="/appointments">
                    Записаться на приём
                  </Link>
                  <Link className="btn btn-ghost" to="/services">
                    Услуги и цены
                  </Link>
                </div>
              </div>
            </section>
          ) : null}

          <ConfirmDialog
            open={deleteConfirmId != null}
            title="Удалить карточку питомца?"
            message={
              deleteConfirmId == null
                ? ""
                : `Карточка «${pets.find((p) => p.id === deleteConfirmId)?.name ?? "питомца"}» будет удалена. Восстановить данные не получится.`
            }
            confirmLabel="Удалить"
            cancelLabel="Отмена"
            variant="danger"
            onCancel={() => setDeleteConfirmId(null)}
            onConfirm={() => void confirmRemove()}
          />

          <Modal
            title={editingId != null ? "Редактировать питомца" : "Добавить питомца"}
            open={petModalOpen && (isClient || (isAdmin && editingId != null))}
            wide
            onClose={() => {
              if (!busy) clearForm();
            }}
          >
            {formError ? (
              <p className="services-banner services-banner--error" role="alert">
                {formError}
              </p>
            ) : null}
            <form className="form" onSubmit={onSubmit}>
              <label className="field">
                <span className="field-label">Кличка</span>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                />
              </label>
              <div className="services-admin-row">
                <label className="field">
                  <span className="field-label">Вид</span>
                  <input
                    className="input"
                    value={species}
                    onChange={(e) => setSpecies(e.target.value)}
                    required
                    maxLength={80}
                    placeholder="Кошка, собака…"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Порода</span>
                  <input
                    className="input"
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                    maxLength={120}
                  />
                </label>
              </div>
              <label className="field">
                <span className="field-label">Дата рождения</span>
                <input
                  className="input"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Заметки</span>
                <textarea
                  className="input services-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </label>
              <div className="modal-footer-actions">
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy
                    ? "Сохранение…"
                    : editingId != null
                      ? "Сохранить"
                      : isClient
                        ? "Добавить"
                        : "Сохранить"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => clearForm()} disabled={busy}>
                  Отмена
                </button>
              </div>
            </form>
          </Modal>
        </>
      ) : null}

    </PageContent>
  );
}
