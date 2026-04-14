import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env["JWT_SECRET"] || "autohire_jwt_secret_dev_2025";
const BCRYPT_ROUNDS = 10;
const TOKEN_EXPIRY = "7d";

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  profile?: UserProfile;
}

export interface UserProfile {
  headline?: string;
  location?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  bio?: string;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  avatar?: string;
}

export interface ExperienceEntry {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
}

export interface EducationEntry {
  id: string;
  degree: string;
  school: string;
  field?: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  profile?: UserProfile;
}

const users = new Map<string, StoredUser>();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function toPublicUser(u: StoredUser): PublicUser {
  return { id: u.id, name: u.name, email: u.email, createdAt: u.createdAt, profile: u.profile };
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): { userId: string } {
  return jwt.verify(token, JWT_SECRET) as { userId: string };
}

export async function registerUser(name: string, email: string, password: string): Promise<{ user: PublicUser; token: string }> {
  const existing = [...users.values()].find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) throw new Error("An account with this email already exists.");

  if (!name.trim()) throw new Error("Name is required.");
  if (!email.includes("@")) throw new Error("Invalid email address.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const id = generateId();

  const user: StoredUser = {
    id,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    createdAt: new Date().toISOString(),
    profile: {
      skills: [],
      experience: [],
      education: [],
    },
  };

  users.set(id, user);
  const token = generateToken(id);
  return { user: toPublicUser(user), token };
}

export async function loginUser(email: string, password: string): Promise<{ user: PublicUser; token: string }> {
  const user = [...users.values()].find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) throw new Error("No account found with this email.");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error("Incorrect password. Please try again.");

  const token = generateToken(user.id);
  return { user: toPublicUser(user), token };
}

export function getUserById(id: string): StoredUser | undefined {
  return users.get(id);
}

export function updateUserProfile(id: string, updates: Partial<Omit<StoredUser, "id" | "passwordHash" | "createdAt">>): PublicUser {
  const user = users.get(id);
  if (!user) throw new Error("User not found.");

  const updated: StoredUser = {
    ...user,
    name: updates.name ?? user.name,
    profile: updates.profile ? { ...user.profile, ...updates.profile, skills: updates.profile.skills ?? user.profile?.skills ?? [], experience: updates.profile.experience ?? user.profile?.experience ?? [], education: updates.profile.education ?? user.profile?.education ?? [] } : user.profile,
  };

  users.set(id, updated);
  return toPublicUser(updated);
}

export async function changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = users.get(id);
  if (!user) throw new Error("User not found.");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new Error("Current password is incorrect.");

  if (newPassword.length < 6) throw new Error("New password must be at least 6 characters.");

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  users.set(id, { ...user, passwordHash });
}
