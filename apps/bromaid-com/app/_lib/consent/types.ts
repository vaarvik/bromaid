/**
 * Three-state consent model:
 *   - `unset`   – user hasn't decided yet → show banner, no tracking
 *   - `granted` – user accepted analytics → tracking on
 *   - `denied`  – user declined analytics → tracking off (and remembered)
 */
export type ConsentStatus = 'unset' | 'granted' | 'denied';

export type ConsentRecord = {
  readonly status: ConsentStatus;
  /** ISO-8601 timestamp of when the decision was made (or null if unset). */
  readonly decidedAt: string | null;
  /** Schema version of the consent record. Bump when categories change. */
  readonly version: 1;
};

export const CONSENT_COOKIE_NAME = 'bromaid_consent';
/** ~13 months — aligns with the GDPR/CNIL recommendation for cookie consent. */
export const CONSENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 395;
