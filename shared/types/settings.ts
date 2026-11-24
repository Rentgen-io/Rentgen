import { Interval } from 'shared/types/testing';

// The plans a license may grant; a license for any other plan is rejected
export const LICENSE_PLANS = ['pro'] as const;

export type LicensePlan = (typeof LICENSE_PLANS)[number];
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

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'lt', label: 'Lietuvių' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'ru', label: 'Русский' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'uk', label: 'Українська' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'th', label: 'ไทย' },
  { code: 'zh-CN', label: '中文 (简体)' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];

export type HistoryRetention = '1w' | '1m' | '3m' | '6m' | '1y' | 'none';

export const AI_API_CONTEXT_MAX_LENGTH = 5000;

export type AiProviderType = 'anthropic' | 'ollama' | 'openai';

export type AiProvider = {
  apiKey: string;
  active: boolean;
  baseUrl: string;
  id: string;
  model: string;
  name: string;
  path: string;
  type: AiProviderType;
};

export type License = LicenseResult & {
  key: string | null;
  trialUsed: boolean;
};

export interface SettingsState {
  cli: unknown;
  general: {
    history: {
      enabled: boolean;
      size: number;
      retention: HistoryRetention;
    };
  };
  ai: {
    advanced: {
      apiContext: string;
    };
    license: License;
    providers: AiProvider[];
  };
  testEngine: {
    configuration: {
      email: {
        domain: string;
      };
      randomEmail: {
        length: number;
      };
      randomInt: Interval;
      randomString: {
        length: number;
      };
      enum: string;
      number: Interval;
      string: {
        maxLength: number;
        minLength: number;
      };
    };
    securityTests: {
      disabled: string[];
    };
    performanceInsights: {
      disabled: string[];
    };
  };
  theme: 'light' | 'dark';
  language: Language;
}

export type TestEngineConfiguration = SettingsState['testEngine']['configuration'];
