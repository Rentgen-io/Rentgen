import { useTranslation } from 'react-i18next';
import { appConfig } from 'shared/constants';
import Input from 'src/components/inputs/Input';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectTestEngineConfiguration } from 'src/store/selectors';
import { settingsActions } from 'src/store/slices/settingsSlice';
import { clamp } from 'src/utils';
import SettingsHeader from '../SettingsHeader';

export function MappingSettings() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const {
    randomEmail,
    randomInt,
    randomString,
    email,
    enum: enumConfiguration,
    number,
    string,
  } = useAppSelector(selectTestEngineConfiguration);

  return (
    <div className="flex flex-col gap-4">
      <SettingsHeader>{t('settings.configuration.title')}</SettingsHeader>
      <p className="m-0 text-xs text-text-secondary">{t('settings.configuration.description')}</p>
      <div className="flex flex-col border border-border dark:border-dark-border divide-y divide-border dark:divide-dark-border overflow-hidden">
        <div className="flex flex-col gap-2 py-1.75 px-3 text-xs">
          <label className="m-0 font-bold">{t('settings.configuration.email')}</label>
          <div className="flex items-center justify-between">
            <span>{t('settings.configuration.domain')}</span>
            <Input
              className="w-32 py-1.5"
              value={email.domain}
              onBlur={() => {
                if (/^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(email.domain)) return;
                dispatch(settingsActions.setEmailDomain(appConfig.domain));
              }}
              onChange={(event) => dispatch(settingsActions.setEmailDomain(event.target.value))}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>{t('settings.configuration.randomEmailLength')}</span>
            <Input
              className="w-32 py-1.5"
              type="number"
              value={randomEmail.length ?? ''}
              onBlur={() => {
                if (randomEmail.length) return;
                dispatch(settingsActions.setRandomEmailLength(1));
              }}
              onChange={(event) => {
                const value = clamp(parseInt(event.target.value), 1, 256);
                dispatch(settingsActions.setRandomEmailLength(value));
              }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 py-1.75 px-3 text-xs">
          <label className="m-0 font-bold">{t('settings.configuration.enum')}</label>
          <div className="flex items-center justify-between">
            <span>{t('settings.configuration.enumDescription')}</span>
            <Input
              className="w-32 py-1.5"
              value={enumConfiguration}
              onChange={(event) => dispatch(settingsActions.setEnum(event.target.value))}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 py-1.75 px-3 text-xs">
          <label className="m-0 font-bold">{t('settings.configuration.number')}</label>
          <div className="flex items-center justify-between">
            <span>{t('settings.configuration.minimumValue')}</span>
            <Input
              type="number"
              className="w-32 py-1.5"
              value={number.min ?? ''}
              onBlur={() => dispatch(settingsActions.setNumberMin(Math.min(number.min || -10000, number.max)))}
              onChange={(event) => {
                const value = clamp(parseInt(event.target.value), -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
                dispatch(settingsActions.setNumberMin(value));
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>{t('settings.configuration.maximumValue')}</span>
            <Input
              type="number"
              className="w-32 py-1.5"
              value={number.max ?? ''}
              onBlur={() => dispatch(settingsActions.setNumberMax(Math.max(number.min, number.max || 10000)))}
              onChange={(event) => {
                const value = clamp(parseInt(event.target.value), -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
                dispatch(settingsActions.setNumberMax(value));
              }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 py-1.75 px-3 text-xs">
          <label className="m-0 font-bold">{t('settings.configuration.string')}</label>
          <div className="flex items-center justify-between">
            <span>{t('settings.configuration.minimumValueLength')}</span>
            <Input
              type="number"
              className="w-32 py-1.5"
              value={string.minLength ?? ''}
              onBlur={() =>
                dispatch(settingsActions.setStringMinLength(Math.min(string.minLength || 1, string.maxLength)))
              }
              onChange={(event) => {
                const value = clamp(parseInt(event.target.value), 1, 1000000);
                dispatch(settingsActions.setStringMinLength(value));
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>{t('settings.configuration.maximumValueLength')}</span>
            <Input
              type="number"
              className="w-32 py-1.5"
              value={string.maxLength ?? ''}
              onBlur={() =>
                dispatch(settingsActions.setStringMaxLength(Math.max(string.minLength, string.maxLength || 1000000)))
              }
              onChange={(event) => {
                const value = clamp(parseInt(event.target.value), 1, 1000000);
                dispatch(settingsActions.setStringMaxLength(value));
              }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 py-1.75 px-3 text-xs">
          <label className="m-0 font-bold">{t('settings.configuration.randomInteger')}</label>
          <div className="flex items-center justify-between">
            <span>{t('settings.configuration.minimumValue')}</span>
            <Input
              type="number"
              className="w-32 py-1.5"
              value={randomInt.min ?? ''}
              onBlur={() =>
                dispatch(settingsActions.setRandomIntMin(randomInt.min ? Math.min(randomInt.min, randomInt.max) : 0))
              }
              onChange={(event) => {
                const value = clamp(parseInt(event.target.value), 0, Number.MAX_SAFE_INTEGER);
                dispatch(settingsActions.setRandomIntMin(value));
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>{t('settings.configuration.maximumValue')}</span>
            <Input
              type="number"
              className="w-32 py-1.5"
              value={randomInt.max ?? ''}
              onBlur={() =>
                dispatch(
                  settingsActions.setRandomIntMax(
                    randomInt.max ? Math.max(randomInt.max, randomInt.min) : Number.MAX_SAFE_INTEGER,
                  ),
                )
              }
              onChange={(event) => {
                const value = clamp(parseInt(event.target.value), 0, Number.MAX_SAFE_INTEGER);
                dispatch(settingsActions.setRandomIntMax(value));
              }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 py-1.75 px-3 text-xs">
          <label className="m-0 font-bold">{t('settings.configuration.randomString')}</label>
          <div className="flex items-center justify-between">
            <span>{t('settings.configuration.length')}</span>
            <Input
              type="number"
              className="w-32 py-1.5"
              value={randomString.length ?? ''}
              onBlur={() => {
                if (randomString.length) return;
                dispatch(settingsActions.setRandomStringLength(1));
              }}
              onChange={(event) => {
                const value = clamp(parseInt(event.target.value), 1, 4096);
                dispatch(settingsActions.setRandomStringLength(value));
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
