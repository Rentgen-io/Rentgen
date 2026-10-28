import { HTMLAttributes } from 'react';
import { RequestParameters } from 'src/types';
import { twMerge } from 'tailwind-merge';
import { ParameterControls } from './ParameterControls';

interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  parameters: RequestParameters;
  onChange: (parameters: RequestParameters) => void;
}

export default function ParametersPanel({ className, parameters, onChange, ...otherProps }: Props) {
  return (
    <div className={twMerge('flex flex-col gap-4', className)} {...otherProps}>
      {Object.entries(parameters).map(([key, value]) => (
        <div key={key} className="flex items-end justify-between gap-4">
          <span className="flex-1 min-w-1/5 mb-2 font-monospace truncate" title={key}>
            {key}
          </span>
          <ParameterControls parameterValue={value} onChange={(value) => onChange({ ...parameters, [key]: value })} />
        </div>
      ))}
    </div>
  );
}
