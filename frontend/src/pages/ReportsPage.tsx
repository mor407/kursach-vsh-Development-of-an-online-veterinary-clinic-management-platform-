import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import "../styles/pages/reports.css";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function firstOfMonthYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function inDateRange(iso: string, fromYmd: string, toYmd: string) {
  const t = new Date(iso).getTime();
  const from = new Date(`${fromYmd}T00:00:00`).getTime();
  const to = new Date(`${toYmd}T23:59:59.999`).getTime();
  return t >= from && t <= to;
}

function formatRangeLabel(fromYmd: string, toYmd: string) {
  const parse = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const from = parse(fromYmd);
  const to = parse(toYmd);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  return `${from.toLocaleDateString("ru-RU", opts)} — ${to.toLocaleDateString("ru-RU", opts)}`;
}

async function downloadPdfReport(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const html2pdf = (await import("html2pdf.js")).default;
  const worker = html2pdf();
  /** Runtime accepts `pagebreak`; types omit it — cast keeps both. */
  type SetOpts = Parameters<typeof worker.set>[0];
  await worker
    .set({
      margin: [12, 10, 14, 10],
      filename,
      image: { type: "jpeg", quality: 0.94 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#131b2c",
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    } as SetOpts)
    .from(element)
    .save();
}

export function ReportsPage() {
  const [me, setMe] = useState<MeUser | null>(null);
  const [all, setAll] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(firstOfMonthYmd);
  const [dateTo, setDateTo] = useState(todayYmd);
  const [pdfBusy, setPdfBusy] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const hasToken = Boolean(getToken());
  const role = me?.role.name;
  const allowed = role === "doctor" || role === "admin";

  const loadAll = useCallback(async () => {
    setError(null);
    const res = await fetchApi("/api/appointments?order=asc");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setAll([]);
      setError(typeof data.error === "string" ? data.error : "Не удалось загрузить данные");
      return;
    }
    setAll(Array.isArray(data) ? data : []);
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
          await loadAll();
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
  }, [hasToken, loadAll]);

  const filtered = useMemo(
    () => all.filter((a) => inDateRange(a.scheduledAt, dateFrom, dateTo)),
    [all, dateFrom, dateTo],
  );

  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const a of filtered) {
      byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    }
    return { total: filtered.length, byStatus };
  }, [filtered]);

  async function onDownloadPdf() {
    const el = printAreaRef.current;
    if (!el || filtered.length === 0) return;
    setPdfBusy(true);
    setError(null);
    try {
      await downloadPdfReport(el, `appointments_${dateFrom}_${dateTo}.pdf`);
    } catch {
      setError("Не удалось сформировать PDF. Попробуйте ещё раз.");
    } finally {
      setPdfBusy(false);
    }
  }

  if (!hasToken) {
    return (
      <PageContent title="Отчёты" lead="Войдите как врач или администратор.">
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
      <PageContent title="Отчёты" lead="Раздел только для врача и администратора.">
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
      title="Отчёты"
      lead="Сводка по записям на приём за период. Выгрузка в PDF."
    >
      {loading ? <p className="services-status">Загрузка…</p> : null}
      {error ? (
        <p className="services-banner services-banner--error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && allowed ? (
        <>
          <div className="reports-toolbar services-toolbar">
            <label className="services-field services-field--narrow">
              <span className="services-field-label">С даты</span>
              <input
                className="input"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </label>
            <label className="services-field services-field--narrow">
              <span className="services-field-label">По дату</span>
              <input
                className="input"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </label>
            <button type="button" className="btn btn-ghost services-reset" onClick={() => loadAll()}>
              Обновить данные
            </button>
            <button
              type="button"
              className="btn btn-primary services-add-btn"
              disabled={filtered.length === 0 || pdfBusy}
              onClick={onDownloadPdf}
            >
              {pdfBusy ? "PDF…" : "Скачать PDF"}
            </button>
          </div>

          <div ref={printAreaRef} className="reports-print-area">
            <header className="reports-pdf-header">
              <h2 className="reports-pdf-title">Отчёт: записи на приём</h2>
              <p className="reports-pdf-period">{formatRangeLabel(dateFrom, dateTo)}</p>
            </header>

            <div className="reports-stats">
              <p className="reports-stat-main">
                Всего в периоде: <strong>{stats.total}</strong>
              </p>
              {stats.total > 0 ? (
                <ul className="reports-stat-list">
                  {Object.entries(stats.byStatus).map(([s, n]) => (
                    <li key={s}>
                      {APPOINTMENT_STATUS_LABELS[s] ?? s}: {n}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="services-table-wrap">
              {filtered.length === 0 ? (
                <p className="services-status">Нет записей в выбранном диапазоне.</p>
              ) : (
                <table className="services-table appt-table">
                  <caption className="visually-hidden">Приёмы за период</caption>
                  <thead>
                    <tr>
                      <th scope="col">Дата и время</th>
                      <th scope="col">Питомец</th>
                      <th scope="col">Услуга</th>
                      <th scope="col">Врач</th>
                      <th scope="col">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => (
                      <tr key={a.id}>
                        <td>{formatAppointmentDate(a.scheduledAt)}</td>
                        <td>
                          {a.pet.name}
                          <div className="pets-owner-email">{a.pet.species}</div>
                        </td>
                        <td className="services-table-desc">{a.service.name}</td>
                        <td>
                          {a.veterinarian.fullName}
                          <div className="pets-owner-email">{a.veterinarian.specialization}</div>
                        </td>
                        <td>{APPOINTMENT_STATUS_LABELS[a.status] ?? a.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : null}
    </PageContent>
  );
}
