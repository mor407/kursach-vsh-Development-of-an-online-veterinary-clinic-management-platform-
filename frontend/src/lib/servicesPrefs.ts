const KEY = "vetclinic_services_prefs";

export type ServicesPrefs = {
  q: string;
  sort: "name" | "price" | "durationMinutes";
  order: "asc" | "desc";
};

export const defaultServicesPrefs: ServicesPrefs = {
  q: "",
  sort: "name",
  order: "asc",
};

export function loadServicesPrefs(): ServicesPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultServicesPrefs };
    const p = JSON.parse(raw) as Record<string, unknown>;
    return {
      q: typeof p.q === "string" ? p.q : "",
      sort:
        p.sort === "price" || p.sort === "durationMinutes" ? p.sort : "name",
      order: p.order === "desc" ? "desc" : "asc",
    };
  } catch {
    return { ...defaultServicesPrefs };
  }
}

export function saveServicesPrefs(p: ServicesPrefs) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function resetServicesPrefs() {
  localStorage.removeItem(KEY);
}
