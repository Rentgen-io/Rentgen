import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import {
  ARRAY_LIST_WITHOUT_PAGINATION_TEST_NAME,
  MEDIAN_RESPONSE_TIME_TEST_NAME,
  NETWORK_SHARE_TEST_NAME,
  PING_LATENCY_TEST_NAME,
  RESPONSE_SIZE_CHECK_TEST_NAME,
} from 'shared/testNames';
import Toggle from 'src/components/inputs/Toggle';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectDisabledPerformanceInsights } from 'src/store/selectors';
import { settingsActions } from 'src/store/slices/settingsSlice';
import SettingsHeader from '../SettingsHeader';

export const PERFORMANCE_INSIGHTS: string[] = [
  ARRAY_LIST_WITHOUT_PAGINATION_TEST_NAME,
  MEDIAN_RESPONSE_TIME_TEST_NAME,
  NETWORK_SHARE_TEST_NAME,
  PING_LATENCY_TEST_NAME,
  RESPONSE_SIZE_CHECK_TEST_NAME,
];

export function PerformanceInsightsSettings() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const disabledPerformanceInsights = useAppSelector(selectDisabledPerformanceInsights);

  return (
    <div className="flex flex-col gap-4">
      <SettingsHeader>
        <span>{t('settings.performanceInsights.title')}</span>
        <span className="font-normal text-xs text-text-secondary">
          {t('settings.performanceInsights.enabledCount', {
            enabled: PERFORMANCE_INSIGHTS.length - disabledPerformanceInsights.length,
            total: PERFORMANCE_INSIGHTS.length,
          })}
        </span>
      </SettingsHeader>
      <p className="m-0 text-xs text-text-secondary">{t('settings.performanceInsights.description')}</p>
      <div className="flex flex-col border border-border dark:border-dark-border divide-y divide-border dark:divide-dark-border overflow-hidden">
        {PERFORMANCE_INSIGHTS.sort().map((insight) => (
          <Toggle
            key={insight}
            className="p-3 text-xs justify-between hover:bg-button-secondary dark:hover:bg-dark-input"
            label={
              <span className={cn({ 'opacity-50': disabledPerformanceInsights.includes(insight) })}>{insight}</span>
            }
            checked={!disabledPerformanceInsights.includes(insight)}
            onChange={() => dispatch(settingsActions.togglePerformanceInsight(insight))}
          />
        ))}
      </div>
    </div>
  );
}
