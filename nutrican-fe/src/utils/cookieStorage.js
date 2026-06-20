/**
 * JavaScript-readable cookie storage adapter for Zustand's persist middleware.
 * NOT HttpOnly — accessible via document.cookie (for state hydration only).
 * Sensitive refresh token is in a separate HttpOnly cookie managed by the backend.
 */

const COOKIE_NAME = 'nutrican-auth';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function parseCookies() {
  const cookies = {};
  if (typeof document === 'undefined') return cookies;
  document.cookie.split(';').forEach((pair) => {
    const [key, ...valParts] = pair.trim().split('=');
    if (key) {
      cookies[decodeURIComponent(key)] = valParts.join('=');
    }
  });
  return cookies;
}

export const cookieStorage = {
  getItem(name) {
    if (name !== COOKIE_NAME) return null;
    const cookies = parseCookies();
    const raw = cookies[name];
    if (!raw) return null;
    try {
      return JSON.parse(decodeURIComponent(raw));
    } catch {
      return null;
    }
  },

  setItem(name, value) {
    if (name !== COOKIE_NAME) return;
    // Zustand calls setItem with empty state on logout — treat as remove
    if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) {
      this.removeItem(name);
      return;
    }
    try {
      const serialized = encodeURIComponent(JSON.stringify(value));
      document.cookie = `${COOKIE_NAME}=${serialized}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    } catch (e) {
      console.error('cookieStorage.setItem failed:', e);
    }
  },

  removeItem(name) {
    if (name !== COOKIE_NAME) return;
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  },
};
