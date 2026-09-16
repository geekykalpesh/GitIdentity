import { ipcMain, dialog, shell, clipboard } from 'electron';
import { systemService } from './services/systemService';
import { sshService } from './services/sshService';
import { sshConfigManager } from './services/sshConfigManager';
import { secureStorage } from './services/secureStorage';
import { repoService } from './services/repoService';
import { hookInstaller } from './services/hookInstaller';
import { gitHubProvider } from './services/providers/githubProvider';
import { logger } from './services/loggerService';
import { Account, Repository } from '../types';

export function registerIpcHandlers(): void {
  logger.info('Registering IPC Handlers...', 'MainProcess');

  // System status
  ipcMain.handle('system:get-status', async () => {
    return await systemService.getSystemStatus();
  });

  ipcMain.handle('system:unset-global-identity', async () => {
    return await systemService.unsetGlobalGitIdentity();
  });

  ipcMain.handle('system:copy-to-clipboard', async (_, text: string) => {
    clipboard.writeText(text || '');
    return true;
  });

  // Accounts
  ipcMain.handle('accounts:get-all', async () => {
    return secureStorage.getAccounts();
  });

  ipcMain.handle('accounts:save', async (_, account: Account) => {
    secureStorage.saveAccount(account);
    const accounts = secureStorage.getAccounts();
    sshConfigManager.syncAccounts(accounts);
    await repoService.autoScanSystemRepositories();
    return accounts;
  });

  ipcMain.handle('accounts:delete', async (_, accountId: string) => {
    secureStorage.deleteAccount(accountId);
    const accounts = secureStorage.getAccounts();
    sshConfigManager.syncAccounts(accounts);
    return accounts;
  });

  ipcMain.handle('accounts:test-connection', async (_, account: Account) => {
    return await gitHubProvider.testConnection(account);
  });

  // SSH Management
  ipcMain.handle('ssh:generate-key', async (_, { alias, email }: { alias: string; email: string }) => {
    return await sshService.generateEd25519Key(alias, email);
  });

  ipcMain.handle('ssh:delete-key', async (_, privPath: string) => {
    return await sshService.deleteSshKey(privPath);
  });

  ipcMain.handle('ssh:list-keys', async () => {
    return sshService.listExistingKeys();
  });

  ipcMain.handle('ssh:read-public-key', async (_, pubPath: string) => {
    return sshService.readPublicKey(pubPath);
  });

  ipcMain.handle('ssh:add-to-agent', async (_, privPath: string) => {
    return await sshService.addKeyToAgent(privPath);
  });

  ipcMain.handle('ssh:get-config-content', async () => {
    return sshConfigManager.readConfig();
  });

  // Repositories
  ipcMain.handle('repos:get-all', async () => {
    return await repoService.autoScanSystemRepositories();
  });

  ipcMain.handle('repos:auto-scan', async () => {
    return await repoService.autoScanSystemRepositories();
  });

  ipcMain.handle('repos:inspect', async (_, repoPath: string) => {
    const accounts = secureStorage.getAccounts();
    const repo = await repoService.inspectRepo(repoPath, accounts);
    secureStorage.saveRepository(repo);
    return repo;
  });

  ipcMain.handle('repos:switch-identity', async (_, { repoPath, account }: { repoPath: string; account: Account }) => {
    return await repoService.switchAccountIdentity(repoPath, account);
  });

  ipcMain.handle('repos:set-custom-identity', async (_, { repoPath, name, email }: { repoPath: string; name: string; email: string }) => {
    return await repoService.setCustomLocalIdentity(repoPath, name, email);
  });

  ipcMain.handle('repos:unset-local-identity', async (_, repoPath: string) => {
    return await repoService.unsetLocalIdentity(repoPath);
  });

  ipcMain.handle('repos:set-remote', async (_, { repoPath, account, rawUrl }: { repoPath: string; account: Account; rawUrl: string }) => {
    return await repoService.setRepoRemoteUrl(repoPath, account, rawUrl);
  });

  ipcMain.handle('repos:init-new-folder', async (_, { destinationDir, folderName, account, rawUrl }: { destinationDir: string; folderName: string; account: Account; rawUrl: string }) => {
    return await repoService.initNewRepoWithRemote(destinationDir, folderName, account, rawUrl);
  });

  ipcMain.handle('repos:push', async (_, { repoPath, branchName }: { repoPath: string; branchName?: string }) => {
    return await repoService.pushToRemote(repoPath, branchName);
  });

  ipcMain.handle('repos:clone', async (_, { account, owner, repo, destinationDir }: { account: Account; owner: string; repo: string; destinationDir: string }) => {
    return await repoService.cloneRepo(account, owner, repo, destinationDir);
  });

  ipcMain.handle('repos:fetch-remote-list', async (_, account: Account) => {
    return await gitHubProvider.getRepositories(account);
  });

  ipcMain.handle('repos:create-remote', async (_, { account, repoName, isPrivate }: { account: Account; repoName: string; isPrivate: boolean }) => {
    return await gitHubProvider.createRepository(account, repoName, isPrivate);
  });

  ipcMain.handle('repos:remove-saved', async (_, repoPath: string) => {
    secureStorage.removeRepository(repoPath);
    return secureStorage.getRepositories();
  });

  // Git Hooks
  ipcMain.handle('hooks:install', async (_, { repoPath, account }: { repoPath: string; account: Account }) => {
    hookInstaller.installHook(repoPath, account);
    const accounts = secureStorage.getAccounts();
    const updated = await repoService.inspectRepo(repoPath, accounts);
    secureStorage.saveRepository(updated);
    return updated;
  });

  ipcMain.handle('hooks:remove', async (_, repoPath: string) => {
    hookInstaller.removeHook(repoPath);
    const accounts = secureStorage.getAccounts();
    const updated = await repoService.inspectRepo(repoPath, accounts);
    secureStorage.saveRepository(updated);
    return updated;
  });

  // Settings & Logs
  ipcMain.handle('logs:get-all', async () => {
    return logger.getLogs();
  });

  ipcMain.handle('settings:get', async () => {
    return secureStorage.getSettings();
  });

  ipcMain.handle('settings:update', async (_, partial: any) => {
    secureStorage.updateSettings(partial);
    return secureStorage.getSettings();
  });

  // Dialog & OS
  ipcMain.handle('dialog:open-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('shell:open-external', async (_, url: string) => {
    if (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('mailto:')) {
      await shell.openExternal(url);
    }
  });

  ipcMain.handle('shell:open-path', async (_, folderPath: string) => {
    await shell.openPath(folderPath);
  });
}
