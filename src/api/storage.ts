import { DynamicVariable, Environment } from 'shared/types/environment';
import { HistoryEntry } from 'shared/types/history';
import { MappingsState } from 'shared/types/mappings';
import { PostmanCollection } from 'shared/types/postman';
import { SettingsState } from 'shared/types/settings';

export const loadCollection = () => window.electronAPI.loadCollection();
export const saveCollection = (collection: PostmanCollection) => window.electronAPI.saveCollection(collection);

export const loadEnvironments = () => window.electronAPI.loadEnvironments();
export const saveEnvironments = (environments: Environment[]) => window.electronAPI.saveEnvironments(environments);

export const loadDynamicVariables = () => window.electronAPI.loadDynamicVariables();
export const saveDynamicVariables = (variables: DynamicVariable[]) =>
  window.electronAPI.saveDynamicVariables(variables);

export const loadHistory = () => window.electronAPI.loadHistory();
export const saveHistory = (entries: HistoryEntry[]) => window.electronAPI.saveHistory(entries);

export const loadMappings = (): Promise<MappingsState> => window.electronAPI.loadMappings();
export const saveMappings = (mappings: MappingsState): void => window.electronAPI.saveMappings(mappings);

export const loadSettings = (): Promise<SettingsState> => window.electronAPI.loadSettings();
export const saveSettings = (settings: SettingsState): void => window.electronAPI.saveSettings(settings);
