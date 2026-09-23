const KEY = "vetclinic_medical_prefs";

export type MedicalRecordsPrefs = {
  petId: string;
  order: "asc" | "desc";
};

export const defaultMedicalRecordsPrefs: MedicalRecordsPrefs = {
  petId: "",
  order: "desc",
};

export function loadMedicalRecordsPrefs(): MedicalRecordsPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultMedicalRecordsPrefs };
    const p = JSON.parse(raw) as Record<string, unknown>;
    return {
      petId: typeof p.petId === "string" ? p.petId : "",
      order: p.order === "asc" ? "asc" : "desc",
    };
  } catch {
    return { ...defaultMedicalRecordsPrefs };
  }
}

export function saveMedicalRecordsPrefs(p: MedicalRecordsPrefs) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function resetMedicalRecordsPrefs() {
  localStorage.removeItem(KEY);
}
