import i18n from 'src/i18n';
import store from 'src/store';
import { notify } from './toast';

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAuy/6d8vo+G5iVx/TixNS\nc3h8IUzrBACUUp7XdK4l/nsd3mhzb7WmhRuPEqekSsr3fsKGabmTkeeFqNhvWk3f\ntzU80+EVVqIzOkMU6jBSfDZ5pHCNYkU+d9VWz3kuT5wcgTTQjDvwP+7+MBAIp216\n/0w1d5Cnk3l1sLi4jA2fN9fE0kACXhWRI44pcRscrCefEWU84qEItYg+8Ns198GQ\nd0Nc0elWlG91/h/2bsnuWhP0q3VHhXNwxQxkLhTs5s3/pnUNZc3eWi/NwIu8m7L9\nHhuvS11Y1ILP9OB5vDKRstaApw0RUjkHvwJaNusDudHkz+znOymqzlS3Ru15hYO3\nEzDmoF4xT6YBz9rg4+7NrDqLnVPPFSrfNNvF4J7klh69FA7kmNANiO+qNKdS9K2s\nM450xvROfQRoLm45seqsn6M3XDmwKPSM6FcGOgtg/zWRm/q8QgKZ7OHDXTcLAs34\n4QZtHytJG/oGnHd9SkaY15zF3PVmBrOK3cNzQhowjeT/AgMBAAE=
-----END PUBLIC KEY-----`;

const ISSUER = 'rentgen.io';
const ALLOWED_PLANS = ['pro'] as const;
const DAY_SECONDS = 86_400;

export type LicensePlan = (typeof ALLOWED_PLANS)[number];
export type LicenseStatus = 'valid' | 'expired' | 'not_yet_valid' | 'invalid';

export interface LicenseInfo {
  company: string;
  daysLeft: number;
  expiresOn: string;
  plan: LicensePlan;
  startsOn: string;
  trial: boolean;
}

export type LicenseResult =
  | { valid: true; status: 'valid'; info: LicenseInfo }
  | { valid: false; status: 'expired' | 'not_yet_valid' | 'trial_used'; error: string; info: LicenseInfo }
  | { valid: false; status: 'invalid'; error: string };

export interface VerifyOptions {
  now?: number;
}

interface JwtHeader {
  alg?: unknown;
  typ?: unknown;
}

interface LicenseClaims {
  iss: string;
  plan: LicensePlan;
  company: string;
  startsOn: string;
  expiresOn: string;
  iat: number;
  nbf: number;
  exp: number;
}

function unb64url(s: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(s)) throw new Error('Invalid Base64URL');
  let x = s.replace(/-/g, '+').replace(/_/g, '/');
  x += '='.repeat((4 - (x.length % 4)) % 4);
  return Uint8Array.from(atob(x), (c) => c.charCodeAt(0));
}

function pemBytes(pem: string): Uint8Array<ArrayBuffer> {
  const b64 = pem.replace(/-----BEGIN [^-]+-----|-----END [^-]+-----|\s/g, '');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function decodeJson(s: string): unknown {
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(unb64url(s)));
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isoDateValid(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function isSafeInt(v: unknown): v is number {
  return Number.isSafeInteger(v);
}

function isAllowedPlan(v: unknown): v is LicensePlan {
  return (ALLOWED_PLANS as readonly unknown[]).includes(v);
}

function isLicenseClaims(p: unknown): p is LicenseClaims {
  if (!isObject(p)) return false;
  const { iss, plan, company, startsOn, expiresOn, iat, nbf, exp } = p;

  return (
    iss === ISSUER &&
    isAllowedPlan(plan) &&
    typeof company === 'string' &&
    company.trim().length > 0 &&
    isoDateValid(startsOn) &&
    isoDateValid(expiresOn) &&
    isSafeInt(iat) &&
    isSafeInt(nbf) &&
    isSafeInt(exp) &&
    exp === Math.floor((Date.parse(`${expiresOn}T00:00:00Z`) + DAY_SECONDS * 1000) / 1000) &&
    nbf === iat &&
    startsOn === new Date(iat * 1000).toISOString().slice(0, 10)
  );
}

function isLessThanOneYear(date1: Date, date2: Date): boolean {
  const [earlier, later] = date1 < date2 ? [date1, date2] : [date2, date1];

  const oneYearLater = new Date(earlier);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

  return later < oneYearLater;
}

let keyPromise: Promise<CryptoKey> | null = null;
function getPublicKey(): Promise<CryptoKey> {
  keyPromise ??= crypto.subtle
    .importKey('spki', pemBytes(PUBLIC_KEY_PEM), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
    .catch((error: unknown) => {
      keyPromise = null;
      throw error;
    });
  return keyPromise;
}

export async function verifyLicense(
  licenseKey: string | null,
  { now = Math.floor(Date.now() / 1000) }: VerifyOptions = {},
): Promise<LicenseResult> {
  const invalid = (error: string): LicenseResult => ({ valid: false, status: 'invalid', error });

  try {
    if (!globalThis.crypto?.subtle) return invalid('Web Crypto unavailable');
    if (typeof licenseKey !== 'string' || !licenseKey.trim()) return invalid('License key is required');

    const token = licenseKey.replace(/\s+/g, '');
    const parts = token.split('.');

    if (parts.length !== 3) return invalid('Invalid license key format');

    const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];
    const header = decodeJson(headerB64) as JwtHeader;

    if (!isObject(header) || header.alg !== 'RS256' || header.typ !== 'JWT')
      return invalid('Unsupported license algorithm');

    const signatureOk = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      await getPublicKey(),
      unb64url(signatureB64),
      new TextEncoder().encode(`${headerB64}.${payloadB64}`),
    );
    if (!signatureOk) return invalid('Invalid digital signature — license may have been modified');

    const claims = decodeJson(payloadB64);
    if (!isLicenseClaims(claims)) return invalid('Invalid license claims');

    const info: LicenseInfo = {
      company: claims.company,
      plan: claims.plan,
      startsOn: claims.startsOn,
      expiresOn: claims.expiresOn,
      daysLeft: Math.round((claims.exp - now) / DAY_SECONDS),
      trial: isLessThanOneYear(new Date(claims.startsOn), new Date(claims.expiresOn)),
    };

    const state = store.getState();
    if (info.trial && state.settings.ai.license.trialUsed && licenseKey !== state.settings.ai.license.key)
      return { valid: false, status: 'trial_used', error: 'Trial license already used', info };

    if (now < claims.nbf) return { valid: false, status: 'not_yet_valid', error: 'License is not yet valid', info };
    if (now >= claims.exp) return { valid: false, status: 'expired', error: 'License has expired', info };

    return { valid: true, status: 'valid', info };
  } catch (error: unknown) {
    return invalid(error instanceof Error ? error.message : 'Invalid license key');
  }
}

export function showLicenseMessage(result: LicenseResult): void {
  switch (result.status) {
    case 'valid':
      notify.success(
        i18n.t('settings.ai.validLicense', { company: result.info.company, expiresOn: result.info.expiresOn }),
        {
          toastId: 'success-license-validation',
        },
      );
      break;
    case 'expired':
      notify.error(i18n.t('settings.ai.expiredLicense'), { toastId: 'error-license-validation' });
      break;
    case 'trial_used':
      notify.error(i18n.t('settings.ai.trialUsedLicense'), { toastId: 'error-license-validation' });
      break;
    case 'not_yet_valid':
      notify.warning(i18n.t('settings.ai.notYetValidLicense', { startsOn: result.info.startsOn }), {
        toastId: 'error-license-warning',
      });
      break;
    default:
      notify.error(i18n.t('settings.ai.invalidLicense'), { toastId: 'error-license-validation' });
  }
}
