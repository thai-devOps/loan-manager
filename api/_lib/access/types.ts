export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface AppUser {
  _id?: string;
  id: string;
  name: string;
  email: string;
  username: string;
  passwordHash: string;
  avatarUrl?: string;
  roleIds: string[];
  status: UserStatus;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type PublicUser = Omit<AppUser, "passwordHash" | "_id">;

export interface AppRole {
  _id?: string;
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

export interface AuditLog {
  _id?: string;
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuthMeResponse {
  user: PublicUser;
  roles: string[];
  permissions: string[];
}

export function toPublicUser(user: AppUser): PublicUser {
  const { passwordHash: _pw, _id: _unused, ...rest } = user;
  void _pw;
  void _unused;
  return rest;
}
