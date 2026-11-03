import cn from 'classnames';
import { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import { twMerge } from 'tailwind-merge';
import Button, { ButtonSize, ButtonType } from '../buttons/Button';
import Modal, { Props as ModalProps } from './Modal';

export interface Props extends ModalProps, PropsWithChildren {
  cancelText?: string;
  confirmText?: string;
  confirmType?: ButtonType;
  description?: string;
  title?: string;
  onConfirm(): void;
}

export default function ConfirmationModal({
  className,
  cancelText,
  children,
  confirmText,
  confirmType = ButtonType.DANGER,
  description,
  isOpen,
  title,
  onClose,
  onConfirm,
}: Props) {
  const { t } = useTranslation();

  return (
    <Modal className={twMerge(cn('[&>div]:w-100!', className))} isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {title && <h5 className="m-0">{title}</h5>}
        {description && <p className="m-0 text-xs text-muted-foreground">{description}</p>}
        {children}
        <div className="flex items-center justify-end gap-2">
          <Button buttonSize={ButtonSize.SMALL} buttonType={ButtonType.SECONDARY} onClick={onClose}>
            {cancelText || t('common.cancel')}
          </Button>
          <Button buttonSize={ButtonSize.SMALL} buttonType={confirmType} onClick={onConfirm}>
            {confirmText || t('common.ok')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
