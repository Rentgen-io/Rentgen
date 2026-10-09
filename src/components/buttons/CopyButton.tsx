import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { notify } from 'src/utils/toast';
import { twMerge } from 'tailwind-merge';
import Button, { Props as ButtonProps, ButtonSize, ButtonType } from './Button';

interface Props extends ButtonProps {
  textToCopy: string;
}

export function CopyButton({
  buttonType = ButtonType.SECONDARY,
  buttonSize = ButtonSize.SMALL,
  children,
  className,
  textToCopy,
  ...otherProps
}: Props) {
  const { t } = useTranslation();

  return (
    <Button
      className={twMerge(cn('min-w-auto whitespace-nowrap', className))}
      buttonSize={buttonSize}
      buttonType={buttonType}
      {...otherProps}
      onClick={copyToClipboard}
    >
      {children}
    </Button>
  );

  function copyToClipboard() {
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => notify.info(t('common.copied'), { toastId: 'info-copy' }))
      .catch((error) => {
        console.error(error);
        notify.error(t('common.failedCopy'), { toastId: 'error-copy' });
      });
  }
}
