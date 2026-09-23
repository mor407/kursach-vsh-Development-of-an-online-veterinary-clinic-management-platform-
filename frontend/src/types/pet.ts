export type PetOwnerBrief = {
  id: number;
  fullName: string;
  email: string;
};

export type Pet = {
  id: number;
  ownerId: number;
  name: string;
  species: string;
  breed: string | null;
  birthDate: string | null;
  notes: string | null;
  createdAt: string;
  owner?: PetOwnerBrief;
};
