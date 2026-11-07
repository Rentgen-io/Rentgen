import { t } from 'i18next';
import MethodBadge from 'src/components/badges/MethodBadge';
import { useAppSelector } from 'src/store/hooks';
import { selectMethod, selectMode, selectSelectedRequestWithFolder } from 'src/store/selectors';

export default function RequestDetails() {
  const method = useAppSelector(selectMethod);
  const mode = useAppSelector(selectMode);
  const selectedRequest = useAppSelector(selectSelectedRequestWithFolder);

  return (
    <div className="flex items-center gap-2 py-3 px-4 text-xs bg-surface">
      <MethodBadge method={mode === 'HTTP' ? method : mode} />
      <span className="flex-auto truncate">{selectedRequest?.request.name || t('request.untitledRequest')}</span>
      {selectedRequest && (
        <span className="hidden @lg:block text-xs text-muted-foreground whitespace-nowrap">
          {selectedRequest.folder.name}
        </span>
      )}
    </div>
  );
}
