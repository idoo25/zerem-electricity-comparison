"use client";

import type { Profile } from "@/lib/types";

const DATABASE_NAME = "electricity-comparison-local";
const STORE_NAME = "meter-files";
const FILE_KEY = "latest-meter-file";
const PROFILE_KEY = "electricity-comparison-profile-v2";
const WEEK_MS = 7 * 24 * 60 * 60 * 1_000;

type StoredMeterFile = {
  id: typeof FILE_KEY;
  name: string;
  type: string;
  lastModified: number;
  blob: Blob;
  expiresAt: number;
};

type StoredProfile = {
  profile: Profile;
  expiresAt: number;
};

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("לא ניתן לפתוח את האחסון המקומי."));
  });
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("פעולת האחסון המקומי נכשלה."));
  });
}

export async function saveMeterFile(file: File) {
  if (typeof indexedDB === "undefined") return;
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  const record: StoredMeterFile = {
    id: FILE_KEY,
    name: file.name,
    type: file.type || "text/csv",
    lastModified: file.lastModified,
    blob: file.slice(0, file.size, file.type || "text/csv"),
    expiresAt: Date.now() + WEEK_MS,
  };
  await requestResult(transaction.objectStore(STORE_NAME).put(record));
  database.close();
}

export async function loadMeterFile() {
  if (typeof indexedDB === "undefined") return null;
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readonly");
  const record = await requestResult(transaction.objectStore(STORE_NAME).get(FILE_KEY)) as StoredMeterFile | undefined;
  database.close();
  if (!record) return null;
  if (record.expiresAt <= Date.now()) {
    await clearMeterFile();
    return null;
  }
  return new File([record.blob], record.name, {
    type: record.type,
    lastModified: record.lastModified,
  });
}

export async function clearMeterFile() {
  if (typeof indexedDB === "undefined") return;
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  await requestResult(transaction.objectStore(STORE_NAME).delete(FILE_KEY));
  database.close();
}

export function saveProfile(profile: Profile) {
  if (typeof window === "undefined") return;
  const value: StoredProfile = { profile, expiresAt: Date.now() + WEEK_MS };
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(value));
}

export function loadProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredProfile;
    if (stored.expiresAt <= Date.now()) {
      window.localStorage.removeItem(PROFILE_KEY);
      return null;
    }
    const profile = stored.profile;
    if (
      !profile ||
      !["smart", "basic"].includes(profile.meterType) ||
      !["single", "three"].includes(profile.phase) ||
      !Number.isFinite(profile.tenureYear)
    ) return null;
    return profile.capacityKva && Number.isFinite(profile.capacityKva)
      ? profile
      : { ...profile, phase: "three" as const, capacityKva: 17.32 };
  } catch {
    window.localStorage.removeItem(PROFILE_KEY);
    return null;
  }
}

export async function clearLocalComparison() {
  if (typeof window !== "undefined") window.localStorage.removeItem(PROFILE_KEY);
  await clearMeterFile();
}
