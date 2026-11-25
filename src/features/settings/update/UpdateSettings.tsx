import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { appConfig } from 'shared/constants';
import { openExternal } from 'src/api/system';
import { checkForUpdate } from 'src/api/update';
import Button, { ButtonSize } from 'src/components/buttons/Button';
import LoaderWithText from 'src/components/loaders/LoaderWithText';
import { UpdateCheckResult } from 'src/types/update';

export function UpdateSettings() {
  const { t } = useTranslation();

  const [result, setResult] = useState<UpdateCheckResult | null>(null);

  const handleCheck = useCallback(async () => {
    setResult(null);
    setResult(await checkForUpdate());
  }, []);

  useEffect(() => {
    handleCheck();
  }, [handleCheck]);

  if (!result) {
    return (
      <LoaderWithText
        className="flex-col text-xs [&_.loader]:size-4 [&_.loader]:shrink-0 [&_.loader>span]:border-2!"
        text={t('settings.update.checking')}
      />
    );
  }

  const getStatusText = (): { title: string; description: string } => {
    if (result.status === 'error') {
      return {
        title: t('settings.update.checkFailed'),
        description: t('settings.update.currentVersion', { version: result.currentVersion }),
      };
    }

    if (result.status === 'updateAvailable') {
      return {
        title: t('settings.update.updateAvailable'),
        description: t('settings.update.newVersionAvailable', {
          current: result.currentVersion,
          latest: result.latestVersion,
        }),
      };
    }

    return {
      title: t('settings.update.upToDate'),
      description: t('settings.update.latestVersion', { version: result.latestVersion }),
    };
  };

  const renderStatus = () => {
    const { title, description } = getStatusText();

    return (
      <>
        <span className="text-xs">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </>
    );
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-col gap-1">
        {renderStatus()}
        <span className="text-xs text-muted-foreground">
          {t('settings.update.lastChecked', { date: new Date(result.checkedAt) })}
        </span>
      </div>
      {result.status === 'updateAvailable' ? (
        <Button
          buttonSize={ButtonSize.SMALL}
          onClick={() =>
            openExternal(`${appConfig.origin}/check-for-update.html?current_version=${result.currentVersion}`)
          }
        >
          {t('settings.update.download')}
        </Button>
      ) : (
        <Button buttonSize={ButtonSize.SMALL} onClick={handleCheck}>
          {t('settings.update.check')}
        </Button>
      )}
    </div>
  );
}
