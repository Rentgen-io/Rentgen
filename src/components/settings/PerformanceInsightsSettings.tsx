import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectDisabledPerformanceInsights } from '../../store/selectors';
import { settingsActions } from '../../store/slices/settingsSlice';
import {
  ARRAY_LIST_WITHOUT_PAGINATION_TEST_NAME,
  MEDIAN_RESPONSE_TIME_TEST_NAME,
  NETWORK_SHARE_TEST_NAME,
  PING_LATENCY_TEST_NAME,
  RESPONSE_SIZE_CHECK_TEST_NAME,
} from '../../tests';
import Toggle from '../inputs/Toggle';

export const PERFORMANCE_INSIGHTS: string[] = [
  ARRAY_LIST_WITHOUT_PAGINATION_TEST_NAME,
  MEDIAN_RESPONSE_TIME_TEST_NAME,
  NETWORK_SHARE_TEST_NAME,
  PING_LATENCY_TEST_NAME,
  RESPONSE_SIZE_CHECK_TEST_NAME,
];

export function PerformanceInsightsSettings() {
  const dispatch = useAppDispatch();
  const disabledPerformanceInsights = useAppSelector(selectDisabledPerformanceInsights);
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <h5 className="flex items-center justify-between gap-4 m-0 pb-1.5 border-b border-b-border dark:border-b-dark-border">
        <span>{t('settings.performanceInsights.title')}</span>
        <span className="font-normal text-xs text-text-secondary">
          {t('settings.performanceInsights.enabledCount', {
            enabled: PERFORMANCE_INSIGHTS.length - disabledPerformanceInsights.length,
            total: PERFORMANCE_INSIGHTS.length,
          })}
        </span>
      </h5>
      <p className="m-0 text-xs text-text-secondary">{t('settings.performanceInsights.description')}</p>
      <div className="flex flex-col border border-border dark:border-dark-border rounded-md divide-y divide-border dark:divide-dark-border overflow-hidden">
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
