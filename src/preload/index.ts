import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // System
  getSystemStatus: () => ipcRenderer.invoke('system:get-status'),
  unsetGlobalGitIdentity: () => ipcRenderer.invoke('system:unset-global-identity'),
  copyToClipboard: (text: string) => ipcRenderer.invoke('system:copy-to-clipboard', text),

  // Accounts
  getAccounts: () => ipcRenderer.invoke('accounts:get-all'),
  saveAccount: (account: any) => ipcRenderer.invoke('accounts:save', account),
  deleteAccount: (id: string) => ipcRenderer.invoke('accounts:delete', id),
  testConnection: (account: any) => ipcRenderer.invoke('accounts:test-connection', account),

  // SSH
  generateSshKey: (alias: string, email: string) => ipcRenderer.invoke('ssh:generate-key', { alias, email }),
  deleteSshKey: (privPath: string) => ipcRenderer.invoke('ssh:delete-key', privPath),
  listSshKeys: () => ipcRenderer.invoke('ssh:list-keys'),
  readPublicKey: (pubPath: string) => ipcRenderer.invoke('ssh:read-public-key', pubPath),
  addKeyToAgent: (privPath: string) => ipcRenderer.invoke('ssh:add-to-agent', privPath),
  getSshConfigContent: () => ipcRenderer.invoke('ssh:get-config-content'),

  // Repositories
  getRepositories: () => ipcRenderer.invoke('repos:get-all'),
  autoScanRepos: () => ipcRenderer.invoke('repos:auto-scan'),
  inspectRepo: (repoPath: string) => ipcRenderer.invoke('repos:inspect', repoPath),
  switchAccountIdentity: (repoPath: string, account: any) => ipcRenderer.invoke('repos:switch-identity', { repoPath, account }),
  setCustomLocalIdentity: (repoPath: string, name: string, email: string) => ipcRenderer.invoke('repos:set-custom-identity', { repoPath, name, email }),
  unsetLocalIdentity: (repoPath: string) => ipcRenderer.invoke('repos:unset-local-identity', repoPath),
  setRepoRemoteUrl: (repoPath: string, account: any, rawUrl: string) => 
    ipcRenderer.invoke('repos:set-remote', { repoPath, account, rawUrl }),
  initNewRepoWithRemote: (destinationDir: string, folderName: string, account: any, rawUrl: string) =>
    ipcRenderer.invoke('repos:init-new-folder', { destinationDir, folderName, account, rawUrl }),
  pushToRemote: (repoPath: string, branchName?: string) =>
    ipcRenderer.invoke('repos:push', { repoPath, branchName }),
  cloneRepo: (account: any, owner: string, repo: string, destinationDir: string) => 
    ipcRenderer.invoke('repos:clone', { account, owner, repo, destinationDir }),
  fetchRemoteList: (account: any) => ipcRenderer.invoke('repos:fetch-remote-list', account),
  createRemoteRepo: (account: any, repoName: string, isPrivate: boolean) => 
    ipcRenderer.invoke('repos:create-remote', { account, repoName, isPrivate }),
  removeSavedRepo: (repoPath: string) => ipcRenderer.invoke('repos:remove-saved', repoPath),

  // Git Hooks
  installHook: (repoPath: string, account: any) => ipcRenderer.invoke('hooks:install', { repoPath, account }),
  removeHook: (repoPath: string) => ipcRenderer.invoke('hooks:remove', repoPath),

  // Settings & Logs
  getLogs: () => ipcRenderer.invoke('logs:get-all'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (partial: any) => ipcRenderer.invoke('settings:update', partial),

  // Dialog & OS
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:open-directory'),
  openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
  openPath: (folderPath: string) => ipcRenderer.invoke('shell:open-path', folderPath),
};

contextBridge.exposeInMainWorld('gitIdentityApi', api);

export type GitIdentityApi = typeof api;
