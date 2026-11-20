import { ReactNode } from 'react';
import { Id, toast, ToastContent, ToastOptions } from 'react-toastify';

type ToastFn = (content: ToastContent, options?: ToastOptions) => Id;

const notifier = (show: ToastFn, defaults?: ToastOptions) => (content: ReactNode, options?: ToastOptions) => {
  const toastId = options?.toastId;
  if (toastId && toast.isActive(toastId)) toast.dismiss(toastId);

  show(<span className="flex-auto">{content}</span>, { ...defaults, ...options, updateId: toastId });
};

export const notify = {
  success: notifier(toast.success, { autoClose: 2000 }),
  info: notifier(toast.info, { autoClose: 2000 }),
  warning: notifier(toast.warning),
  error: notifier(toast.error),
};
