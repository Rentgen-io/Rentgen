import cn from 'classnames';
import { ChangeEvent, DragEvent, KeyboardEvent, useCallback, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { IconButton } from 'src/components/buttons/IconButton';
import Textarea from 'src/components/inputs/Textarea';
import Modal from 'src/components/modals/Modal';
import { useCurlImport } from 'src/hooks/useCurlImport';
import { useOpenApiImport } from 'src/hooks/useOpenApiImport';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectOpenImportResourceModal } from 'src/store/selectors';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { fetchOpenApiSchema, isHttpUrl, isOpenApiSchema, parseJsonObject } from 'src/utils';
import { notify } from 'src/utils/toast';

import ClearCrossIcon from 'src/assets/icons/clear-cross-icon.svg';
import Loader from 'src/components/loaders/Loader';

export default function ImportResourceModal() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const importCurl = useCurlImport();
  const importOpenApi = useOpenApiImport();

  const openImportResourceModal = useAppSelector(selectOpenImportResourceModal);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const handleClose = useCallback(() => {
    dispatch(modalsActions.closeImportResourceModal());
    setValue('');
    setIsDragging(false);
  }, [dispatch]);

  const readFile = useCallback(
    async (file?: File) => {
      if (!file) return;

      try {
        setValue(await file.text());
      } catch {
        notify.error(t('common.failedReadFile'), { toastId: 'error-read-file' });
      }
    },
    [t],
  );

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      readFile(event.target.files?.[0]);
      event.target.value = '';
    },
    [readFile],
  );

  const importResource = useCallback(async (): Promise<boolean> => {
    const trimmed = value.trim();

    if (isHttpUrl(trimmed)) {
      const schema = await fetchOpenApiSchema(trimmed);
      if (schema) return importOpenApi(schema);
    } else {
      const schema = parseJsonObject(trimmed);
      if (isOpenApiSchema(schema)) return importOpenApi(schema);
    }

    return importCurl(trimmed);
  }, [value, importOpenApi, importCurl]);

  const handleKeyDown = useCallback(
    async (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing || !value) return;

      event.preventDefault();
      if (isImporting) return;

      setIsImporting(true);
      try {
        if (await importResource()) handleClose();
        else notify.error(t('curl.invalidFormat'), { toastId: 'error-import-resource' });
      } finally {
        setIsImporting(false);
      }
    },
    [value, isImporting, importResource],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;

    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      readFile(event.dataTransfer.files?.[0]);
    },
    [readFile],
  );

  return (
    <Modal isOpen={openImportResourceModal} onClose={handleClose}>
      <IconButton className="absolute top-2.5 right-3" onClick={handleClose}>
        <ClearCrossIcon className="h-5 w-5" />
      </IconButton>
      <div className="flex flex-col gap-4">
        <h4 className="m-0">{t('common.import')}</h4>
        <div className="relative flex flex-col gap-2 min-h-60 leading-0">
          {isImporting && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-500/10 dark:bg-gray-500/20 z-10">
              <Loader />
            </div>
          )}
          <Textarea
            autoFocus={true}
            className={cn('resize-none', {
              'min-h-60': value,
              'h-8 min-h-auto overflow-hidden': !value,
              'opacity-50': isImporting,
            })}
            placeholder={t('curl.importCurlPlaceholder')}
            readOnly={isImporting}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {!value && (
            <div
              className={cn(
                'flex flex-auto flex-col items-center justify-center gap-1 border border-dashed text-xs leading-normal select-none',
                isDragging ? 'bg-gray-500/10 dark:bg-gray-500/20' : 'border-border dark:border-dark-input',
              )}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <span className="font-medium">{t('curl.dropAnywhereToImport')}</span>
              <span className="text-text-secondary">
                <Trans
                  i18nKey="curl.orSelectFile"
                  components={{
                    file: (
                      <span
                        className="text-button-primary hover:underline cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      />
                    ),
                  }}
                />
              </span>
              <input ref={fileInputRef} className="sr-only" tabIndex={-1} type="file" onChange={handleFileChange} />
            </div>
          )}
        </div>
        <div className="text-xs text-text-secondary">
          {value ? (
            <Trans
              i18nKey="curl.pressEnterToImport"
              components={{
                key: (
                  <span className="py-px px-2 text-gray-500 bg-gray-500/10 dark:text-gray-400 dark:bg-gray-500/20" />
                ),
              }}
            />
          ) : (
            t('curl.noImportAvailable')
          )}
        </div>
      </div>
    </Modal>
  );
}
