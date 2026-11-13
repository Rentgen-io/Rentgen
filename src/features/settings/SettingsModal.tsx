import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import { IconButton } from 'src/components/buttons/IconButton';
import Modal from 'src/components/modals/Modal';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectSettingsModal } from 'src/store/selectors';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { SettingsTab } from 'src/types';
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
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const { activeTab, isOpen } = useAppSelector(selectSettingsModal);

  const settingsTabs: { id: SettingsTab; name: string; icon: ReactNode; component: ReactNode }[] = [
    {
      component: (
        <div className="flex flex-col gap-8">
          <MappingSettings />
          <SecurityTestsSettings />
          <PerformanceInsightsSettings />
        </div>
      ),
      icon: <EngineIcon className="size-4" />,
      id: 'testEngine',
      name: t('settings.testEngine'),
    },
    {
      component: <GeneralSettings />,
      icon: <GearIcon className="size-4" />,
      id: 'general',
      name: t('settings.general'),
    },
    {
      component: <AiSettings />,
      icon: <AiIcon className="size-4" />,
      id: 'ai',
      name: t('settings.ai.name'),
    },
    {
      component: (
        <>
          <p className="m-0 text-xs text-muted-foreground">{t('settings.themesDescription')}</p>
          <ThemeSettings />
        </>
      ),
      icon: <ThemeIcon className="size-4" />,
      id: 'themes',
      name: t('settings.themes'),
    },
    {
      component: <LanguageSettings />,
      icon: <LanguageIcon className="size-4" />,
      id: 'language',
      name: t('settings.language'),
    },
    {
      component: <CliSettings />,
      icon: <CliIcon className="size-4" />,
      id: 'cli',
      name: t('settings.cli.name'),
    },
  ];

  const onClose = () => dispatch(modalsActions.closeSettingsModal());

  return (
    <Modal
      className="[&>div]:h-[84vh] [&>div]:max-h-210 [&>div]:w-full! [&>div]:max-w-211.5! [&>div]:p-0! [&>div]:overflow-hidden"
      isOpen={isOpen}
    >
      <IconButton className="absolute top-2.25 right-3" onClick={onClose}>
        <ClearCrossIcon className="size-5" />
      </IconButton>
      <Tabs
        className="h-full flex"
        defaultIndex={Math.max(
          0,
          settingsTabs.findIndex(({ id }) => id === activeTab),
        )}
        selectedTabClassName="bg-background cursor-default!"
        selectedTabPanelClassName="block!"
      >
        <TabList className="min-w-40 flex flex-col m-0 p-0 bg-surface">
          {settingsTabs.map(({ id, name, icon }) => (
            <Tab
              key={id}
              className="flex items-center gap-2 py-3 px-4 text-sm list-none outline-none cursor-pointer hover:bg-background"
            >
              {icon}
              {name}
            </Tab>
          ))}
        </TabList>
        {settingsTabs.map(({ id, name, component }) => (
          <TabPanel key={id} className="flex-auto hidden">
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
