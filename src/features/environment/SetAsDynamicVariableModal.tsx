import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ButtonType } from 'src/components/buttons/Button';
import { FieldLabel } from 'src/components/inputs/FieldLabel';
import Input from 'src/components/inputs/Input';
import Select, { SelectOption } from 'src/components/inputs/Select';
import ConfirmationModal from 'src/components/modals/ConfirmationModal';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectDynamicVariables, selectEnvironments, selectSetAsDynamicVariableModal } from 'src/store/selectors';
import { environmentActions } from 'src/store/slices/environmentSlice';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { notify } from 'src/utils/toast';

const ALL_ENVIRONMENTS_VALUE = 'all';

/**
 * Only renders the form while the modal is open: its state then starts from the modal state (no reset effect showing
 * the previous values for a frame), and a closed modal doesn't re-render on every dynamic variable / environment change.
 */
export default function SetAsDynamicVariableModal() {
  const { isOpen } = useAppSelector(selectSetAsDynamicVariableModal);

  return isOpen ? <SetAsDynamicVariableForm /> : null;
}

function SetAsDynamicVariableForm() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const modalState = useAppSelector(selectSetAsDynamicVariableModal);
  const environments = useAppSelector(selectEnvironments);
  const dynamicVariables = useAppSelector(selectDynamicVariables);

  const [name, setName] = useState<string>(() => toVariableName(modalState.initialSelector));
  const [environmentId, setEnvironmentId] = useState<string>(ALL_ENVIRONMENTS_VALUE);

  const environmentOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: ALL_ENVIRONMENTS_VALUE, label: t('modals.setDynamicVariable.allEnvironments') },
      ...environments.map((env) => ({
        value: env.id,
        label: env.title || t('modals.setDynamicVariable.untitledEnvironment'),
      })),
    ],
    [environments, t],
  );

  // Falls back to "All environments" if the selected environment was deleted meanwhile
  const selectedOption = environmentOptions.find((option) => option.value === environmentId) ?? environmentOptions[0];
  const targetEnvironmentId = selectedOption.value === ALL_ENVIRONMENTS_VALUE ? null : selectedOption.value;
  const trimmedName = name.trim();

  // Derived while typing, so the warning and the "Overwrite" label are shown before saving: one click saves.
  // All variables the new one conflicts with: the same name, applying in a same environment (a global one applies in
  // every environment). Both would apply there, and the later one silently wins (see buildVariables), so all are
  // replaced. The one with the same scope comes first: it's the one kept, so no scope changes unnecessarily
  const duplicates = useMemo(
    () =>
      trimmedName
        ? dynamicVariables
            .filter(
              ({ environmentId, key }) =>
                key === trimmedName &&
                (targetEnvironmentId === null || environmentId === null || environmentId === targetEnvironmentId),
            )
            .sort(
              (a, b) =>
                Number(b.environmentId === targetEnvironmentId) - Number(a.environmentId === targetEnvironmentId),
            )
        : [],
    [dynamicVariables, targetEnvironmentId, trimmedName],
  );
  const hasDuplicates = duplicates.length > 0;

  // Where the replaced variables applied, so a scope change is visible before overwriting
  const duplicateEnvironments = [
    ...new Set(
      duplicates.map(
        ({ environmentId }) =>
          environmentOptions.find(({ value }) => value === (environmentId ?? ALL_ENVIRONMENTS_VALUE))?.label ??
          t('modals.setDynamicVariable.untitledEnvironment'),
      ),
    ),
  ];

  const onClose = () => dispatch(modalsActions.closeSetAsDynamicVariableModal());

  const onConfirm = () => {
    // Save is disabled then; also guards Enter in the name field
    if (!trimmedName) return;

    const variable = {
      key: trimmedName,
      selector: modalState.initialSelector,
      source: modalState.source,
      requestId: modalState.requestId,
      environmentId: targetEnvironmentId,
      currentValue: modalState.initialValue || null,
    };

    dispatch(
      hasDuplicates
        ? environmentActions.overwriteDynamicVariables({ ids: duplicates.map(({ id }) => id), variable })
        : environmentActions.addDynamicVariable(variable),
    );

    onClose();
    notify.success(t('common.saved'), { toastId: 'success-set-dynamic-variable' });
  };

  return (
    <ConfirmationModal
      className="[&>div]:w-150!"
      confirmDisabled={!trimmedName}
      confirmText={hasDuplicates ? t('common.overwrite') : t('common.save')}
      confirmType={ButtonType.PRIMARY}
      isOpen
      title={t('modals.setDynamicVariable.title')}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <div className="flex flex-col gap-2">
        <FieldLabel label={t('modals.setDynamicVariable.variableName')} required />
        <Input
          placeholder={t('modals.setDynamicVariable.variableNamePlaceholder')}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;

            event.preventDefault();
            onConfirm();
          }}
          autoFocus
        />
        {!trimmedName && (
          <p className="text-xs text-red-600 dark:text-red-400 m-0">
            {t('modals.setDynamicVariable.variableNameRequired')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel label={t('modals.setDynamicVariable.preview')} />
        <div
          className="px-3 py-2 bg-surface text-xs text-muted-foreground rounded truncate"
          title={modalState.initialValue}
        >
          {modalState.initialValue}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel label={t('modals.setDynamicVariable.environment')} required />
        <Select
          options={environmentOptions}
          placeholder={t('modals.setDynamicVariable.selectEnvironment')}
          value={selectedOption}
          onChange={(option) => option && setEnvironmentId(option.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel label={t('modals.setDynamicVariable.linkedRequest')} />
        <div className="flex gap-2 px-3 py-2 bg-surface text-xs text-muted-foreground rounded">
          <span>📁</span>
          {modalState.collectionName} → {modalState.requestName}
        </div>
      </div>

      {hasDuplicates && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400 m-0">
          {t('modals.setDynamicVariable.duplicateWarning')} ({duplicateEnvironments.join(', ')})
        </p>
      )}
    </ConfirmationModal>
  );
}

/**
 * Suggests a variable name from the selector: words are split on camelCase and on any other character (dots, brackets,
 * dashes, spaces), joined by "_". E.g. "data.userId" → "data_user_id", "items[0].name" → "items_0_name",
 * "X-Request-Id" → "x_request_id".
 */
function toVariableName(selector: string): string {
  return selector
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
