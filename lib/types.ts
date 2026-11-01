export type Lang = 'en' | 'ar';

export const UNITS = ['pcs', 'kg', 'g', 'L', 'mL', 'pack', 'box'] as const;
export type Unit = (typeof UNITS)[number];

export type Item = {
  id: string;
  name: string;
  quantity: number;
  unit: Unit;
  dueAt: Date | null;
  bought: boolean;
  boughtBy: string | null;
  addedBy: string;
  addedById: string;
  createdAt: Date;
};

export type Member = {
  id: string;
  displayName: string;
  expoPushToken: string;
  language: Lang;
  joinedAt: Date | null;
};

export type Family = {
  id: string;
  name: string;
  nameKey: string;
  creatorId: string;
  createdAt: Date | null;
};
