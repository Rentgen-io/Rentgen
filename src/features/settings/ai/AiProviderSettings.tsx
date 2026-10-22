import cn from 'classnames';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { testAiConnection } from 'src/api/ai';
import { openExternal } from 'src/api/system';
import Button, { ButtonType } from 'src/components/buttons/Button';
import { FieldLabel } from 'src/components/inputs/FieldLabel';
import Input from 'src/components/inputs/Input';
import { SelectOption } from 'src/components/inputs/Select';
import SimpleSelect from 'src/components/inputs/SimpleSelect';
import Loader from 'src/components/loaders/Loader';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectActiveAiProvider, selectAiProviders } from 'src/store/selectors';
import { settingsActions } from 'src/store/slices/settingsSlice';
import { AiProvider, AiProviderType } from 'src/types';
import { notify } from 'src/utils/toast';
import { twMerge } from 'tailwind-merge';
import { v4 as uuidv4 } from 'uuid';
import SettingsHeader from '../SettingsHeader';

import EditIcon from 'src/assets/icons/edit-icon.svg';
import TrashIcon from 'src/assets/icons/trash-icon.svg';

const CHAT_COMPLETIONS_PATH = '/v1/chat/completions';
const OPENAI_API_BASE_URL = 'https://api.openai.com';

const providerNames: Record<AiProviderType, string> = {
  openai: 'OpenAI (ChatGPT)',
  ollama: 'Ollama',
};

const options: SelectOption<AiProviderType>[] = (Object.keys(providerNames) as AiProviderType[]).map((value) => ({
  label: providerNames[value],
  value,
}));

export function AiProviderSettings() {
  const { t } = useTranslation();

  const activeAiProvider = useAppSelector(selectActiveAiProvider);
  const aiProviders = useAppSelector(selectAiProviders);

  const [isAdding, setIsAdding] = useState<boolean>(aiProviders.length === 0);
  const [editingAiProviderId, setEditingAiProviderId] = useState<string | null>(null);

  const hasAiProviders = aiProviders.length > 0;

  const handleEdit = (aiProviderId: string) => {
    setIsAdding(false);
    setEditingAiProviderId(aiProviderId);
  };

  const handleCloseEditor = () => setEditingAiProviderId(null);

  const handleStartAdding = () => {
    setEditingAiProviderId(null);
    setIsAdding(true);
  };

  const handleStopAdding = () => setIsAdding(false);

  return (
    <>
      <SettingsHeader>
        <span>{t('settings.ai.connectTitle')}</span>
        {activeAiProvider && (
          <span className="font-normal text-xs text-text-secondary">
            {activeAiProvider.name} · {activeAiProvider.model}
          </span>
        )}
      </SettingsHeader>
      <p className="m-0 text-xs text-text-secondary">{t('settings.ai.connectDescription')}</p>
      {hasAiProviders && (
        <div
          className={cn(
            'border border-border dark:border-dark-border',
            'divide-y divide-border dark:divide-dark-border',
          )}
        >
          {aiProviders.map((aiProvider) => (
            <AiProviderBlock
              key={aiProvider.id}
              aiProvider={aiProvider}
              isActive={activeAiProvider?.id === aiProvider.id}
              isEditing={editingAiProviderId === aiProvider.id}
              handleEdit={handleEdit}
              handleCloseEditor={handleCloseEditor}
            />
          ))}
        </div>
      )}
      {(isAdding || !hasAiProviders) && (
        <AiProviderForm onCancel={hasAiProviders ? handleStopAdding : undefined} onSave={handleStopAdding} />
      )}
      {!isAdding && hasAiProviders && (
        <Button className="flex-1 flex justify-center items-center" onClick={handleStartAdding}>
          {t('common.add')}
        </Button>
      )}
    </>
  );
}

function AiProviderBlock({
  aiProvider,
  isActive,
  isEditing,
  handleEdit,
  handleCloseEditor,
}: {
  aiProvider: AiProvider;
  isActive: boolean;
  isEditing: boolean;
  handleEdit(id: string): void;
  handleCloseEditor(): void;
}) {
  const dispatch = useAppDispatch();

  return (
    <div>
      <div
        className={cn('relative text-xs hover:bg-button-secondary dark:hover:bg-dark-input group', {
          'bg-button-secondary dark:bg-dark-input': isActive,
        })}
      >
        <label
          className={cn('flex items-center gap-2 p-3', {
            'cursor-pointer': !isActive,
          })}
        >
          <input
            className="m-0"
            type="radio"
            name="aiProvider"
            value={aiProvider.id}
            checked={isActive}
            onChange={() => dispatch(settingsActions.setActiveAiProvider(aiProvider.id))}
          />
          <span className="text-xs">
            {aiProvider.name} · {aiProvider.model}
          </span>
        </label>
        <div
          className={cn(
            'absolute top-0 bottom-0 right-0',
            'flex items-center gap-2 px-3 bg-button-secondary dark:bg-dark-input opacity-0 group-hover:opacity-100',
          )}
        >
          <EditIcon
            className="h-5 w-5 text-button-text-secondary dark:text-text-secondary hover:text-button-primary cursor-pointer"
            onClick={(event: MouseEvent) => {
              event.stopPropagation();
              handleEdit(aiProvider.id);
            }}
          />
          <TrashIcon
            className="h-4 w-4 text-button-text-secondary dark:text-text-secondary hover:text-button-danger cursor-pointer"
            onClick={(event: MouseEvent) => {
              event.stopPropagation();
              dispatch(settingsActions.deleteAiProvider(aiProvider.id));
            }}
          />
        </div>
      </div>
      {isEditing && (
        <AiProviderForm
          aiProvider={aiProvider}
          className="p-4 border-t border-border dark:border-dark-border"
          onCancel={handleCloseEditor}
          onSave={handleCloseEditor}
        />
      )}
    </div>
  );
}

function AiProviderForm({
  aiProvider,
  className,
  onCancel,
  onSave,
}: {
  aiProvider?: AiProvider;
  className?: string;
  onCancel?(): void;
  onSave?(): void;
}) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const [aiProviderId] = useState<string>(() => aiProvider?.id ?? `ai_provider_${uuidv4()}`);
  const [aiProviderType, setAiProviderType] = useState<AiProviderType>(aiProvider?.type ?? 'openai');
  const [apiKey, setApiKey] = useState<string>(aiProvider?.apiKey ?? '');
  const [baseUrl, setBaseUrl] = useState<string>(aiProvider?.baseUrl ?? '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [model, setModel] = useState<string>(aiProvider?.model ?? '');
  const [path, setPath] = useState<string>(aiProvider?.path ?? CHAT_COMPLETIONS_PATH);

  const isOllama = aiProviderType === 'ollama';
  const isOpenAi = aiProviderType === 'openai';

  const currentProvider = useMemo(() => {
    if (aiProvider?.type === aiProviderType) return aiProvider;
    return null;
  }, [aiProvider, aiProviderType]);

  const provider = useMemo<AiProvider>(
    () => ({
      active: aiProvider?.active ?? false,
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim().replace(/\/+$/, ''),
      id: aiProviderId,
      model: model.trim(),
      name: providerNames[aiProviderType],
      path: '/' + path.trim().replace(/^\/+/, ''),
      type: aiProviderType,
    }),
    [aiProviderId, aiProvider?.active, aiProviderType, apiKey, baseUrl, model, path],
  );

  const disabled = !provider.baseUrl || !path.trim() || !provider.model || (isOpenAi && !provider.apiKey);

  useEffect(() => {
    setBaseUrl(currentProvider?.baseUrl ?? (isOpenAi ? OPENAI_API_BASE_URL : ''));
    setModel(currentProvider?.model ?? '');
    setPath(currentProvider?.path ?? CHAT_COMPLETIONS_PATH);
    setApiKey(currentProvider?.apiKey ?? '');
  }, [currentProvider, isOpenAi]);

  const handleSave = useCallback(async () => {
    if (disabled || isSaving) return;

    setIsSaving(true);

    const result = await testAiConnection(provider);

    setIsSaving(false);

    if (!result.ok) {
      notify.error(result.error, { toastId: 'error-save-ai-provider' });
      return;
    }

    dispatch(settingsActions.setAiProvider(provider));
    notify.success(t('common.saved'), { toastId: 'success-save-ai-provider' });

    onSave?.();
  }, [disabled, isSaving, provider, t, dispatch, onSave]);

  return (
    <div className={twMerge('flex flex-col gap-4', className)}>
      <div className="flex-1 flex flex-col gap-2">
        <FieldLabel label={t('settings.ai.provider')} required />
        <SimpleSelect
          options={options}
          value={aiProviderType}
          onChange={(event) => setAiProviderType(event.target.value as AiProviderType)}
        />
        {isOllama && (
          <span
            className="w-fit text-xs text-button-primary hover:underline cursor-pointer"
            onClick={() => openExternal('https://docs.ollama.com/quickstart#local')}
          >
            {t('settings.ai.howToRunOllamaLocally')}
          </span>
        )}
      </div>
      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex-1 flex flex-col gap-2">
          <FieldLabel label={t('settings.ai.baseUrl')} required />
          <Input type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <FieldLabel label={t('settings.ai.path')} required />
          <Input value={path} onChange={(e) => setPath(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex-1 flex flex-col gap-2">
          <FieldLabel label={t('settings.ai.model')} required />
          <Input value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <FieldLabel label={t('settings.ai.apiKey')} required={isOpenAi} />
          <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          <span className="text-xs text-text-secondary">{t('settings.ai.apiKeyStorageNotice')}</span>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        {onCancel && (
          <Button buttonType={ButtonType.SECONDARY} className="flex-1" disabled={isSaving} onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        )}
        <Button
          className="flex-1 flex justify-center items-center"
          disabled={disabled || isSaving}
          onClick={handleSave}
        >
          {isSaving ? <Loader className="h-4 w-4 [&>span]:border-2!" mode="dark" /> : t('common.save')}
        </Button>
      </div>
    </div>
  );
}
