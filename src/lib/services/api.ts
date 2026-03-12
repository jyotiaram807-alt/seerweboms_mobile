// services/api.ts
import { apiUrl } from "apiurl";

export async function apiGet(endpoint: string, token?: string) {
  const res = await fetch(`${apiUrl}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const text = await res.text(); // 👈 capture response

  if (!res.ok) {
    console.error('API ERROR:', {
      url: `${apiUrl}${endpoint}`,
      status: res.status,
      response: text,
    });
    throw new Error(`API ${res.status}: ${text}`);
  }

  return text ? JSON.parse(text) : [];
}