import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { openExternal } from 'src/api/system';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectLanguage } from 'src/store/selectors';
import { settingsActions } from 'src/store/slices/settingsSlice';
import { Language, LANGUAGES } from 'src/types';

export function LanguageSettings() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const language = useAppSelector(selectLanguage);

  const onLanguageChange = (value: Language) => {
    if (value === language) return;
    dispatch(settingsActions.setLanguage(value));
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-xs text-muted-foreground">{t('settings.languageSection.description')}</p>
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        {LANGUAGES.map(({ label, code }) => (
          <label key={code} className={cn('flex items-center gap-2 py-2 cursor-pointer')}>
            <input
              className="m-0"
              type="radio"
              name="language"
              value={code}
              checked={code === language}
              onChange={() => onLanguageChange(code)}
            />
            <span className="text-xs">{label}</span>
          </label>
        ))}
      </div>
      <p className="m-0 text-xs text-muted-foreground">
        {t('settings.languageSection.feedback')}{' '}
        <span
          className="text-blue-500 hover:underline cursor-pointer"
          onClick={() => openExternal('https://github.com/Rentgen-io/Rentgen/issues/new')}
        >
          {t('settings.languageSection.feedbackLink')}
        </span>
      </p>
    </div>
  );
}
