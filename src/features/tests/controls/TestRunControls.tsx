import { HTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { twMerge } from 'tailwind-merge';
import Button, { ButtonSize } from '../../../components/buttons/Button';
import Loader from '../../../components/loaders/Loader';

interface Props extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  isRunning: boolean;
  executeTest: () => Promise<void>;
}

export default function TestRunControls({ className, children, label, isRunning, executeTest, ...otherProps }: Props) {
  const { t } = useTranslation();

  return (
    <div className={twMerge('flex items-end gap-1.5', className)} {...otherProps}>
      {children}
      <Button
        buttonSize={ButtonSize.SMALL}
        className="flex justify-center items-center min-w-12 w-full"
        disabled={isRunning}
        onClick={executeTest}
      >
        {isRunning ? (
          <Loader className="h-3 w-3 my-0.5 [&>span]:border-2!" mode="dark" />
        ) : label ? (
          label
        ) : (
          t('common.run')
        )}
      </Button>
    </div>
  );
}
