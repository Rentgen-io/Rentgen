import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import { IconButton } from 'src/components/buttons/IconButton';
import Modal from 'src/components/modals/Modal';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectSettingsModal } from 'src/store/selectors';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { AiSettings } from './ai/AiSettings';
import { CliSettings } from './cli/CliSettings';
import { GeneralSettings } from './general/GeneralSettings';
import { LanguageSettings } from './language/LanguageSettings';
import { MappingSettings } from './test-engine/MappingSettings';
import { PerformanceInsightsSettings } from './test-engine/PerformanceInsightsSettings';
import { SecurityTestsSettings } from './test-engine/SecurityTestsSettings';
import { ThemeSettings } from './theme/ThemeSettings';

import AiIcon from 'src/assets/icons/ai-icon.svg';
import ClearCrossIcon from 'src/assets/icons/clear-cross-icon.svg';
import CliIcon from 'src/assets/icons/cli-icon.svg';
import EngineIcon from 'src/assets/icons/engine-icon.svg';
import GearIcon from 'src/assets/icons/gear-icon.svg';
import LanguageIcon from 'src/assets/icons/language-icon.svg';
import ThemeIcon from 'src/assets/icons/theme-icon.svg';

export default function SettingsModal() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const { activeTab, isOpen } = useAppSelector(selectSettingsModal);

  const settingsTabs = [
    {
      name: t('settings.testEngine'),
      icon: <EngineIcon className="h-4 w-4" />,
      component: (
        <div className="flex flex-col gap-8">
          <MappingSettings />
          <SecurityTestsSettings />
          <PerformanceInsightsSettings />
        </div>
      ),
    },
    {
      name: t('settings.general'),
      icon: <GearIcon className="h-4 w-4" />,
      component: <GeneralSettings />,
    },
    {
      name: t('settings.ai.name'),
      icon: <AiIcon className="h-4 w-4" />,
      component: <AiSettings />,
    },
    {
      name: t('settings.themes'),
      icon: <ThemeIcon className="h-4 w-4" />,
      component: (
        <>
          <p className="m-0 text-xs text-text-secondary">{t('settings.themesDescription')}</p>
          <ThemeSettings />
        </>
      ),
    },
    {
      name: t('settings.language'),
      icon: <LanguageIcon className="h-4 w-4" />,
      component: <LanguageSettings />,
    },
    {
      name: t('settings.cli.name'),
      icon: <CliIcon className="h-4 w-4" />,
      component: <CliSettings />,
    },
  ];

  const onClose = () => dispatch(modalsActions.closeSettingsModal());

  return (
    <Modal
      className="[&>div]:h-[84vh] [&>div]:max-h-210 [&>div]:w-full! [&>div]:max-w-211.5! [&>div]:p-0! [&>div]:overflow-hidden"
      isOpen={isOpen}
    >
      <IconButton className="absolute top-2.5 right-3" onClick={onClose}>
        <ClearCrossIcon className="h-5 w-5" />
      </IconButton>
      <Tabs
        className="h-full flex"
        defaultIndex={activeTab}
        forceRenderTabPanel={true}
        selectedTabClassName="bg-white dark:bg-dark-body"
        selectedTabPanelClassName="block!"
      >
        <TabList className="min-w-40 flex flex-col m-0 p-0 bg-button-secondary dark:bg-dark-input">
          {settingsTabs.map(({ name, icon }) => (
            <Tab
              key={name}
              className="flex items-center gap-2 py-3 px-4 text-sm list-none outline-none cursor-pointer hover:bg-white dark:hover:bg-dark-body"
            >
              {icon}
              {name}
            </Tab>
          ))}
        </TabList>
        {settingsTabs.map(({ name, component }) => (
          <TabPanel key={name} className="flex-auto hidden">
            <div className="h-full flex flex-col">
              <h4 className="m-0 p-4">{name}</h4>
              <div className="h-full flex flex-col gap-4 p-4 pt-0 overflow-y-auto">{component}</div>
            </div>
          </TabPanel>
        ))}
      </Tabs>
    </Modal>
  );
}
