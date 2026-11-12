import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import Select, { SelectOption } from 'src/components/inputs/Select';
import { useAppDispatch } from 'src/store/hooks';
import { environmentActions } from 'src/store/slices/environmentSlice';
import { uiActions } from 'src/store/slices/uiSlice';
import { Environment } from 'src/types';

import AddIcon from 'src/assets/icons/add-icon.svg';

const CREATE_ENVIRONMENT_OPTION = '__create_environment__';

interface Props {
  className?: string;
  environments: Environment[];
  selectedEnvironmentId: string | null;
  onSelect: (id: string | null) => void;
}

export default function EnvironmentSelector({ className, environments, selectedEnvironmentId, onSelect }: Props) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const selectedEnvironment = environments.find((env) => env.id === selectedEnvironmentId);
  const hasColor = selectedEnvironment?.color;
  const needsLightText = hasColor && isColorDark(selectedEnvironment.color);

  const options: SelectOption<string | null>[] = [
    { value: null, label: t('environment.noEnvironment') },
    ...environments.map((env) => ({
      value: env.id,
      label: env.title,
    })),
    {
      value: CREATE_ENVIRONMENT_OPTION,
      label: (
        <span className="flex items-center gap-2">
          <AddIcon className="size-4" />
          {t('environment.newEnvironment')}
        </span>
      ),
      className: 'border-t border-border',
    },
  ];

  const handleChange = (value: string | null) => {
    if (value === CREATE_ENVIRONMENT_OPTION) {
      dispatch(environmentActions.startAddEnvironment());
      dispatch(uiActions.setSidebarActiveTab('environments'));
      return;
    }

    onSelect(value);
  };

  return (
    <Select
      className={cn('min-w-37.5', className)}
      isSearchable={false}
      options={options}
      placeholder={t('environment.selectEnvironment')}
      styles={
        hasColor
          ? {
              control: (base) => ({
                ...base,
                backgroundColor: selectedEnvironment.color,
                borderColor: `${selectedEnvironment.color} !important`,
              }),
              singleValue: (base) => ({
                ...base,
                color: needsLightText ? '#ffffff !important' : '#212121 !important',
              }),
              dropdownIndicator: (base) => ({
                ...base,
                color: needsLightText ? '#ffffff !important' : '#212121 !important',
              }),
            }
          : undefined
      }
      value={options.find((option) => option.value === selectedEnvironmentId)}
      onChange={(option) => handleChange(option!.value)}
    />
  );
}

function isColorDark(hexColor: string): boolean {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance < 0.7;
}
