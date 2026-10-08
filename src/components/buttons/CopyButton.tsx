import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { SUCCESS_TOAST_AUTO_CLOSE } from 'src/constants/ui';
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
      .then(() =>
        toast.info(<span className="flex-auto">{t('common.copied')}</span>, { autoClose: SUCCESS_TOAST_AUTO_CLOSE }),
      )
      .catch((error) => {
        console.error(error);
        toast.error(<span className="flex-auto">{t('common.failedCopy')}</span>);
      });
  }
}
