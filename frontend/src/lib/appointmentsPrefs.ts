const KEY = "vetclinic_appointments_prefs";

export type AppointmentsPrefs = {
  /** пустая строка = все статусы */
  status: string;
  order: "asc" | "desc";
};

export const defaultAppointmentsPrefs: AppointmentsPrefs = {
  status: "",
  order: "desc",
};

export function loadAppointmentsPrefs(): AppointmentsPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultAppointmentsPrefs };
    const p = JSON.parse(raw) as Record<string, unknown>;
    const status = typeof p.status === "string" ? p.status : "";
    const order = p.order === "asc" ? "asc" : "desc";
    return { status, order };
  } catch {
    return { ...defaultAppointmentsPrefs };
  }
}

export function saveAppointmentsPrefs(p: AppointmentsPrefs) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function resetAppointmentsPrefs() {
  localStorage.removeItem(KEY);
}
