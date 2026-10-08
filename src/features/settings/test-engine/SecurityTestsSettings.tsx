import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import {
  AUTHORIZATION_TEST_NAME,
  CACHE_CONTROL_PRIVATE_API_TEST_NAME,
  CLICKJACKING_PROTECTION_TEST_NAME,
  CORS_TEST_NAME,
  HSTS_STRICT_TRANSPORT_SECURITY_TEST_NAME,
  INVALID_AUTHORIZATION_TEST_NAME,
  MIME_SNIFFING_PROTECTION_TEST_NAME,
  NO_SENSITIVE_SERVER_HEADERS_TEST_NAME,
  NOT_FOUND_TEST_NAME,
  OPTIONS_METHOD_HANDLING_TEST_NAME,
  REFLECTED_PAYLOAD_SAFETY_TEST_NAME,
  UNSUPPORTED_METHOD_TEST_NAME,
  UPPERCASE_DOMAIN_TEST_NAME,
  UPPERCASE_PATH_TEST_NAME,
} from 'shared/testNames';
import Toggle from 'src/components/inputs/Toggle';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectDisabledSecurityTests } from 'src/store/selectors';
import { settingsActions } from 'src/store/slices/settingsSlice';
import SettingsHeader from '../SettingsHeader';

export const SECURITY_TESTS: string[] = [
  AUTHORIZATION_TEST_NAME,
  CACHE_CONTROL_PRIVATE_API_TEST_NAME,
  CLICKJACKING_PROTECTION_TEST_NAME,
  CORS_TEST_NAME,
  HSTS_STRICT_TRANSPORT_SECURITY_TEST_NAME,
  INVALID_AUTHORIZATION_TEST_NAME,
  MIME_SNIFFING_PROTECTION_TEST_NAME,
  NO_SENSITIVE_SERVER_HEADERS_TEST_NAME,
  NOT_FOUND_TEST_NAME,
  OPTIONS_METHOD_HANDLING_TEST_NAME,
  REFLECTED_PAYLOAD_SAFETY_TEST_NAME,
  UNSUPPORTED_METHOD_TEST_NAME,
  UPPERCASE_DOMAIN_TEST_NAME,
  UPPERCASE_PATH_TEST_NAME,
];

export function SecurityTestsSettings() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const disabledSecurityTests = useAppSelector(selectDisabledSecurityTests);

  return (
    <div className="flex flex-col gap-4">
      <SettingsHeader>
        <span>{t('settings.securityTests.title')}</span>
        <span className="font-normal text-xs text-text-secondary">
          {t('settings.securityTests.enabledCount', {
            enabled: SECURITY_TESTS.length - disabledSecurityTests.length,
            total: SECURITY_TESTS.length,
          })}
        </span>
      </SettingsHeader>
      <p className="m-0 text-xs text-text-secondary">{t('settings.securityTests.description')}</p>
      <div className="flex flex-col border border-border dark:border-dark-border divide-y divide-border dark:divide-dark-border overflow-hidden">
        {SECURITY_TESTS.sort().map((test) => (
          <Toggle
            key={test}
            className="p-3 text-xs justify-between hover:bg-button-secondary dark:hover:bg-dark-input"
            label={<span className={cn({ 'opacity-50': disabledSecurityTests.includes(test) })}>{test}</span>}
            checked={!disabledSecurityTests.includes(test)}
            onChange={() => dispatch(settingsActions.toggleSecurityTest(test))}
          />
        ))}
      </div>
    </div>
  );
}
