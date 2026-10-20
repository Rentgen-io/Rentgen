import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Method } from 'axios';
import cn from 'classnames';
import { useCallback, useEffect, useState } from 'react';
import MethodBadge from 'src/components/badges/MethodBadge';
import SearchHighlighter from 'src/components/highlighters/SearchHighlighter';
import { useContextMenu } from 'src/features/context-menu';
import { useCollectionRunner } from 'src/hooks/useCollectionRunner';
import { useReset } from 'src/hooks/useReset';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectCollectionData,
  selectCollectionRunResults,
  selectIsComparingTestResults,
  selectIsRequestRunning,
  selectRequestTestResults,
  selectRunningFolderId,
  selectSelectedRequestId,
} from 'src/store/selectors';
import { collectionActions } from 'src/store/slices/collectionSlice';
import { requestActions } from 'src/store/slices/requestSlice';
import { responseActions } from 'src/store/slices/responseSlice';
import { testsActions } from 'src/store/slices/testsSlice';
import {
  CollectionItemData,
  findFolderIdByRequestId,
  findRequestById,
  headersRecordToString,
  postmanHeadersToRecord,
} from 'src/utils';

import EditIcon from 'src/assets/icons/edit-icon.svg';
import PlayIcon from 'src/assets/icons/play-icon.svg';
import StopIcon from 'src/assets/icons/stop-icon.svg';
import TrashIcon from 'src/assets/icons/trash-icon.svg';

interface Props {
  item: CollectionItemData;
  searchTerm?: string;
}

export default function CollectionItem({ item, searchTerm }: Props) {
  const dispatch = useAppDispatch();
  const { cancelRequestRun, runRequest } = useCollectionRunner();
  const { isOpen } = useContextMenu();
  const reset = useReset();

  const collection = useAppSelector(selectCollectionData);
  const isComparingTestResults = useAppSelector(selectIsComparingTestResults);
  const isRequestRunning = useAppSelector(selectIsRequestRunning(item.id));
  const requestTestResults = useAppSelector(selectRequestTestResults(item.id));
  const runningFolderId = useAppSelector(selectRunningFolderId);
  const runResults = useAppSelector(selectCollectionRunResults);
  const selectedRequestId = useAppSelector(selectSelectedRequestId);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingName, setEditingName] = useState<string>(item.name);

  const runResult = runResults[item.id] || null;
  const isSelected = item.id === selectedRequestId;
  const { attributes, isDragging, listeners, transform, transition, setNodeRef } = useSortable({
    id: item.id,
    data: { type: 'item', folderId: item.folderId },
  });

  useEffect(() => setEditingName(item.name), [isEditing, item.name]);

  const handleClick = useCallback(
    (id: string) => {
      if (isDragging) return;
      if (isSelected && isComparingTestResults) dispatch(testsActions.clearResultsToCompare());
      if (isSelected) return;

      const item = findRequestById(collection, id);
      if (!item) return;

      reset(false);
      dispatch(collectionActions.selectRequest(id));

      const folderId = findFolderIdByRequestId(collection, id);
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

      const { request } = item;
      const isWssUrl = request.url.startsWith('ws://') || request.url.startsWith('wss://');

      dispatch(requestActions.setMode(isWssUrl ? 'WSS' : 'HTTP'));
      dispatch(requestActions.setMethod(request.method as Method));
      dispatch(requestActions.setUrl(request.url));
      dispatch(requestActions.setHeaders(headersRecordToString(postmanHeadersToRecord(request.header))));
      dispatch(requestActions.setBody(request.body?.raw || ''));

      if (isComparingTestResults) dispatch(testsActions.clearResultsToCompare());
    },
    [collection, isComparingTestResults, isDragging, isSelected, requestTestResults, runResult, dispatch, reset],
  );

  const handlePlayClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    if (isRequestRunning) cancelRequestRun(item.id);
    else runRequest(item.id);
  };

  const onSaveEdit = useCallback(() => {
    if (editingName.trim() && editingName !== item.name)
      dispatch(collectionActions.renameRequest({ requestId: item.id, newName: editingName.trim() }));

    setIsEditing(false);
  }, [editingName, item, dispatch]);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'relative h-9 flex items-center gap-2 px-3 py-1.5 border-b border-border dark:border-dark-border',
        'hover:bg-button-secondary dark:hover:bg-dark-input box-border group cursor-pointer outline-none',
        {
          'bg-button-secondary dark:bg-dark-input': isSelected,
          'opacity-50 shadow-lg z-50': isDragging,
        },
      )}
      onClick={() => handleClick(item.id)}
      {...attributes}
      {...listeners}
    >
      {runResult && (
        <span
          title={runResult.warning || undefined}
          className={cn('w-2 h-2 rounded-full shrink-0', {
            'bg-yellow-500': runResult.warning && runResult.status && runResult.status >= 200 && runResult.status < 400,
            'bg-green-500': !runResult.warning && runResult.status && runResult.status >= 200 && runResult.status < 400,
            'bg-orange-500': runResult.status && runResult.status >= 400 && runResult.status < 500,
            'bg-red-500': !runResult.status || runResult.status < 200 || runResult.status >= 500,
          })}
        />
      )}
      <MethodBadge method={item.method} />
      {isEditing && (
        <input
          autoFocus
          className="flex-1 py-px px-1 text-xs leading-none bg-transparent border border-border dark:border-dark-input dark:text-dark-text outline-none"
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
          <span className="flex-1 text-xs truncate" title={item.name}>
            {searchTerm ? <SearchHighlighter text={item.name} term={searchTerm} /> : item.name}
          </span>
          <div className="absolute top-0 bottom-0 right-0 px-3 flex items-center gap-2 bg-button-secondary dark:bg-dark-input opacity-0 group-hover:opacity-100">
            {!runningFolderId &&
              (isRequestRunning ? (
                <StopIcon
                  className="h-4 w-4 shrink-0 text-red-500 hover:text-red-600 cursor-pointer"
                  onClick={handlePlayClick}
                />
              ) : (
                <PlayIcon
                  className="h-4 w-4 shrink-0 text-green-500 hover:text-green-600 cursor-pointer opacity-0 group-hover:opacity-100"
                  onClick={handlePlayClick}
                />
              ))}
            <EditIcon
              className="h-4 w-4 text-button-text-secondary dark:text-text-secondary hover:text-button-primary cursor-pointer"
              onClick={() => setIsEditing(true)}
            />
            <TrashIcon
              className="h-3 w-3 text-button-text-secondary dark:text-text-secondary hover:text-button-danger cursor-pointer"
              onClick={(event: MouseEvent) => {
                event.stopPropagation();
                dispatch(collectionActions.removeRequest(item.id));
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
