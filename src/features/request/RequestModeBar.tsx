import { useTranslation } from 'react-i18next';
import ActionsButton from 'src/components/buttons/ActionsButton';
import Button, { ButtonType } from 'src/components/buttons/Button';
import { IconButton } from 'src/components/buttons/IconButton';
import Select, { SelectOption } from 'src/components/inputs/Select';
import Textarea from 'src/components/inputs/Textarea';
import Modal from 'src/components/modals/Modal';
import { useCurlImport } from 'src/hooks/useCurlImport';
import { useReset } from 'src/hooks/useReset';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectCurl,
  selectCurlError,
  selectEnvironments,
  selectMode,
  selectOpenCurlModal,
  selectSelectedEnvironmentId,
} from 'src/store/selectors';
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
  const reset = useReset();
  const importCurl = useCurlImport();

  const mode = useAppSelector(selectMode);
  const curl = useAppSelector(selectCurl);
  const curlError = useAppSelector(selectCurlError);
  const openCurlModal = useAppSelector(selectOpenCurlModal);
  const environments = useAppSelector(selectEnvironments);
  const selectedEnvironmentId = useAppSelector(selectSelectedEnvironmentId);

  return (
    <div className="flex flex-col @lg:flex-row @lg:items-center gap-4 @lg:gap-2">
      <div className="flex flex-col @lg:flex-row @lg:items-center gap-2">
        <Select
          className="font-bold"
          isSearchable={false}
          options={modeOptions}
          placeholder={t('request.modePlaceholder')}
          value={modeOptions.find((option) => option.value == mode)}
          onChange={(option) => {
            dispatch(requestActions.setMode((option as SelectOption<Mode>).value));
            reset();
          }}
        />
        {mode === 'HTTP' && (
          <>
            <ActionsButton
              actions={[{ label: t('common.create'), onClick: reset }]}
              className="[&>*:first-child]:w-full @lg:[&>*:first-child]:w-auto"
              onClick={() => dispatch(modalsActions.openCurlModal())}
            >
              {t('curl.importCurl')}
            </ActionsButton>
            <Modal isOpen={openCurlModal} onClose={() => dispatch(modalsActions.closeCurlModal())}>
              <div className="flex flex-col gap-4">
                <h4 className="m-0">{t('curl.importCurl')}</h4>
                <Textarea
                  autoFocus={true}
                  className="min-h-40"
                  placeholder={t('curl.importCurlPlaceholder')}
                  value={curl}
                  onChange={(event) => dispatch(modalsActions.setCurl(event.target.value))}
                />
                {curlError && <p className="m-0 text-xs text-red-500">{curlError}</p>}
                <div className="flex items-center justify-end gap-4">
                  <Button onClick={importCurl}>{t('common.import')}</Button>
                  <Button buttonType={ButtonType.SECONDARY} onClick={() => dispatch(modalsActions.closeCurlModal())}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            </Modal>
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
