import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import Select, { SelectOption } from 'src/components/inputs/Select';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectEnvironments, selectSelectedEnvironmentId } from 'src/store/selectors';
import { environmentActions } from 'src/store/slices/environmentSlice';
import { uiActions } from 'src/store/slices/uiSlice';

import AddIcon from 'src/assets/icons/add-icon.svg';

const CREATE_ENVIRONMENT_OPTION = '__create_environment__';
const DARK_TEXT = '#212121';
const LIGHT_TEXT = '#ffffff';

interface Props {
  className?: string;
}

export default function EnvironmentSelector({ className }: Props) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const environments = useAppSelector(selectEnvironments);
  const selectedEnvironmentId = useAppSelector(selectSelectedEnvironmentId);

  const color = environments.find((env) => env.id === selectedEnvironmentId)?.color;
  const textColor = color ? `${getReadableTextColor(color)} !important` : undefined;

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

    dispatch(environmentActions.selectEnvironment(value));
  };

  return (
    <Select
      aria-label={t('environment.selectEnvironment')}
      className={cn('min-w-37.5', className)}
      isSearchable={false}
      options={options}
      placeholder={t('environment.selectEnvironment')}
      styles={
        color
          ? {
              control: (base) => ({ ...base, backgroundColor: color, borderColor: `${color} !important` }),
              singleValue: (base) => ({ ...base, color: textColor }),
              dropdownIndicator: (base) => ({ ...base, color: textColor }),
            }
          : undefined
      }
      value={options.find((option) => option.value === selectedEnvironmentId)}
      onChange={(option) => option && handleChange(option.value)}
    />
  );
}

function getReadableTextColor(background: string): string {
  const hex = background.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance < 0.7 ? LIGHT_TEXT : DARK_TEXT;
}
