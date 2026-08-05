"use server";

import { getLocalDb, nowIso } from "@/lib/db/local";
import { getEffectiveStaff } from "@/lib/data/currentStaff";
import { isLocalMode } from "@/lib/data/mode";
import { cookies } from "next/headers";
import crypto from "crypto";
import { signLocalSession } from "@/lib/auth/localSession";

// Simple salted-hash PIN storage using Node's built-in crypto (no extra
// dependency). This is NOT meant to replace real password security — it's a
// convenience layer for re-authenticating on a device that's already been
// logged into once, purely so staff can start a fresh session offline.
function hashPin(pin: string, salt: string) {
  return crypto.scryptSync(pin, salt, 32).toString("hex");
}

function generateSalt() {
  return crypto.randomBytes(16).toString("hex");
}

// Called while online/logged in normally, to set up offline PIN login for
// next time. Requires the person to already be authenticated.
export async function setLocalPin(pin: string) {
  if (!isLocalMode()) return { error: "PIN login only applies to the desktop app." };
  if (!/^\d{4,6}$/.test(pin)) return { error: "PIN must be 4-6 digits." };

  const staff = await getEffectiveStaff();
  if (!staff) return { error: "Not authenticated" };

  const salt = generateSalt();
  const hash = hashPin(pin, salt);
  const stored = `${salt}:${hash}`;

  const db = getLocalDb();
  db.prepare(`UPDATE staff SET pin_hash = ? WHERE id = ?`).run(stored, staff.id);

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

// Lists staff who have a PIN set up on this machine, for the offline login
// picker (no email typing needed while offline).
export async function listPinEnabledStaff() {
  if (!isLocalMode()) return [];
  const db = getLocalDb();
  return db
    .prepare(`SELECT id, full_name, role FROM staff WHERE pin_hash IS NOT NULL AND active = 1 AND deleted = 0 ORDER BY full_name`)
    .all();
}

export async function pinLogin(staffId: string, pin: string) {
  if (!isLocalMode()) return { error: "PIN login only applies to the desktop app." };

  const db = getLocalDb();
  const staff = db.prepare(`SELECT * FROM staff WHERE id = ? AND active = 1 AND deleted = 0`).get(staffId) as any;

  if (!staff || !staff.pin_hash) return { error: "PIN not set up for this account." };

  const [salt, expectedHash] = staff.pin_hash.split(":");
  const actualHash = hashPin(pin, salt);

  if (actualHash !== expectedHash) return { error: "Incorrect PIN." };

  db.prepare(`UPDATE sync_meta SET value = ? WHERE key = 'current_staff_id'`).run(staff.id);

  // A lightweight marker cookie so middleware can recognize an active local
  // session without needing to touch the database itself (middleware may run
  // in a runtime that can't load the native SQLite binding).
  const cookieStore = await cookies();
  cookieStore.set("local_pin_session", await signLocalSession(staff.id, staff.role), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 12, // 12 hours — re-enter PIN daily, not "forever"
    path: "/",
  });

  return { success: true, staffId: staff.id };
}
