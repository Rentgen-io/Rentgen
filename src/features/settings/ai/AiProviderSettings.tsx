import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { openExternal } from 'src/api/system';
import Button, { ButtonType } from 'src/components/buttons/Button';
import { RadioButtons } from 'src/components/buttons/RadioButtons';
import Input from 'src/components/inputs/Input';
import { selectActiveAiProvider, selectAiProviders } from 'src/store/selectors';
import { settingsActions } from 'src/store/slices/settingsSlice';
import { AIProviderId } from 'src/types';
import SettingsHeader from '../SettingsHeader';
import { toast } from 'react-toastify';
import { SUCCESS_TOAST_AUTO_CLOSE } from 'src/constants/ui';

const options: { label: string; value: AIProviderId }[] = [
  { label: 'Ollama', value: 'ollama' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'OpenAI-compatible', value: 'openai-compatible' },
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

  const currentProvider = useMemo(
    () => aiProviders.find((provider) => provider.id === aiProvider),
    [aiProviders, aiProvider],
  );
  const isOllama = aiProvider === 'ollama';
  const isOpenAI = aiProvider === 'openai' || aiProvider === 'openai-compatible';
  const disabled = !aiProvider || !baseUrl || !model || (isOpenAI && !apiKey);

  useEffect(() => {
    setBaseUrl(currentProvider?.baseUrl ?? '');
    setModel(currentProvider?.model ?? '');
    setApiKey(currentProvider?.apiKey ?? '');
  }, [currentProvider]);

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
              onClick={() => openExternal('https://docs.ollama.com/quickstart#run-a-model-locally')}
            >
              {t('settings.ai.howToRunOllamaLocally')}
            </Button>
          )}
          <Button
            className="flex-1"
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                dispatch(
                  settingsActions.setAiProvider({
                    id: aiProvider,
                    active: true,
                    baseUrl,
                    model,
                    apiKey,
                  }),
                );
                toast.success(<span className="flex-auto">{t('common.saved')}</span>, {
                  autoClose: SUCCESS_TOAST_AUTO_CLOSE,
                });
              }
            }}
          >
            {t('common.save')}
          </Button>
        </div>
      </div>
    </>
  );
}
