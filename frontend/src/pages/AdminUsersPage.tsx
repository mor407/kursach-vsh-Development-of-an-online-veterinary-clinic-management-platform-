import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageContent } from "../components/PageContent";
import { RolePicker } from "../components/RolePicker";
import { fetchApi } from "../lib/api";
import { getToken } from "../lib/authStorage";
import type { AdminListUser, MeUser } from "../types/user";
import "../styles/pages/admin-users.css";

const ROLE_OPTIONS = [
  { value: "client", label: "Клиент" },
  { value: "doctor", label: "Врач" },
  { value: "admin", label: "Администратор" },
] as const;

function roleLabel(name: string): string {
  return ROLE_OPTIONS.find((o) => o.value === name)?.label ?? name;
}

function roleClassName(name: string): string {
  return `admin-role-badge admin-role-badge--${name}`;
}

type RowProps = {
  user: AdminListUser;
  onUpdated: (u: AdminListUser) => void;
};

function AdminUserRow({ user, onUpdated }: RowProps) {
  const [role, setRole] = useState(user.role.name);
  const [specialization, setSpecialization] = useState(user.veterinarian?.specialization ?? "");
  const [licenseNumber, setLicenseNumber] = useState(user.veterinarian?.licenseNumber ?? "");
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setRole(user.role.name);
    setSpecialization(user.veterinarian?.specialization ?? "");
    setLicenseNumber(user.veterinarian?.licenseNumber ?? "");
    setRowError(null);
    setExpanded(false);
  }, [user]);

  const needsSpecForNewDoctor = role === "doctor" && !user.veterinarian;

  async function apply() {
    setRowError(null);
    if (needsSpecForNewDoctor && specialization.trim() === "") {
      setRowError("Укажите специализацию для нового врача");
      return;
    }
    const body: Record<string, string> = { role };
    if (role === "doctor") {
      if (specialization.trim()) body.specialization = specialization.trim();
      if (licenseNumber.trim()) body.licenseNumber = licenseNumber.trim();
    }
    setBusy(true);
    try {
      const res = await fetchApi(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRowError(typeof data.error === "string" ? data.error : "Не удалось сохранить");
        return;
      }
      onUpdated(data as AdminListUser);
    } finally {
      setBusy(false);
    }
  }

  const changed =
    role !== user.role.name ||
    (role === "doctor" &&
      user.veterinarian &&
      (specialization.trim() !== user.veterinarian.specialization ||
        licenseNumber.trim() !== (user.veterinarian.licenseNumber ?? "")));

  return (
    <article className="admin-user-card">
      <header className="admin-user-card-head">
        <div className="admin-user-card-identity">
        <div className="admin-user-name">{user.fullName}</div>
        <div className="pets-owner-email admin-user-email">{user.email}</div>
          <div className="admin-user-phone">{user.phone ?? "—"}</div>
        </div>
        <div className="admin-user-card-role">
        <span className={roleClassName(user.role.name)}>{roleLabel(user.role.name)}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Скрыть редактирование" : "Изменить"}
          </button>
        </div>
      </header>

      {expanded ? (
        <div className="admin-user-card-editor">
        <div className="admin-user-edit">
          <label className="admin-user-field">
            <span className="services-field-label">Новая роль</span>
            <RolePicker options={ROLE_OPTIONS} value={role} onChange={setRole} />
          </label>
          {role === "doctor" ? (
            <>
              <label className="admin-user-field">
                <span className="services-field-label">
                  Специализация{needsSpecForNewDoctor ? " *" : ""}
                </span>
                <input
                  className="input"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="Напр. терапия мелких животных"
                />
              </label>
              <label className="admin-user-field">
                <span className="services-field-label">Номер лицензии</span>
                <input
                  className="input"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="Необязательно"
                />
              </label>
            </>
          ) : null}
          {rowError ? (
            <p className="services-banner services-banner--error admin-user-row-err" role="alert">
              {rowError}
            </p>
          ) : null}
          <button
            type="button"
            className="btn btn-primary btn-sm admin-user-save"
            disabled={!changed || busy || (needsSpecForNewDoctor && specialization.trim() === "")}
            onClick={() => void apply()}
          >
            {busy ? "Сохранение…" : "Применить"}
          </button>
        </div>
        </div>
      ) : null}
    </article>
  );
}

export function AdminUsersPage() {
  const [me, setMe] = useState<MeUser | null>(null);
  const [users, setUsers] = useState<AdminListUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasToken = Boolean(getToken());
  const isAdmin = me?.role.name === "admin";
  const stats = {
    total: users.length,
    clients: users.filter((u) => u.role.name === "client").length,
    doctors: users.filter((u) => u.role.name === "doctor").length,
    admins: users.filter((u) => u.role.name === "admin").length,
  };

  const loadUsers = useCallback(async () => {
    setError(null);
    const res = await fetchApi("/api/users");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setUsers([]);
      setError(typeof data.error === "string" ? data.error : "Не удалось загрузить список");
      return;
    }
    setUsers(Array.isArray(data) ? data : []);
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
        if (user?.role.name === "admin") {
          await loadUsers();
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
  }, [hasToken, loadUsers]);

  function onRowUpdated(updated: AdminListUser) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  if (!hasToken) {
    return (
      <PageContent title="Пользователи" lead="Управление ролями — только для администратора.">
        <p className="page-placeholder">
          <Link className="text-link" to="/login">
            Войти
          </Link>
        </p>
      </PageContent>
    );
  }

  if (!loading && me && !isAdmin) {
    return (
      <PageContent title="Пользователи" lead="Раздел только для администратора.">
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
      title="Пользователи"
      lead="Назначение ролей: клиент, врач или администратор. После смены роли пользователю нужно войти снова, чтобы обновилась сессия."
    >
      {loading ? <p className="services-status">Загрузка…</p> : null}
      {error ? (
        <p className="services-banner services-banner--error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && isAdmin ? (
        <>
          <div className="admin-users-stats" aria-label="Сводка по пользователям">
            <div className="admin-users-stat">
              <span>Всего</span>
              <strong>{stats.total}</strong>
            </div>
            <div className="admin-users-stat">
              <span>Клиенты</span>
              <strong>{stats.clients}</strong>
            </div>
            <div className="admin-users-stat">
              <span>Врачи</span>
              <strong>{stats.doctors}</strong>
            </div>
            <div className="admin-users-stat">
              <span>Админы</span>
              <strong>{stats.admins}</strong>
            </div>
          </div>

          <div className="admin-users-cards">
            {users.map((u) => (
              <AdminUserRow key={u.id} user={u} onUpdated={onRowUpdated} />
            ))}
            {users.length === 0 && !error ? (
              <p className="services-status admin-users-empty">Пользователей нет.</p>
            ) : null}
          </div>
        </>
      ) : null}
    </PageContent>
  );
}
