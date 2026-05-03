import {
  CONSENT_COOKIE_MAX_AGE_SECONDS,
  CONSENT_COOKIE_NAME,
  type ConsentRecord,
  type ConsentStatus,
} from './types';

const UNSET_RECORD: ConsentRecord = {
  status: 'unset',
  decidedAt: null,
  version: 1,
};

function isConsentStatus(value: string): value is ConsentStatus {
  return value === 'unset' || value === 'granted' || value === 'denied';
}

/**
 * Best-effort parse of the cookie value. Cookies are user-controlled so we
 * defensively return `unset` on anything we don't recognise rather than
 * surfacing parse errors.
 */
function parseConsentCookie(raw: string): ConsentRecord {
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as {
      status?: string;
      decidedAt?: string | null;
      version?: number;
    };
    if (typeof parsed.status !== 'string' || !isConsentStatus(parsed.status)) {
      return UNSET_RECORD;
    }
    if (parsed.version !== 1) return UNSET_RECORD;
    const decidedAt =
      typeof parsed.decidedAt === 'string' || parsed.decidedAt === null ? parsed.decidedAt : null;
    return { status: parsed.status, decidedAt, version: 1 };
  } catch {
    return UNSET_RECORD;
  }
}

function readConsentCookieFromDocument(): string | null {
  if (typeof document === 'undefined') return null;
  const target = `${CONSENT_COOKIE_NAME}=`;
  const all = document.cookie.split('; ');
  for (const entry of all) {
    if (entry.startsWith(target)) return entry.slice(target.length);
  }
  return null;
}

export function readConsent(): ConsentRecord {
  const raw = readConsentCookieFromDocument();
  if (raw === null) return UNSET_RECORD;
  return parseConsentCookie(raw);
}

export function writeConsent(status: Exclude<ConsentStatus, 'unset'>): ConsentRecord {
  const record: ConsentRecord = {
    status,
    decidedAt: new Date().toISOString(),
    version: 1,
  };
  if (typeof document !== 'undefined') {
    const value = encodeURIComponent(JSON.stringify(record));
    const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
    document.cookie =
      `${CONSENT_COOKIE_NAME}=${value}` +
      `; Path=/` +
      `; Max-Age=${CONSENT_COOKIE_MAX_AGE_SECONDS}` +
      `; SameSite=Lax` +
      secure;
  }
  return record;
}

export function clearConsent(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${CONSENT_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export const initialConsent: ConsentRecord = UNSET_RECORD;
