export type UserRole =
  | 'Administrator'
  | 'Manager'
  | 'Warehouse Staff'
  | 'Sales Personnel';

export interface User {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'locked';
}

export interface LoginResponse {
  token: string;
  user: User;
}
