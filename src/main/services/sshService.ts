import { execFile, exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { KeyPairInfo } from '../../types';
import { logger } from './loggerService';
import { sshConfigManager } from './sshConfigManager';

const execFileAsync = util.promisify(execFile);
const execAsync = util.promisify(exec);

export class SSHService {
  private sshDir: string;

  constructor() {
    this.sshDir = path.join(os.homedir(), '.ssh');
  }

  /**
   * Automatically starts Windows SSH Agent service if stopped or disabled
   */
  public async ensureSshAgentRunning(): Promise<boolean> {
    if (process.platform === 'win32') {
      try {
        logger.info('Ensuring Windows SSH Agent service (ssh-agent) is active...', 'SSHService');
        await execAsync('powershell -Command "Get-Service ssh-agent | Set-Service -StartupType Automatic; Start-Service ssh-agent"');
        return true;
      } catch (err: any) {
        logger.warn(`Could not auto-start Windows ssh-agent service: ${err.message}`, 'SSHService');
      }
    }
    return false;
  }

  /**
   * Detect existing SSH keys in ~/.ssh with file creation timestamps
   */
  public listExistingKeys(): KeyPairInfo[] {
    sshConfigManager.ensureSSHDirExists();
    if (!fs.existsSync(this.sshDir)) return [];

    const files = fs.readdirSync(this.sshDir);
    const pubFiles = files.filter((f) => f.endsWith('.pub'));

    return pubFiles.map((pubFile) => {
      const baseName = pubFile.slice(0, -4);
      const pubPath = path.join(this.sshDir, pubFile);
      const privPath = path.join(this.sshDir, baseName);
      
      let comment = '';
      let keyType = 'unknown';
      let createdAtStr: string | undefined;

      try {
        const pubContent = fs.readFileSync(pubPath, 'utf-8').trim();
        const parts = pubContent.split(' ');
        if (parts.length >= 2) {
          keyType = parts[0];
          comment = parts.slice(2).join(' ');
        }
      } catch (e) {}

      try {
        const targetPath = fs.existsSync(privPath) ? privPath : pubPath;
        const stat = fs.statSync(targetPath);
        createdAtStr = (stat.birthtimeMs && stat.birthtimeMs > 0 ? stat.birthtime : stat.mtime).toISOString();
      } catch (e) {}

      return {
        name: baseName,
        privateKeyPath: privPath,
        publicKeyPath: pubPath,
        type: keyType,
        comment,
        exists: fs.existsSync(privPath),
        createdAt: createdAtStr,
      };
    });
  }

  /**
   * Generate ED25519 SSH Keypair securely and auto-add to SSH agent
   */
  public async generateEd25519Key(accountAlias: string, email: string): Promise<{ privateKeyPath: string; publicKeyPath: string }> {
    sshConfigManager.ensureSSHDirExists();
    const sanitizedAlias = accountAlias.replace(/[^a-zA-Z0-9_-]/g, '_');
    const keyFileName = `id_ed25519_${sanitizedAlias}`;
    const privPath = path.join(this.sshDir, keyFileName);
    const pubPath = `${privPath}.pub`;

    if (fs.existsSync(privPath) || fs.existsSync(pubPath)) {
      logger.info(`SSH Key already exists at ${privPath}. Skipping generation.`, 'SSHService');
      await this.addKeyToAgent(privPath).catch(() => {});
      return { privateKeyPath: privPath, publicKeyPath: pubPath };
    }

    logger.info(`Generating ED25519 SSH keypair for ${email} at ${keyFileName}...`, 'SSHService');

    try {
      await execFileAsync('ssh-keygen', [
        '-t', 'ed25519',
        '-C', email,
        '-f', privPath,
        '-N', '',
      ]);

      if (process.platform !== 'win32') {
        fs.chmodSync(privPath, 0o600);
        fs.chmodSync(pubPath, 0o644);
      }

      logger.info(`Successfully generated SSH keypair: ${keyFileName}`, 'SSHService');
      
      // Auto-start agent & add key
      await this.addKeyToAgent(privPath).catch(() => {});

      return { privateKeyPath: privPath, publicKeyPath: pubPath };
    } catch (err: any) {
      logger.error(`Failed to generate SSH key: ${err.message}`, 'SSHService');
      throw new Error(`ssh-keygen failed: ${err.message}`);
    }
  }

  /**
   * Helper to resolve paths starting with '~' to absolute OS user homedir paths
   */
  private resolvePath(targetPath: string): string {
    if (!targetPath) return '';
    if (targetPath.startsWith('~')) {
      return path.join(os.homedir(), targetPath.slice(1).replace(/^[/\\]/, ''));
    }
    return path.normalize(targetPath);
  }

  /**
   * Delete an SSH keypair (both private key and public key) safely
   */
  public async deleteSshKey(privateKeyPath: string): Promise<boolean> {
    const resolvedPriv = this.resolvePath(privateKeyPath);
    const pubPath = `${resolvedPriv}.pub`;
    logger.info(`Deleting SSH Keypair: ${resolvedPriv}`, 'SSHService');

    try {
      await execFileAsync('ssh-add', ['-d', resolvedPriv]).catch(() => {});
    } catch (e) {}

    let deleted = false;
    if (fs.existsSync(resolvedPriv)) {
      fs.unlinkSync(resolvedPriv);
      deleted = true;
    }
    if (fs.existsSync(pubPath)) {
      fs.unlinkSync(pubPath);
      deleted = true;
    }

    logger.info(`SSH Keypair deleted: ${resolvedPriv}`, 'SSHService');
    return deleted;
  }

  /**
   * Reads public key safely
   */
  public readPublicKey(pubPath: string): string {
    const resolvedPub = this.resolvePath(pubPath);
    if (!fs.existsSync(resolvedPub)) {
      throw new Error(`Public key file not found: ${resolvedPub}`);
    }
    return fs.readFileSync(resolvedPub, 'utf-8').trim();
  }

  /**
   * Detect SSH agent status & key count
   */
  public async checkSSHAgent(): Promise<{ running: boolean; keyCount: number; rawOutput: string }> {
    try {
      const { stdout, stderr } = await execFileAsync('ssh-add', ['-l']);
      const output = stdout || stderr;
      
      if (output.includes('The agent has no identities')) {
        return { running: true, keyCount: 0, rawOutput: output.trim() };
      }

      const lines = output.trim().split('\n').filter(Boolean);
      return { running: true, keyCount: lines.length, rawOutput: output.trim() };
    } catch (err: any) {
      // Try starting agent automatically if not running
      const started = await this.ensureSshAgentRunning();
      if (started) {
        try {
          const { stdout, stderr } = await execFileAsync('ssh-add', ['-l']);
          const output = stdout || stderr;
          const lines = output.trim().split('\n').filter(Boolean);
          return { running: true, keyCount: lines.length, rawOutput: output.trim() };
        } catch (e) {}
      }

      const msg = err.stderr || err.stdout || err.message || '';
      if (msg.includes('The agent has no identities')) {
        return { running: true, keyCount: 0, rawOutput: 'The agent has no identities.' };
      }
      return { running: false, keyCount: 0, rawOutput: 'SSH Agent is not running or unreachable.' };
    }
  }

  /**
   * Add key to SSH agent safely (auto-starts agent if stopped)
   */
  public async addKeyToAgent(privateKeyPath: string): Promise<boolean> {
    const resolvedPriv = this.resolvePath(privateKeyPath);
    if (!fs.existsSync(resolvedPriv)) {
      throw new Error(`Private key file not found at ${resolvedPriv}`);
    }

    try {
      await this.ensureSshAgentRunning().catch(() => {});
      logger.info(`Adding key ${path.basename(resolvedPriv)} to SSH agent...`, 'SSHService');
      await execFileAsync('ssh-add', [resolvedPriv]);
      return true;
    } catch (err: any) {
      logger.warn(`ssh-add failed or ssh-agent not active: ${err.message}`, 'SSHService');
      return false;
    }
  }

  /**
   * Safely test SSH connection for a specific host alias
   */
  public async testSSHConnection(hostAlias: string): Promise<{ success: boolean; message: string; username?: string }> {
    logger.info(`Testing SSH connection for Host: ${hostAlias}`, 'SSHService');

    try {
      const { stdout, stderr } = await execFileAsync('ssh', [
        '-T',
        '-o', 'StrictHostKeyChecking=accept-new',
        '-o', 'ConnectTimeout=10',
        `git@${hostAlias}`
      ]).catch((err) => {
        return { stdout: err.stdout || '', stderr: err.stderr || '' };
      });

      const combined = `${stdout} ${stderr}`;
      logger.info(`SSH test output for ${hostAlias}: ${combined.trim()}`, 'SSHService');

      if (combined.includes('Hi ') || combined.includes('successfully authenticated')) {
        const match = combined.match(/Hi\s+([a-zA-Z0-9_-]+)!/);
        const username = match ? match[1] : undefined;
        return {
          success: true,
          message: combined.trim(),
          username,
        };
      }

      if (combined.includes('Permission denied')) {
        return {
          success: false,
          message: 'Permission denied (publickey). Public key may not be added to your account.',
        };
      }

      return {
        success: combined.length > 0 && !combined.includes('Could not resolve hostname'),
        message: combined.trim() || 'No output from SSH server.',
      };
    } catch (err: any) {
      logger.error(`SSH Connection test error for ${hostAlias}: ${err.message}`, 'SSHService');
      return {
        success: false,
        message: err.message || 'Failed to connect via SSH',
      };
    }
  }
}

export const sshService = new SSHService();
