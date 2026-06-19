import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectDynamicVariables, selectEnvironments, selectSetAsDynamicVariableModal } from '../../store/selectors';
import { environmentActions } from '../../store/slices/environmentSlice';
import { uiActions } from '../../store/slices/uiSlice';
import { DynamicVariable } from '../../types';
import { ButtonType } from '../buttons/Button';
import Input from '../inputs/Input';
import Select from '../inputs/Select';
import ConfirmationModal from './ConfirmationModal';

const ALL_ENVIRONMENTS_VALUE = 'all';

const sanitizeToVariableName = (val: string): string => {
  return val
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
};

interface EnvironmentOption {
  value: string;
  label: string;
}

export default function SetAsDynamicVariableModal() {
  const dispatch = useAppDispatch();
  const modalState = useAppSelector(selectSetAsDynamicVariableModal);
  const environments = useAppSelector(selectEnvironments);
  const dynamicVariables = useAppSelector(selectDynamicVariables);
  const [name, setName] = useState('');
  const [selector, setSelector] = useState('');
  const [selectedEnvironment, setSelectedEnvironment] = useState<EnvironmentOption | null>(null);
  const [duplicateToOverwrite, setDuplicateToOverwrite] = useState<DynamicVariable | null>(null);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  // Reset form when modal opens
  useEffect(() => {
    if (modalState.isOpen) {
      setName(sanitizeToVariableName(modalState.initialSelector));
      setSelector(modalState.initialSelector);
      setSelectedEnvironment({ value: ALL_ENVIRONMENTS_VALUE, label: t('modals.setDynamicVariable.allEnvironments') });
      setDuplicateToOverwrite(null);
      setError('');
    }
  }, [modalState.isOpen, modalState.initialSelector]);

  const environmentOptions: EnvironmentOption[] = useMemo(() => {
    const options: EnvironmentOption[] = [
      { value: ALL_ENVIRONMENTS_VALUE, label: t('modals.setDynamicVariable.allEnvironments') },
    ];
    environments.forEach((env) => {
      options.push({ value: env.id, label: env.title || t('modals.setDynamicVariable.untitledEnvironment') });
    });
    return options;
  }, [environments]);

  const findDuplicateDynamicVariable = (): DynamicVariable | null => {
    if (!selectedEnvironment) return null;

    const sanitizedName = name.trim();
    const envId = selectedEnvironment.value === ALL_ENVIRONMENTS_VALUE ? null : selectedEnvironment.value;
    const existingDynamicVariable = dynamicVariables.find((dv) => {
      if (envId !== null && dv.environmentId !== null && dv.environmentId !== envId) return false;
      return dv.key === sanitizedName;
    });

    return existingDynamicVariable || null;
  };

  const onConfirm = () => {
    const sanitizedName = name.trim();
    if (!sanitizedName) {
      setError(t('modals.setDynamicVariable.variableNameRequired'));
      return;
    }

    if (!selector) {
      setError(t('modals.setDynamicVariable.selectorRequired'));
      return;
    }

    if (!selectedEnvironment) {
      setError(t('modals.setDynamicVariable.selectEnvironmentError'));
      return;
    }

    const envId = selectedEnvironment.value === ALL_ENVIRONMENTS_VALUE ? null : selectedEnvironment.value;
    const existingDynamicVariable = findDuplicateDynamicVariable();

    if (existingDynamicVariable && !duplicateToOverwrite) {
      setDuplicateToOverwrite(existingDynamicVariable);
      return;
    }

    if (duplicateToOverwrite) {
      const otherRequestsIds = (duplicateToOverwrite.otherRequestsIds ?? []).filter(
        (id) => id !== modalState.requestId && id !== duplicateToOverwrite.requestId,
      );
      if (modalState.requestId !== duplicateToOverwrite.requestId)
        otherRequestsIds.push(duplicateToOverwrite.requestId);

      dispatch(
        environmentActions.updateDynamicVariable({
          id: duplicateToOverwrite.id,
          updates: {
            key: sanitizedName,
            selector,
            source: modalState.source,
            collectionId: modalState.collectionId,
            requestId: modalState.requestId,
            environmentId: envId,
            currentValue: modalState.initialValue || null,
            lastUpdated: modalState.initialValue ? Date.now() : null,
            otherRequestsIds,
          },
        }),
      );
    } else {
      dispatch(
        environmentActions.addDynamicVariable({
          key: sanitizedName,
          selector,
          source: modalState.source,
          collectionId: modalState.collectionId,
          requestId: modalState.requestId,
          environmentId: envId,
          initialValue: modalState.initialValue || null,
          otherRequestsIds: [],
        }),
      );
    }

    dispatch(uiActions.closeSetAsDynamicVariableModal());
  };

  return (
    <ConfirmationModal
      className="[&>div]:w-150!"
      confirmText={duplicateToOverwrite ? t('common.overwrite') : t('modals.setDynamicVariable.saveVariable')}
      title={t('modals.setDynamicVariable.title')}
      isOpen={modalState.isOpen}
      confirmType={ButtonType.PRIMARY}
      onClose={() => dispatch(uiActions.closeSetAsDynamicVariableModal())}
      onConfirm={onConfirm}
    >
      <>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text dark:text-dark-text">{t('modals.setDynamicVariable.variableName')}</label>
          <Input
            placeholder={t('modals.setDynamicVariable.variableNamePlaceholder')}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
              setDuplicateToOverwrite(null);
            }}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-text dark:text-dark-text">{t('modals.setDynamicVariable.preview')}</label>
          <div className="px-3 py-2 bg-body dark:bg-dark-body rounded-md text-sm text-text-secondary dark:text-dark-text-secondary">
            {modalState.initialValue.length > 50
              ? modalState.initialValue.substring(0, 47) + '...'
              : modalState.initialValue}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-text dark:text-dark-text">{t('modals.setDynamicVariable.environment')}</label>
          <Select
            options={environmentOptions}
            value={selectedEnvironment}
            onChange={(option) => {
              setSelectedEnvironment(option as EnvironmentOption);
              setError('');
              setDuplicateToOverwrite(null);
            }}
            placeholder={t('modals.setDynamicVariable.selectEnvironment')}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-text dark:text-dark-text">
            {t('modals.setDynamicVariable.linkedRequest')}
          </label>
          <div className="px-3 py-2 bg-body dark:bg-dark-body rounded-md text-sm text-text-secondary dark:text-dark-text-secondary">
            <span className="mr-1">📁</span>
            {modalState.collectionName} → {modalState.requestName}
          </div>
        </div>

        {error && <p className="text-xs text-button-danger m-0">{error}</p>}

        {duplicateToOverwrite && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400 m-0">
            {t('modals.setDynamicVariable.duplicateWarning')}
          </p>
        )}
      </>
    </ConfirmationModal>
  );
}
