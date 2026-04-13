export type MeUser = {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  role: { id: number; name: string };
};

/** Ответ GET /api/users (только админ). */
export type AdminListUser = {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  role: { id: number; name: string };
  veterinarian: {
    id: number;
    specialization: string;
    licenseNumber: string | null;
  } | null;
};
