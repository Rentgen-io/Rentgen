import { HTMLAttributes } from 'react';
import { RequestParameters } from 'src/types';
import { twMerge } from 'tailwind-merge';
import { ParameterControls } from './ParameterControls';

interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Whether the parameters may be tested as files: the fields of a form-data body */
  canBeFile?: boolean;
  parameters: RequestParameters;
  onChange: (parameters: RequestParameters) => void;
}

export default function ParametersPanel({ canBeFile, className, parameters, onChange, ...otherProps }: Props) {
  return (
    <div className={twMerge('flex flex-col gap-4', className)} {...otherProps}>
      {Object.entries(parameters).map(([key, value]) => (
        <div key={key} className="flex items-end justify-between gap-4">
          <span className="flex-1 min-w-1/5 mb-2 font-monospace truncate" title={key}>
            {key}
          </span>
          <ParameterControls
            canBeFile={canBeFile}
            parameterValue={value}
            onChange={(value) => onChange({ ...parameters, [key]: value })}
          />
        </div>
      ))}
    </div>
  );
}
