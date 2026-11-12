import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import Panel from 'src/components/panels/Panel';
import { JsonViewer } from 'src/components/viewers/JsonViewer';
import { useAppSelector } from 'src/store/hooks';
import { selectWssMessages } from 'src/store/selectors';
import { tryParseJsonObject } from 'src/utils';

const PREVIEW_EDITOR_OPTIONS = { folding: false, lineNumbers: 'off' } as const;

export default function WssMessagesPanel() {
  const { t } = useTranslation();

  const messages = useAppSelector(selectWssMessages);
  if (messages.length === 0) return null;

  return (
    <Panel className="flex flex-col flex-auto h-0 min-h-40 overflow-hidden" title={t('messages.title')}>
      <div className="py-3 px-4 text-xs border-t border-border overflow-y-auto">
        {messages.map(({ data, direction }, index) => (
          <div key={index} className="not-first:pt-2 not-last:pb-2 border-b last:border-none border-border">
            <div className="flex items-center gap-4">
              {direction !== 'system' && (
                <span
                  className={cn('size-5 shrink-0 font-medium text-center leading-normal rotate-90', {
                    'text-method-post bg-method-post/10': direction === 'sent',
                    'text-method-put bg-method-put/10': direction === 'received',
                  })}
                >
                  {direction === 'sent' ? '⬅' : direction === 'received' ? '➡' : ''}
                </span>
              )}
              <div className="flex-auto min-w-0 -ml-2.5">
                <JsonViewer
                  key={index}
                  minHeight={0}
                  options={PREVIEW_EDITOR_OPTIONS}
                  source={tryParseJsonObject(data) as object}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
