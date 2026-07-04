export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  refresh_token: string | null;
  created_at: Date;
  updated_at: Date;
}
