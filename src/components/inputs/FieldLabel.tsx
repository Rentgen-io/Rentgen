import { twMerge } from 'tailwind-merge';

interface Props {
  className?: string;
  label: string;
  required?: boolean;
}

export function FieldLabel({ className, label, required }: Props) {
  return (
    <span className={twMerge('text-xs', className)}>
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </span>
  );
}
