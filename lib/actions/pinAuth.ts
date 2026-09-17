"use server";

import { getLocalDb, newId, nowIso } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import { cookies } from "next/headers";
import crypto from "crypto";
import { signLocalSession } from "@/lib/auth/localSession";

function hashPin(pin: string, salt: string) {
  return crypto.scryptSync(pin, salt, 32).toString("hex");
}

function generateSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function makePinHash(pin: string) {
  const salt = generateSalt();
  return `${salt}:${hashPin(pin, salt)}`;
}

export async function bootstrapLocalAdmin(fullName: string, pin: string) {
  if (!isLocalMode()) return { error: "Initialisation hors ligne uniquement sur le bureau." };
  const name = fullName.trim();
  if (name.length < 2) return { error: "Veuillez saisir le nom du Super Administrateur." };
  if (!/^\d{4,6}$/.test(pin)) return { error: "Le PIN doit contenir 4 à 6 chiffres." };

  const db = getLocalDb();
  const existing = db.prepare(`SELECT COUNT(*) as count FROM staff WHERE deleted = 0`).get() as { count: number };
  if (existing.count > 0) return { error: "Ce poste est déjà initialisé. Utilisez le PIN d'un membre du personnel." };

  const id = newId();
  const now = nowIso();
  db.prepare(`
    INSERT INTO staff
      (id, auth_user_id, full_name, role, email, active, created_at, updated_at, deleted, pin_hash)
    VALUES (?, NULL, ?, 'super_admin', NULL, 1, ?, ?, 0, ?)
  `).run(id, name, now, now, makePinHash(pin));

  db.prepare(`UPDATE sync_meta SET value = ? WHERE key = 'current_staff_id'`).run(id);
  db.prepare(`
    INSERT INTO audit_log (id, actor_id, action, entity, entity_id, details, created_at)
    VALUES (?, ?, 'local_bootstrap', 'staff', ?, ?, ?)
  `).run(newId(), id, id, JSON.stringify({ role: "super_admin", offline: true }), now);

  const cookieStore = await cookies();
  cookieStore.set("local_pin_session", await signLocalSession(id, "super_admin"), {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
  return { success: true, staffId: id };
}

export async function setLocalPin(pin: string) {
  if (!isLocalMode()) return { error: "PIN login only applies to the desktop app." };
  if (!/^\d{4,6}$/.test(pin)) return { error: "PIN must be 4-6 digits." };
  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };
  const db = getLocalDb();
  db.prepare(`UPDATE staff SET pin_hash = ? WHERE id = ?`).run(makePinHash(pin), staff.id);
  return { success: true };
}

export async function hasLocalPin() {
  if (!isLocalMode()) return false;
  const staff = await getEffectiveStaff();
  if (!staff) return false;
  const db = getLocalDb();
  const row = db.prepare(`SELECT pin_hash FROM staff WHERE id = ?`).get(staff.id) as { pin_hash: string | null } | undefined;
  return !!row?.pin_hash;
}

export async function listPinEnabledStaff() {
  if (!isLocalMode()) return [];
  const db = getLocalDb();
  return db.prepare(`SELECT id, full_name, role FROM staff WHERE pin_hash IS NOT NULL AND active = 1 AND deleted = 0 ORDER BY full_name`).all();
}

export async function pinLogin(staffId: string, pin: string) {
  if (!isLocalMode()) return { error: "PIN login only applies to the desktop app." };
  const db = getLocalDb();
  const staff = db.prepare(`SELECT * FROM staff WHERE id = ? AND active = 1 AND deleted = 0`).get(staffId) as any;
  if (!staff || !staff.pin_hash) return { error: "PIN not set up for this account." };
  const [salt, expectedHash] = staff.pin_hash.split(":");
  if (hashPin(pin, salt) !== expectedHash) return { error: "Incorrect PIN." };
  db.prepare(`UPDATE sync_meta SET value = ? WHERE key = 'current_staff_id'`).run(staff.id);
  const cookieStore = await cookies();
  cookieStore.set("local_pin_session", await signLocalSession(staff.id, staff.role), {
    httpOnly: true,
    secure: process.env.DATA_MODE !== "local",
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
  return { success: true, staffId: staff.id };
}
