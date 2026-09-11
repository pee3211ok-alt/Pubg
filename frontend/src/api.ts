import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;

let tokenCache: string | null = null;

const STORAGE_KEY = "heeba_session_token";

async function readToken(): Promise<string | null> {
  if (tokenCache) return tokenCache;
  try {
    if (Platform.OS === "web") {
      tokenCache = (typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY)) || null;
    } else {
      tokenCache = await SecureStore.getItemAsync(STORAGE_KEY);
    }
  } catch { tokenCache = null; }
  return tokenCache;
}

export async function setToken(t: string | null) {
  tokenCache = t;
  try {
    if (Platform.OS === "web") {
      if (t) window.localStorage.setItem(STORAGE_KEY, t);
      else window.localStorage.removeItem(STORAGE_KEY);
    } else {
      if (t) await SecureStore.setItemAsync(STORAGE_KEY, t);
      else await SecureStore.deleteItemAsync(STORAGE_KEY);
    }
  } catch {}
}

export async function api(path: string, opts: RequestInit = {}): Promise<any> {
  const token = await readToken();
  const headers: any = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BACKEND}${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err: any = new Error(data?.detail || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function apiUpload(path: string, uri: string, name: string, type: string): Promise<any> {
  const token = await readToken();
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append("file", blob, name);
  } else {
    form.append("file", { uri, name, type } as any);
  }
  const res = await fetch(`${BACKEND}${path}`, {
    method: "POST",
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Upload failed ${res.status}`);
  return res.json();
}

export const BACKEND_URL = BACKEND;
export const fileUrl = (u?: string) => {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  return `${BACKEND}${u}`;
};
