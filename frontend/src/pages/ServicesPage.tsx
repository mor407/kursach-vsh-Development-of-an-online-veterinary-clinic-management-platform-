import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Modal } from "../components/Modal";
import { PageContent } from "../components/PageContent";
import { apiPath, fetchApi } from "../lib/api";
import { getToken } from "../lib/authStorage";
import {
  defaultServicesPrefs,
  loadServicesPrefs,
  resetServicesPrefs,
  saveServicesPrefs,
  type ServicesPrefs,
} from "../lib/servicesPrefs";
import type { MeUser } from "../types/user";
import type { Service } from "../types/service";
import "../styles/pages/services.css";

function formatDuration(minutes: number): string {
  if (minutes >= 1440 && minutes % 1440 === 0) {
    const d = minutes / 1440;
    return d === 1 ? "1 сут." : `${d} сут.`;
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    const h = minutes / 60;
    return `${h} ч`;
  }
  return `${minutes} мин`;
}

function formatPrice(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return `${n.toFixed(2)} Br`;
}

/** Лёгкая «живость» карточек без отдельных иллюстраций */
function serviceEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("вакцин")) return "💉";
  if (n.includes("осмотр") || n.includes("повторн")) return "🩺";
  if (n.includes("консульт")) return "💬";
  if (n.includes("узи")) return "📋";
  if (n.includes("рентген")) return "🦴";
  if (n.includes("зуб") || n.includes("чистк") || n.includes("стомат")) return "🦷";
  if (n.includes("стерилиз") || n.includes("кастр") || n.includes("операц")) return "✨";
  if (n.includes("анализ") || n.includes("кров")) return "🧪";
  if (n.includes("экг") || n.includes("кардио")) return "❤️";
  if (n.includes("груминг") || n.includes("стрижк") || n.includes("ванн") || n.includes("когт")) return "✂️";
  if (n.includes("капельн")) return "💧";
  if (n.includes("эктопаразит") || n.includes("блох")) return "🛡️";
  if (n.includes("стационар") || n.includes("сутк")) return "🛏️";
  if (n.includes("экстр") || n.includes("вызов")) return "🚑";
  if (n.includes("чип")) return "📟";
  if (n.includes("питан")) return "🥣";
  if (n.includes("дермат")) return "🧴";
  return "🐾";
}

export function ServicesPage() {
  const [prefs, setPrefs] = useState<ServicesPrefs>(() => loadServicesPrefs());
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<MeUser | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteServiceId, setDeleteServiceId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDuration, setFormDuration] = useState("30");
  const [formPrice, setFormPrice] = useState("0");

  const isAdmin = me?.role.name === "admin";

  useEffect(() => {
    saveServicesPrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    if (!getToken()) {
      setMe(null);
      return;
    }
    let cancelled = false;
    fetchApi("/api/me")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as MeUser;
        if (!cancelled) setMe(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const loadCatalog = useCallback(() => {
    const params = new URLSearchParams();
    const q = prefs.q.trim();
    if (q) params.set("q", q);
    params.set("sort", prefs.sort);
    params.set("order", prefs.order);
    return fetch(apiPath(`/api/services?${params}`));
  }, [prefs.q, prefs.sort, prefs.order]);

  useEffect(() => {
    const ac = new AbortController();
    const delay = 260;
    setError(null);
    setLoading(true);
    const t = window.setTimeout(() => {
      loadCatalog()
        .then(async (res) => {
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(typeof body.error === "string" ? body.error : "Ошибка загрузки");
          }
          return res.json() as Promise<Service[]>;
        })
        .then((data) => {
          if (!ac.signal.aborted) setServices(Array.isArray(data) ? data : []);
        })
        .catch((e: unknown) => {
          if (ac.signal.aborted) return;
          setError(e instanceof Error ? e.message : "Ошибка загрузки");
          setServices([]);
        })
        .finally(() => {
          if (!ac.signal.aborted) setLoading(false);
        });
    }, delay);
    return () => {
      ac.abort();
      window.clearTimeout(t);
    };
  }, [loadCatalog]);

  function resetFilters() {
    setPrefs({ ...defaultServicesPrefs });
    resetServicesPrefs();
  }

  function startEdit(s: Service) {
    setEditingId(s.id);
    setFormName(s.name);
    setFormDescription(s.description ?? "");
    setFormDuration(String(s.durationMinutes));
    setFormPrice(String(s.price));
    setAdminError(null);
    setServiceModalOpen(true);
  }

  function clearForm() {
    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setFormDuration("30");
    setFormPrice("0");
    setAdminError(null);
    setServiceModalOpen(false);
  }

  function openCreateServiceModal() {
    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setFormDuration("30");
    setFormPrice("0");
    setAdminError(null);
    setServiceModalOpen(true);
  }

  async function submitAdmin(e: FormEvent) {
    e.preventDefault();
    setAdminError(null);
    setAdminBusy(true);
    try {
      const body = {
        name: formName,
        description: formDescription || null,
        durationMinutes: Number(formDuration),
        price: Number(formPrice),
      };
      const path = editingId != null ? `/api/services/${editingId}` : "/api/services";
      const method = editingId != null ? "PATCH" : "POST";
      const res = await fetchApi(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAdminError(typeof data.error === "string" ? data.error : "Не удалось сохранить");
        return;
      }
      clearForm();
      const listRes = await loadCatalog();
      if (listRes.ok) {
        const list = (await listRes.json()) as Service[];
        setServices(Array.isArray(list) ? list : []);
      }
    } catch {
      setAdminError("Нет связи с сервером");
    } finally {
      setAdminBusy(false);
    }
  }

  function requestRemoveService(id: number) {
    setDeleteServiceId(id);
  }

  async function confirmRemoveService() {
    const id = deleteServiceId;
    if (id == null) return;
    setDeleteServiceId(null);
    setAdminError(null);
    setDeletingId(id);
    try {
      const res = await fetchApi(`/api/services/${id}`, { method: "DELETE" });
      if (res.status === 204) {
        setServices((prev) => prev.filter((s) => s.id !== id));
        if (editingId === id) clearForm();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setAdminError(typeof data.error === "string" ? data.error : "Не удалось удалить");
    } catch {
      setAdminError("Нет связи с сервером");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <PageContent
      title="Услуги с понятными ценами"
      lead="Выберите, что нужно питомцу: от профилактики до диагностики. "
    >
      <section className="services-intro" aria-label="Как пользоваться каталогом">
        <p className="services-intro-lead">
          Мы не прячем стоимость и длительность приёма: вы заранее понимаете, на что идёте. Дальше —
          пара шагов до записи: питомец, врач и удобное время.
        </p>
        <ul className="services-intro-points">
          <li>Прозрачные цены и сроки визита</li>
          <li>Онлайн-запись без лишних звонков</li>
          <li>Есть вопросы — напишите или позвоните из раздела «Контакты»</li>
        </ul>
      </section>

      <div className="services-toolbar">
        <label className="services-field">
          <span className="services-field-label">Поиск по названию</span>
          <input
            className="input"
            type="search"
            value={prefs.q}
            onChange={(e) => setPrefs((p) => ({ ...p, q: e.target.value }))}
            placeholder="Например, вакцинация"
            autoComplete="off"
          />
        </label>
        <label className="services-field services-field--narrow">
          <span className="services-field-label">Сортировка</span>
          <select
            className="input select-input"
            value={prefs.sort}
            onChange={(e) =>
              setPrefs((p) => ({
                ...p,
                sort: e.target.value as ServicesPrefs["sort"],
              }))
            }
          >
            <option value="name">По названию</option>
            <option value="price">По цене</option>
            <option value="durationMinutes">По длительности</option>
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
                order: e.target.value as ServicesPrefs["order"],
              }))
            }
          >
            <option value="asc">По возрастанию</option>
            <option value="desc">По убыванию</option>
          </select>
        </label>
        <button type="button" className="btn btn-ghost services-reset" onClick={resetFilters}>
          Сбросить настройки
        </button>
        {isAdmin ? (
          <button type="button" className="btn btn-primary services-add-btn" onClick={openCreateServiceModal}>
            Добавить услугу
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="services-banner services-banner--error" role="alert">
          {error}
        </p>
      ) : null}
      {isAdmin && adminError && !serviceModalOpen ? (
        <p className="services-banner services-banner--error" role="alert">
          {adminError}
        </p>
      ) : null}

      <div className="services-catalog" aria-busy={loading}>
        {loading ? (
          <div className="services-skeleton-grid" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="services-skeleton-card" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="services-empty">
            <p className="services-empty-title">Пока пусто или ничего не подошло под фильтр</p>
            <p className="services-empty-text">
              Попробуйте изменить поиск или сортировку. Если каталог ещё не заполняли — в папке{" "}
              <code className="services-code">backend</code> выполните{" "}
              <code className="services-code">npm run db:seed</code>.
            </p>
          </div>
        ) : (
          <div className="services-grid" role="list">
            {services.map((s) => (
              <article key={s.id} className="service-card" role="listitem">
                <div className="service-card-head">
                  <span className="service-card-emoji" aria-hidden="true">
                    {serviceEmoji(s.name)}
                  </span>
                  <h3 className="service-card-title">{s.name}</h3>
                </div>
                <p className="service-card-desc">
                  {s.description?.trim() || "Описание уточняйте у администратора — подберем формат приёма под ситуацию."}
                </p>
                <div className="service-card-meta">
                  <span className="service-chip">{formatDuration(s.durationMinutes)}</span>
                  <span className="service-card-price">{formatPrice(s.price)}</span>
                </div>
                <div className="service-card-actions">
                  <Link className="btn btn-primary service-card-cta" to={`/appointments?serviceId=${s.id}`}>
                    Записаться на приём
                  </Link>
                  {isAdmin ? (
                    <div className="service-card-admin">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => startEdit(s)}
                        disabled={adminBusy || deletingId != null}
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm services-btn-danger"
                        onClick={() => requestRemoveService(s.id)}
                        disabled={deletingId === s.id || adminBusy}
                      >
                        {deletingId === s.id ? "…" : "Удалить"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <section className="services-cta" aria-label="Следующий шаг">
        <div className="services-cta-inner">
          <div>
            <h2 className="services-cta-title">Не уверены, что выбрать?</h2>
            <p className="services-cta-text">
              Опишите симптомы или задачу — на приёме врач подскажет оптимальный план. Можно начать с обычного осмотра.
            </p>
          </div>
          <div className="services-cta-buttons">
            <Link className="btn btn-primary" to="/appointments">
              Перейти к записям
            </Link>
            <Link className="btn btn-ghost" to="/contacts">
              Контакты клиники
            </Link>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={deleteServiceId != null}
        title="Удалить услугу?"
        message={
          deleteServiceId == null
            ? ""
            : `Услуга «${services.find((s) => s.id === deleteServiceId)?.name ?? "…"}» исчезнет из каталога. Клиенты больше не смогут на неё записаться.`
        }
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        variant="danger"
        onCancel={() => setDeleteServiceId(null)}
        onConfirm={() => void confirmRemoveService()}
      />

      <Modal
        title={editingId != null ? "Редактирование услуги" : "Добавить услугу"}
        open={isAdmin && serviceModalOpen}
        wide
        onClose={() => {
          if (!adminBusy) clearForm();
        }}
      >
        {adminError ? (
          <p className="services-banner services-banner--error" role="alert">
            {adminError}
          </p>
        ) : null}
        <form className="form" onSubmit={submitAdmin}>
          <label className="field">
            <span className="field-label">Название</span>
            <input
              className="input"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              maxLength={150}
            />
          </label>
          <label className="field">
            <span className="field-label">Описание</span>
            <textarea
              className="input services-textarea"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
            />
          </label>
          <div className="services-admin-row">
            <label className="field">
              <span className="field-label">Минуты</span>
              <input
                className="input"
                type="number"
                min={1}
                max={1440}
                value={formDuration}
                onChange={(e) => setFormDuration(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Цена (Br)</span>
              <input
                className="input"
                type="number"
                min={0}
                step={0.01}
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                required
              />
            </label>
          </div>
          <div className="modal-footer-actions">
            <button type="submit" className="btn btn-primary" disabled={adminBusy}>
              {adminBusy ? "Сохранение…" : editingId != null ? "Сохранить" : "Создать"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => clearForm()} disabled={adminBusy}>
              Отмена
            </button>
          </div>
        </form>
      </Modal>
    </PageContent>
  );
}
