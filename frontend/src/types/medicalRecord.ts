import type { AppointmentPetBrief } from "./appointment";

export type MedicalRecordVetBrief = {
  id: number;
  fullName: string;
  specialization: string;
};

export type MedicalRecordAppointmentBrief = {
  id: number;
  scheduledAt: string;
  status: string;
} | null;

export type MedicalRecord = {
  id: number;
  petId: number;
  veterinarianId: number;
  appointmentId: number | null;
  diagnosis: string | null;
  treatmentNotes: string | null;
  /** Фактический момент приёма (если врач указал); иначе смотрите appointment / createdAt */
  visitedAt?: string | null;
  createdAt: string;
  pet: AppointmentPetBrief;
  veterinarian: MedicalRecordVetBrief;
  appointment: MedicalRecordAppointmentBrief;
};
