export const getAppVersion = (): Promise<string> => window.electronAPI.getAppVersion();

export const openExternal = (url: string): void => window.electronAPI.openExternal(url);

export const getCliStatus = () => window.electronAPI.getCliStatus();

export const installCli = () => window.electronAPI.installCli();

export const uninstallCli = () => window.electronAPI.uninstallCli();
