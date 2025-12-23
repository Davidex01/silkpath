import type { AuthState } from './authTypes';

const STORAGE_KEY = 'sf_auth';

// "секрет" для симметричного ключа — хранится в коде (обфускация, а не реальная тайна)
const RAW_KEY = new TextEncoder().encode('silkflow-demo-secret-key-32bytes'); // >= 16/32 bytes

async function getCryptoKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    RAW_KEY,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function saveAuthEncrypted(state: AuthState): Promise<void> {
  try {
    const key = await getCryptoKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit nonce for AES-GCM

    const data = new TextEncoder().encode(JSON.stringify(state));

    const encrypted = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data),
    );

    // Сохраняем iv и ciphertext в base64
    const payload = {
      iv: btoa(String.fromCharCode(...iv)),
      data: btoa(String.fromCharCode(...encrypted)),
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // fallback: не пишем ничего
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export async function loadAuthEncrypted(): Promise<AuthState | null> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const { iv, data } = JSON.parse(raw) as { iv: string; data: string };

    const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
    const encBytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));

    const key = await getCryptoKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      encBytes,
    );

    const json = new TextDecoder().decode(decrypted);
    return JSON.parse(json) as AuthState;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}