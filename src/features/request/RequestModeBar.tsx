import { useTranslation } from 'react-i18next';
import ActionsButton from 'src/components/buttons/ActionsButton';
import { IconButton } from 'src/components/buttons/IconButton';
import Select, { SelectOption } from 'src/components/inputs/Select';
import { useReset } from 'src/hooks/useReset';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectEnvironments, selectMode, selectSelectedEnvironmentId } from 'src/store/selectors';
import { environmentActions } from 'src/store/slices/environmentSlice';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { Mode, requestActions } from 'src/store/slices/requestSlice';
import { settingsActions } from 'src/store/slices/settingsSlice';
import EnvironmentSelector from '../environment/EnvironmentSelector';

import DarkModeIcon from 'src/assets/icons/dark-mode-icon.svg';
import LightModeIcon from 'src/assets/icons/light-mode-icon.svg';
import ReloadIcon from 'src/assets/icons/reload-icon.svg';

const modeOptions: SelectOption<Mode>[] = [
  { value: 'HTTP', label: 'HTTP' },
  { value: 'WSS', label: 'WSS' },
];

export default function RequestModeBar() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const mode = useAppSelector(selectMode);
  const environments = useAppSelector(selectEnvironments);
  const selectedEnvironmentId = useAppSelector(selectSelectedEnvironmentId);

  const reset = useReset();

  return (
    <div className="flex flex-col @lg:flex-row @lg:items-center gap-4 @lg:gap-2">
      <div className="flex flex-col @lg:flex-row @lg:items-center gap-2">
        <Select
          className="font-bold"
          isSearchable={false}
          options={modeOptions}
          placeholder={t('request.modePlaceholder')}
          value={modeOptions.find((option) => option.value === mode)}
          onChange={(option) => {
            if (option) dispatch(requestActions.setMode(option.value));
            reset();
          }}
        />
        {mode === 'HTTP' && (
          <>
            <ActionsButton
              actions={[{ label: t('common.create'), onClick: reset }]}
              onClick={() => dispatch(modalsActions.openImportResourceModal())}
            >
              {t('common.import')}
            </ActionsButton>
          </>
        )}
      </div>
      <div className="flex-auto flex items-center justify-end gap-2">
        <EnvironmentSelector
          className="flex-auto @lg:flex-none"
          environments={environments}
          selectedEnvironmentId={selectedEnvironmentId}
          onSelect={(id) => dispatch(environmentActions.selectEnvironment(id))}
        />
        <IconButton onClick={() => dispatch(settingsActions.toggleTheme())}>
          <DarkModeIcon className="h-4 w-4 dark:hidden" />
          <LightModeIcon className="hidden dark:block h-4 w-4" />
        </IconButton>
        <IconButton onClick={() => dispatch(modalsActions.openReloadModal())}>
          <ReloadIcon className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  );
}
