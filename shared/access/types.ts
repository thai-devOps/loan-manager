export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  username: string;
  avatarUrl?: string;
  roleIds: string[];
  status: UserStatus;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppRole {
  id: string;
  name: string;
  code: string;
  description?: string;
  permissions: string[];
  isSystemRole: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthMeResponse {
  user: PublicUser;
  roles: string[];
  permissions: string[];
}
