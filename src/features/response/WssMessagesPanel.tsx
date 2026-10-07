import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import Panel from 'src/components/panels/Panel';
import { useAppSelector } from 'src/store/hooks';
import { selectWssMessages } from 'src/store/selectors';

export default function WssMessagesPanel() {
  const { t } = useTranslation();
  const messages = useAppSelector(selectWssMessages);

  if (messages.length === 0) return null;

  return (
    <Panel title={t('messages.title')}>
      <div className="max-h-100 p-4 text-xs border-t border-border dark:border-dark-body overflow-y-auto">
        {messages.map(({ data, direction }, index) => (
          <div
            key={index}
            className="not-first:pt-2 not-last:pb-2 border-b last:border-none border-border dark:border-dark-body"
          >
            <div className="flex items-center gap-4">
              {direction !== 'system' && (
                <span
                  className={cn('h-5 w-5 font-bold text-center leading-normal rotate-90', {
                    'text-method-post bg-method-post/10': direction === 'sent',
                    'text-method-put bg-method-put/10': direction === 'received',
                  })}
                >
                  {direction === 'sent' ? '⬅' : direction === 'received' ? '➡' : ''}
                </span>
              )}
              <div>
                <pre className="my-0 whitespace-pre-wrap break-all">{data}</pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
