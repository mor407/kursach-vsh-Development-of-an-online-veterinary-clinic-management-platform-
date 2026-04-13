export type AppointmentPetBrief = {
  id: number;
  name: string;
  species: string;
};

export type AppointmentServiceBrief = {
  id: number;
  name: string;
  durationMinutes: number;
  price: string;
};

export type AppointmentVetBrief = {
  id: number;
  fullName: string;
  specialization: string;
};

export type Appointment = {
  id: number;
  petId: number;
  veterinarianId: number;
  serviceId: number;
  scheduledAt: string;
  status: string;
  clientNotes: string | null;
  createdAt: string;
  pet: AppointmentPetBrief;
  service: AppointmentServiceBrief;
  veterinarian: AppointmentVetBrief;
};
