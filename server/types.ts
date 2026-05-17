export interface User {
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: string;
  lastSignedIn: Date;
}

export interface InsertUser {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date;
  role?: string;
}
