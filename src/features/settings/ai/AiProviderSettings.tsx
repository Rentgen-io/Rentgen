import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { normalizeAiBaseUrl, testAiConnection } from 'src/api/ai';
import { openExternal } from 'src/api/system';
import Button, { ButtonType } from 'src/components/buttons/Button';
import { RadioButtons, RadioOption } from 'src/components/buttons/RadioButtons';
import Input from 'src/components/inputs/Input';
import Loader from 'src/components/loaders/Loader';
import { selectActiveAiProvider, selectAiProviders } from 'src/store/selectors';
import { settingsActions } from 'src/store/slices/settingsSlice';
import { AIProviderId } from 'src/types';
import { notify } from 'src/utils/toast';
import SettingsHeader from '../SettingsHeader';

const options: RadioOption<AIProviderId>[] = [
  { label: 'Ollama', value: 'ollama' },
  { label: 'OpenAI', value: 'openai', disabled: true },
  { label: 'OpenAI-compatible', value: 'openai-compatible', disabled: true },
];

export function AiProviderSettings() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const aiProviders = useSelector(selectAiProviders);
  const activeProvider = useSelector(selectActiveAiProvider);

  const [aiProvider, setAiProvider] = useState<AIProviderId>(activeProvider?.id ?? 'ollama');
  const [baseUrl, setBaseUrl] = useState(activeProvider?.baseUrl ?? '');
  const [model, setModel] = useState(activeProvider?.model ?? '');
  const [apiKey, setApiKey] = useState(activeProvider?.apiKey ?? '');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const currentProvider = useMemo(
    () => aiProviders.find((provider) => provider.id === aiProvider),
    [aiProviders, aiProvider],
  );
  const isOllama = aiProvider === 'ollama';
  const isOpenAI = aiProvider === 'openai' || aiProvider === 'openai-compatible';
  const disabled = false;

  useEffect(() => {
    setBaseUrl(currentProvider?.baseUrl ?? '');
    setModel(currentProvider?.model ?? '');
    setApiKey(currentProvider?.apiKey ?? '');
  }, [currentProvider]);

  const handleSave = async () => {
    if (disabled || isSaving) return;

    setIsSaving(true);
    const result = await testAiConnection({ baseUrl, model, apiKey });
    setIsSaving(false);

    if (!result.ok) {
      notify.error(result.error, { toastId: 'error-save-ai-provider' });
      return;
    }

    dispatch(
      settingsActions.setAiProvider({
        id: aiProvider,
        active: true,
        baseUrl: normalizeAiBaseUrl(baseUrl),
        model,
        apiKey,
      }),
    );
    notify.success(t('common.saved'), { toastId: 'success-save-ai-provider' });
  };

  return (
    <>
      <SettingsHeader>{t('settings.ai.connectTitle')}</SettingsHeader>
      <p className="m-0 text-xs text-text-secondary">{t('settings.ai.connectDescription')}</p>
      <RadioButtons name="aiProvider" options={options} value={aiProvider} onChange={(value) => setAiProvider(value)} />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-auto flex flex-col gap-2">
            <span className="text-xs">
              {t('settings.ai.baseUrl')}
              <span className="text-red-500 ml-1">*</span>
            </span>
            <Input type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
          </div>
          <div className="flex-auto flex flex-col gap-2">
            <span className="text-xs">
              {t('settings.ai.model')}
              <span className="text-red-500 ml-1">*</span>
            </span>
            <Input value={model} onChange={(e) => setModel(e.target.value)} />
          </div>
        </div>
        <div className="flex-auto flex flex-col gap-2">
          <span className="text-xs">
            {t('settings.ai.apiKey')}
            {isOpenAI && <span className="text-red-500 ml-1">*</span>}
          </span>
          <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          <span className="text-xs text-text-secondary">{t('settings.ai.apiKeyStorageNotice')}</span>
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
            {isSaving ? (
              <Loader className="h-3.5 w-3.5 [&>span]:border-2! [&>span]:border-white! [&>span]:border-b-button-primary!" />
            ) : (
              t('common.save')
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
