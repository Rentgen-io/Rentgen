import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { testAiConnection } from 'src/api/ai';
import { openExternal } from 'src/api/system';
import Button, { ButtonType } from 'src/components/buttons/Button';
import { RadioButtons, RadioOption } from 'src/components/buttons/RadioButtons';
import Input from 'src/components/inputs/Input';
import Loader from 'src/components/loaders/Loader';
import { selectActiveAiProvider, selectAiProviders } from 'src/store/selectors';
import { settingsActions } from 'src/store/slices/settingsSlice';
import { AiProvider, AiProviderId } from 'src/types';
import { notify } from 'src/utils/toast';
import SettingsHeader from '../SettingsHeader';

const CHAT_COMPLETIONS_PATH = '/v1/chat/completions';

const options: RadioOption<AiProviderId>[] = [
  { label: 'Ollama', value: 'ollama' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'OpenAI-compatible', value: 'openai-compatible', disabled: true },
];

export function AiProviderSettings() {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const aiProviders = useSelector(selectAiProviders);
  const activeProvider = useSelector(selectActiveAiProvider);

  const [aiProviderId, setAiProviderId] = useState<AiProviderId>(activeProvider?.id ?? 'ollama');
  const [apiKey, setApiKey] = useState<string>(activeProvider?.apiKey ?? '');
  const [baseUrl, setBaseUrl] = useState<string>(activeProvider?.baseUrl ?? '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [model, setModel] = useState<string>(activeProvider?.model ?? '');
  const [path, setPath] = useState<string>(activeProvider?.path ?? CHAT_COMPLETIONS_PATH);

  const currentProvider = useMemo(
    () => aiProviders.find((provider) => provider.id === aiProviderId),
    [aiProviders, aiProviderId],
  );

  const isOllama = aiProviderId === 'ollama';
  const isOpenAI = aiProviderId === 'openai' || aiProviderId === 'openai-compatible';
  const disabled = !aiProviderId || !baseUrl || !path || !model || (isOpenAI && !apiKey);

  useEffect(() => {
    setBaseUrl(currentProvider?.baseUrl ?? '');
    setModel(currentProvider?.model ?? '');
    setPath(currentProvider?.path ?? CHAT_COMPLETIONS_PATH);
    setApiKey(currentProvider?.apiKey ?? '');
  }, [currentProvider]);

  const handleSave = async () => {
    if (disabled || isSaving) return;

    setIsSaving(true);

    const aiProvider: AiProvider = {
      active: true,
      apiKey,
      baseUrl: baseUrl.trim().replace(/\/+$/, ''),
      id: aiProviderId,
      model,
      name: options.find((option) => option.value === aiProviderId)?.label ?? '',
      path: '/' + path.trim().replace(/^\/+/, ''),
    };
    const result = await testAiConnection(aiProvider);

    setIsSaving(false);

    if (!result.ok) {
      notify.error(result.error, { toastId: 'error-save-ai-provider' });
      return;
    }

    dispatch(settingsActions.setAiProvider(aiProvider));
    notify.success(t('common.saved'), { toastId: 'success-save-ai-provider' });
  };

  return (
    <>
      <SettingsHeader>{t('settings.ai.connectTitle')}</SettingsHeader>
      <p className="m-0 text-xs text-text-secondary">{t('settings.ai.connectDescription')}</p>
      <RadioButtons
        name="aiProvider"
        options={options}
        value={aiProviderId}
        onChange={(value) => setAiProviderId(value)}
      />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex flex-col gap-2">
            <span className="text-xs">
              {t('settings.ai.baseUrl')}
              <span className="text-red-500 ml-1">*</span>
            </span>
            <Input type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <span className="text-xs">
              {t('settings.ai.path')}
              <span className="text-red-500 ml-1">*</span>
            </span>
            <Input value={path} onChange={(e) => setPath(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex flex-col gap-2">
            <span className="text-xs">
              {t('settings.ai.model')}
              <span className="text-red-500 ml-1">*</span>
            </span>
            <Input value={model} onChange={(e) => setModel(e.target.value)} />
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <span className="text-xs">
              {t('settings.ai.apiKey')}
              {isOpenAI && <span className="text-red-500 ml-1">*</span>}
            </span>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            <span className="text-xs text-text-secondary">{t('settings.ai.apiKeyStorageNotice')}</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          {isOllama && (
            <Button
              className="flex-1"
              buttonType={ButtonType.SECONDARY}
              onClick={() => openExternal('https://docs.ollama.com/quickstart#local')}
            >
              {t('settings.ai.howToRunOllamaLocally')}
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
    </>
  );
}
