interface Props {
  label: string;
  required?: boolean;
}

export function FieldLabel({ label, required }: Props) {
  return (
    <span className="text-xs">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </span>
  );
}
