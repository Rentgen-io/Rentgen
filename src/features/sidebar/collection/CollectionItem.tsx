import { Method } from 'axios';
import cn from 'classnames';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MethodBadge from 'src/components/badges/MethodBadge';
import SearchHighlighter from 'src/components/highlighters/SearchHighlighter';
import { useContextMenu } from 'src/features/context-menu';
import { useReset } from 'src/hooks/useReset';
import { store } from 'src/store';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectAllEvaluationReports,
  selectAllTestResults,
  selectCollectionData,
  selectCollectionRunResults,
  selectIsComparingTestResults,
  selectRunningFolderId,
  selectRunningRequestIds,
  selectSelectedRequestId,
} from 'src/store/selectors';
import { collectionActions } from 'src/store/slices/collectionSlice';
import { preEvaluationActions } from 'src/store/slices/preEvaluationSlice';
import { requestActions } from 'src/store/slices/requestSlice';
import { responseActions } from 'src/store/slices/responseSlice';
import { testsActions } from 'src/store/slices/testsSlice';
import { CollectionItemData, findFolderIdByRequestId, findRequestById } from 'src/utils/collection';
import { isAbortedResponse } from 'src/utils/http';
import RowActionsMenu from './RowActionsMenu';
import { DropIndicator, getIndent, useTreeNodeDnd } from './treeDnd';
import { useCollectionRunner } from './useCollectionRunner';

import PlayIcon from 'src/assets/icons/play-icon.svg';
import StopIcon from 'src/assets/icons/stop-icon.svg';

interface Props {
  /** Nesting level: 1 for a request directly in a top-level folder. */
  depth: number;
  item: CollectionItemData;
  searchTerm?: string;
}

/**
 * A request in the sidebar. Subscribes only to what this row shows (its own selection / run state), and data only
 * needed when it's clicked is read from the store then: a change of another request doesn't re-render it (memo).
 */
function CollectionItem({ depth, item, searchTerm }: Props) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { cancelRequestRun, runRequest } = useCollectionRunner();
  const { isOpen } = useContextMenu();
  const reset = useReset();

  const isAnyFolderRunning = useAppSelector((state) => selectRunningFolderId(state) !== null);
  const isRequestRunning = useAppSelector((state) => selectRunningRequestIds(state).includes(item.id));
  const isSelected = useAppSelector((state) => selectSelectedRequestId(state) === item.id);
  const runResult = useAppSelector((state) => selectCollectionRunResults(state)[item.id] ?? null);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingName, setEditingName] = useState<string>(item.name);

  const indent = getIndent(depth);
  // Not draggable while searching: the list then shows only the matches, so drop positions would be misleading
  const { attributes, dropPosition, isDragging, listeners, setNodeRef } = useTreeNodeDnd(
    item.id,
    { type: 'request', name: item.name, method: item.method },
    Boolean(searchTerm),
  );

  useEffect(() => setEditingName(item.name), [isEditing, item.name]);

  const handleClick = () => {
    if (isDragging) return;

    // Read before the reset below, like the values of the previous render were
    const state = store.getState();
    const collection = selectCollectionData(state);
    const folderId = findFolderIdByRequestId(collection, item.id);
    const isComparingTestResults = selectIsComparingTestResults(state);

    if (isSelected) {
      if (folderId) dispatch(collectionActions.selectFolder(folderId));
      if (isComparingTestResults) dispatch(testsActions.clearResultsToCompare());

      return;
    }

    const savedRequest = findRequestById(collection, item.id);
    if (!savedRequest) return;

    const evaluationReport = selectAllEvaluationReports(state)[item.id];
    const requestTestResults = selectAllTestResults(state)[item.id];

    reset(false);
    dispatch(collectionActions.selectRequest(item.id));
    if (folderId) dispatch(collectionActions.selectFolder(folderId));

    if (runResult?.response) {
      dispatch(responseActions.setResponse(runResult.response));
      dispatch(requestActions.setBodyParameters(runResult.bodyParameters || {}));
      dispatch(requestActions.setQueryParameters(runResult.queryParameters || {}));
    }

    if (requestTestResults) {
      dispatch(testsActions.setCount(requestTestResults.count));
      dispatch(testsActions.setTimestamp(requestTestResults.timestamp));
      dispatch(
        testsActions.setAiTests({
          overview: requestTestResults.aiOverview ?? null,
          results: requestTestResults.aiTests ?? [],
          usage: requestTestResults.aiUsage ?? null,
        }),
      );
      dispatch(testsActions.setCrudTests(requestTestResults.crudTests));
      dispatch(testsActions.setDataDrivenTests(requestTestResults.dataDrivenTests));
      dispatch(testsActions.setPerformanceTests(requestTestResults.performanceTests));
      dispatch(testsActions.setSecurityTests(requestTestResults.securityTests));
      dispatch(testsActions.setOptions(requestTestResults.testOptions));
    }

    const { request } = savedRequest;

    dispatch(
      requestActions.setMode(request.url.startsWith('ws://') || request.url.startsWith('wss://') ? 'WSS' : 'HTTP'),
    );
    dispatch(requestActions.setMethod(request.method as Method));
    dispatch(requestActions.setUrl(request.url));
    dispatch(requestActions.setHeaders(request.header));
    dispatch(requestActions.setBody(request.body ?? {}));

    if (savedRequest.preEvaluation) dispatch(preEvaluationActions.setPreEvaluation(savedRequest.preEvaluation));
    if (evaluationReport) dispatch(preEvaluationActions.setEvaluationReport(evaluationReport));
    if (isComparingTestResults) dispatch(testsActions.clearResultsToCompare());
  };

  const toggleRun = () => {
    if (isRequestRunning) cancelRequestRun(item.id);
    else runRequest(item.id);
  };

  const handlePlayClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    toggleRun();
  };

  const onSaveEdit = () => {
    if (editingName.trim() && editingName !== item.name)
      dispatch(collectionActions.renameRequest({ requestId: item.id, newName: editingName.trim() }));

    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={{ paddingLeft: indent }}
      className={cn(
        'relative h-6 flex items-center gap-2 py-1 pr-2 rounded',
        'hover:bg-muted has-aria-expanded:bg-muted box-border group cursor-pointer outline-none',
        {
          'bg-muted': isSelected,
          'opacity-50': isDragging,
        },
      )}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      {runResult &&
        (isAbortedResponse(runResult.response) ? (
          <span className="size-1.75 rounded-full shrink-0 bg-muted-foreground" title={runResult.response?.status} />
        ) : (
          <span
            title={runResult.warning || undefined}
            className={cn('size-1.75 rounded-full shrink-0', {
              'bg-metric-warning':
                runResult.warning && runResult.status && runResult.status >= 200 && runResult.status < 400,
              'bg-metric-pass':
                !runResult.warning && runResult.status && runResult.status >= 200 && runResult.status < 400,
              'bg-primary': runResult.status && runResult.status >= 400 && runResult.status < 500,
              'bg-metric-fail': !runResult.status || runResult.status < 200 || runResult.status >= 500,
            })}
          />
        ))}
      <MethodBadge method={item.method} />
      {isEditing && (
        <input
          autoFocus
          className="flex-1 py-px px-1 text-xs leading-none bg-transparent text-foreground border border-blue-300 outline-none"
          value={editingName}
          type="text"
          onBlur={() => !isOpen && onSaveEdit()}
          onChange={(event) => setEditingName(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onFocus={(event) => event.target.select()}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Enter') onSaveEdit();
            else if (event.key === 'Escape') setIsEditing(false);
          }}
          onPointerDown={(event) => event.stopPropagation()}
        />
      )}
      {!isEditing && (
        <>
          <span className={cn('flex-1 text-xs truncate', { 'opacity-75': item.muted })} title={item.name}>
            {searchTerm ? <SearchHighlighter text={item.name} term={searchTerm} /> : item.name}
          </span>
          <div
            className={cn(
              'absolute top-0 bottom-0 right-0 px-2 flex items-center gap-1 rounded bg-muted',
              'opacity-0 group-hover:opacity-100 has-focus-visible:opacity-100 has-aria-expanded:opacity-100',
            )}
          >
            {!isAnyFolderRunning &&
              (isRequestRunning ? (
                <StopIcon
                  className="size-4 text-red-500 hover:text-red-600 cursor-pointer"
                  title={t('common.stop')}
                  onClick={handlePlayClick}
                />
              ) : (
                <PlayIcon
                  className="size-4 text-green-500 hover:text-green-600 cursor-pointer"
                  title={t('common.run')}
                  onClick={handlePlayClick}
                />
              ))}
            <RowActionsMenu
              actions={[
                {
                  label: isRequestRunning ? t('common.stop') : t('common.run'),
                  disabled: isAnyFolderRunning,
                  onClick: toggleRun,
                },
                {
                  label: item.muted ? t('common.unmute') : t('common.mute'),
                  onClick: () =>
                    dispatch(collectionActions.setRequestMuted({ requestId: item.id, muted: !item.muted })),
                },
                { label: t('common.rename'), divider: true, onClick: () => setIsEditing(true) },
                {
                  label: t('common.delete'),
                  destructive: true,
                  onClick: () => dispatch(collectionActions.removeRequest(item.id)),
                },
              ]}
            />
          </div>
        </>
      )}
      <DropIndicator position={dropPosition} />
    </div>
  );
}

// Re-renders only when its props change: unchanged requests keep their sidebar object (collectionToGroupedSidebarData)
export default memo(CollectionItem);
