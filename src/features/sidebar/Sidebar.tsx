import cn from 'classnames';
import { FunctionComponent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { appConfig } from 'shared/constants';
import { getAppVersion, openExternal } from 'src/api/system';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectHistoryEnabled, selectSidebarActiveTab } from 'src/store/selectors';
import { environmentActions } from 'src/store/slices/environmentSlice';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { uiActions } from 'src/store/slices/uiSlice';
import { SidebarTab } from 'src/types';
import CollectionsPanel from './collection/CollectionsPanel';
import EnvironmentPanel from './environment/EnvironmentPanel';
import HistoryPanel from './history/HistoryPanel';
import SidebarButton from './SidebarButton';

import BugIcon from 'src/assets/icons/bug-icon.svg';
import CollectionIcon from 'src/assets/icons/collection-icon.svg';
import EnvironmentIcon from 'src/assets/icons/environment-icon.svg';
import GearIcon from 'src/assets/icons/gear-icon.svg';
import HistoryIcon from 'src/assets/icons/history-icon.svg';
import UpgradeStarIcon from 'src/assets/icons/upgrade-star-icon.svg';

interface SidebarPanel {
  tab: SidebarTab;
  Component: FunctionComponent;
}

const sidebarPanels: SidebarPanel[] = [
  { tab: 'collections', Component: CollectionsPanel },
  { tab: 'environments', Component: EnvironmentPanel },
  { tab: 'history', Component: HistoryPanel },
] as const;

export default function Sidebar() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const activeTab = useAppSelector(selectSidebarActiveTab);
  const historyEnabled = useAppSelector(selectHistoryEnabled);

  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    if (!historyEnabled && activeTab === 'history') dispatch(uiActions.toggleSidebarTab('history'));
  }, [historyEnabled, activeTab, dispatch]);

  useEffect(() => {
    const fetchAppVersion = async () => setAppVersion(await getAppVersion());
    fetchAppVersion();
  }, []);

  const handleCollectionClick = () => {
    dispatch(uiActions.toggleSidebarTab('collections'));
    dispatch(environmentActions.stopEditing());
  };

  const handleEnvironmentClick = () => dispatch(uiActions.toggleSidebarTab('environments'));

  const handleHistoryClick = () => {
    dispatch(uiActions.toggleSidebarTab('history'));
    dispatch(environmentActions.stopEditing());
  };

  return (
    <div
      className={cn(
        'h-screen sticky top-0 flex border-r border-border dark:border-dark-border bg-body dark:bg-dark-body',
        { 'w-20': !activeTab, 'w-100': activeTab },
      )}
    >
      <div className="w-20 shrink-0 flex flex-col justify-between">
        <div>
          <SidebarButton
            label={t('sidebar.collections')}
            className={activeTab === 'collections' ? 'bg-button-secondary dark:bg-dark-input' : ''}
            onClick={handleCollectionClick}
          >
            <CollectionIcon className="h-4 w-4" />
          </SidebarButton>
          <SidebarButton
            label={t('sidebar.environments')}
            className={activeTab === 'environments' ? 'bg-button-secondary dark:bg-dark-input' : ''}
            onClick={handleEnvironmentClick}
          >
            <EnvironmentIcon className="h-4 w-4" />
          </SidebarButton>
          {historyEnabled && (
            <SidebarButton
              label={t('sidebar.history')}
              className={activeTab === 'history' ? 'bg-button-secondary dark:bg-dark-input' : ''}
              onClick={handleHistoryClick}
            >
              <HistoryIcon className="h-4 w-4" />
            </SidebarButton>
          )}
        </div>
        <div>
          <SidebarButton label={t('sidebar.settings')} onClick={() => dispatch(modalsActions.openSettingsModal())}>
            <GearIcon className="h-4 w-4" />
          </SidebarButton>
          <SidebarButton
            label={t('sidebar.checkForUpdates')}
            onClick={() => openExternal(`${appConfig.origin}/check-for-update.html?current_version=${appVersion}`)}
          >
            <UpgradeStarIcon className="h-4 w-4" />
          </SidebarButton>
          <SidebarButton
            label={t('sidebar.reportFeedback')}
            onClick={() => openExternal('https://github.com/Rentgen-io/Rentgen/issues/new')}
          >
            <BugIcon className="h-4 w-4" />
          </SidebarButton>
        </div>
      </div>
      <div className="border-l border-border dark:border-dark-border overflow-hidden bg-body dark:bg-dark-body">
        <div className="max-h-screen h-full w-80 flex flex-col overflow-hidden">
          {sidebarPanels.map(({ tab, Component }) => (
            <div key={tab} className={cn('overflow-hidden', activeTab === tab ? 'flex flex-col flex-1' : 'hidden')}>
              <Component />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
