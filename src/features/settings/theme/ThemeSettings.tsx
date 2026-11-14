import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectTheme } from 'src/store/selectors';
import { settingsActions } from 'src/store/slices/settingsSlice';

import DarkImage from 'src/assets/images/dark-theme.svg';
import LightTheme from 'src/assets/images/light-theme.svg';

export function ThemeSettings() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const theme = useAppSelector(selectTheme);

  const themes = [
    { label: t('settings.themeLight'), value: 'light' as const, Image: LightTheme },
    { label: t('settings.themeDark'), value: 'dark' as const, Image: DarkImage },
  ];

  const onThemeChange = (value: 'light' | 'dark') => {
    if (value === theme) return;

    dispatch(settingsActions.setTheme(value));
  };

  return (
    <div className="flex gap-2">
      {themes.map(({ Image, label, value }) => (
        <label key={value} className="flex-1 flex flex-col gap-2 cursor-pointer">
          <Image
            className={cn('p-0.5 border-2 rounded', {
              'border-primary': value === theme,
              'border-transparent': value !== theme,
            })}
          />
          <span className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              className="m-0"
              type="radio"
              name="theme"
              value={value}
              checked={value === theme}
              onChange={() => onThemeChange(value)}
            />
            {label}
          </span>
        </label>
      ))}
    </div>
  );
}
