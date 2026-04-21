export type User = {
  id: number;
  name: string | null;
  email: string;
  phone: string | null;
  /** Normalized 12 digits when set (from `/auth/me`). */
  aadhaarNumber: string | null;
  /** Positive integer rank when set. */
  studentRank: number | null;
  aadhaarPdfUploaded: boolean;
  rankPdfUploaded: boolean;
  role: "student" | "admin";
  isActive: boolean;
  profileComplete: boolean;
};

export type RegisterInput = {
  email: string;
  password: string;
  name?: string;
  phone?: string;
};
