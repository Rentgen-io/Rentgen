import cn from 'classnames';
import { FunctionComponent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { appConfig } from 'shared/constants';
import { getAppVersion, openExternal } from 'src/api/system';
import ResizeHandler from 'src/components/panels/ResizeHandler';
import { useResizableSize } from 'src/hooks/useResizableSize';
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

// Width of the panel next to the icon rail; its natural width (w-75) applies until the user resizes it.
// The minimum keeps the search field and item names usable, the maximum leaves the request area the larger part
const MIN_PANEL_WIDTH = 200;
const MAX_PANEL_WIDTH = 400;

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
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const activeTab = useAppSelector(selectSidebarActiveTab);
  const historyEnabled = useAppSelector(selectHistoryEnabled);

  const [appVersion, setAppVersion] = useState<string>('');

  const { handleProps, size, targetRef } = useResizableSize<HTMLDivElement>({
    dimension: 'width',
    maxSize: MAX_PANEL_WIDTH,
    minSize: MIN_PANEL_WIDTH,
    storageKey: 'sidebarPanelWidth',
  });

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
      className={cn('h-screen sticky top-0 flex bg-surface border-r border-border', {
        'w-20': !activeTab,
      })}
    >
      <div className="w-20 shrink-0 flex flex-col justify-between">
        <div>
          <SidebarButton
            active={activeTab === 'collections'}
            label={t('sidebar.collections')}
            onClick={handleCollectionClick}
          >
            <CollectionIcon className="size-4" />
          </SidebarButton>
          <SidebarButton
            active={activeTab === 'environments'}
            label={t('sidebar.environments')}
            onClick={handleEnvironmentClick}
          >
            <EnvironmentIcon className="size-4" />
          </SidebarButton>
          {historyEnabled && (
            <SidebarButton active={activeTab === 'history'} label={t('sidebar.history')} onClick={handleHistoryClick}>
              <HistoryIcon className="size-4" />
            </SidebarButton>
          )}
        </div>
        <div>
          <SidebarButton label={t('sidebar.settings')} onClick={() => dispatch(modalsActions.openSettingsModal())}>
            <GearIcon className="size-4" />
          </SidebarButton>
          <SidebarButton
            label={t('sidebar.checkForUpdates')}
            onClick={() => openExternal(`${appConfig.origin}/check-for-update.html?current_version=${appVersion}`)}
          >
            <UpgradeStarIcon className="size-4" />
          </SidebarButton>
          <SidebarButton
            label={t('sidebar.reportFeedback')}
            onClick={() => openExternal('https://github.com/Rentgen-io/Rentgen/issues/new')}
          >
            <BugIcon className="size-4" />
          </SidebarButton>
        </div>
      </div>
      <div className="border-l border-border overflow-hidden">
        <div
          ref={targetRef}
          className="max-h-screen h-full w-75 flex flex-col overflow-hidden"
          style={size !== null ? { width: size } : undefined}
        >
          {sidebarPanels.map(({ tab, Component }) => (
            <div
              key={tab}
              className={cn('overflow-hidden', {
                'flex flex-col flex-1': activeTab === tab,
                hidden: activeTab !== tab,
              })}
            >
              <Component />
            </div>
          ))}
        </div>
      </div>
      {activeTab && <ResizeHandler title={t('common.resizeHint')} {...handleProps} />}
    </div>
  );
}
