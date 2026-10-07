import { appConfig } from './constants';
import { MappingsState } from './types/mappings';
import { SettingsState } from './types/settings';

export const defaultMappings: MappingsState = {};

export const defaultSettings: SettingsState = {
  cli: {},
  general: {
    history: {
      enabled: true,
      size: 1000,
      retention: 'none',
    },
  },
  ai: {
    serialNumber: null,
  },
  testEngine: {
    configuration: {
      email: {
        domain: appConfig.domain,
      },
      randomEmail: {
        length: 8,
      },
      randomInt: {
        min: 0,
        max: Number.MAX_SAFE_INTEGER,
      },
      randomString: {
        length: 32,
      },
      enum: '',
      number: {
        min: -10000,
        max: 10000,
      },
      string: {
        minLength: 1,
        maxLength: 128,
      },
    },
    securityTests: {
      disabled: [],
    },
    performanceInsights: {
      disabled: [],
    },
  },
  theme: 'light',
  language: 'en',
};
