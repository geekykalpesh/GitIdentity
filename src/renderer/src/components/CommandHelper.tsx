import { Account } from '../../types';
import { Terminal, Copy, Check, Sparkles, Code, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';
import { copyToClipboard } from '../utils/clipboard';

interface CommandHelperProps {
  accounts: Account[];
}

export const CommandHelper: React.FC<CommandHelperProps> = ({ accounts }) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [repoPath, setRepoPath] = useState('username/repository.git');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const activeAccount = accounts.find((a) => a.id === selectedAccountId);

  const cleanPath = repoPath.replace(/^https?:\/\/github\.com\//, '').replace(/^git@github\.com:/, '');
  const hostAlias = activeAccount ? activeAccount.sshHostAlias : 'github-account';
  const email = activeAccount ? activeAccount.email : 'email@example.com';
  const username = activeAccount ? activeAccount.username : 'username';

  const remoteUrl = `git@${hostAlias}:${cleanPath}`;
  const setRemoteCmd = `git remote set-url origin ${remoteUrl}`;
  const addRemoteCmd = `git remote add origin ${remoteUrl}`;
  const setIdentityCmd = `git config user.name "${username}" && git config user.email "${email}"`;
  const checkIdentityCmd = `git config user.name && git config user.email`;
  const fullSetupCmd = `git remote set-url origin ${remoteUrl} && git config user.name "${username}" && git config user.email "${email}"`;

  const handleCopy = async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedCmd(label);
      setTimeout(() => setCopiedCmd(null), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="apple-glass p-6 rounded-3xl border border-white/10 space-y-3 shadow-2xl relative overflow-hidden">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-400 via-cyan-400 to-indigo-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-teal-500/25 border border-white/20">
            <Terminal className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">Terminal Command Generator</h2>
            <p className="text-xs text-slate-400/90 font-medium mt-0.5">Generate and copy pre-formatted SSH remote & local author identity setup commands</p>
          </div>
        </div>
      </div>

      {/* Account & Repo Input Controls */}
      <div className="apple-glass p-6 rounded-3xl border border-white/10 space-y-5 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-extrabold text-slate-300 mb-1.5 uppercase tracking-wider">Select Account Profile</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950/90 border border-white/10 rounded-2xl text-xs text-slate-100 font-bold focus:outline-none focus:border-teal-400 shadow-inner"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (@{acc.username}) — Alias: {acc.sshHostAlias}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-300 mb-1.5 uppercase tracking-wider">Repository (owner/repo.git or URL)</label>
            <input
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="username/repository.git"
              className="w-full px-4 py-3 bg-slate-950/90 border border-white/10 rounded-2xl text-xs font-mono text-teal-300 font-bold focus:outline-none focus:border-teal-400 shadow-inner"
            />
          </div>
        </div>

        {/* Transformed Remote URL Card */}
        <div className="p-4 bg-slate-950/90 rounded-2xl border border-white/10 space-y-2 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
              Generated Account SSH Remote Address:
            </span>
            <button
              onClick={() => handleCopy(remoteUrl, 'remoteUrl')}
              className="px-3 py-1 bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/40 rounded-xl text-xs font-extrabold flex items-center space-x-1 transition cursor-pointer"
            >
              {copiedCmd === 'remoteUrl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCmd === 'remoteUrl' ? 'Copied URL!' : 'Copy SSH URL'}</span>
            </button>
          </div>
          <div className="font-mono text-xs text-teal-300 break-all select-all font-bold p-2.5 bg-slate-900/90 rounded-xl border border-white/5">{remoteUrl}</div>
        </div>
      </div>

      {/* Terminal Commands List */}
      <div className="space-y-4">
        <h3 className="text-sm font-extrabold text-slate-200 tracking-tight flex items-center space-x-2">
          <Terminal className="w-4.5 h-4.5 text-teal-400" />
          <span>Copy Ready Terminal Commands</span>
        </h3>

        {/* Command 1: Full Setup */}
        <div className="apple-glass-card p-5 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold text-slate-100">Full Setup (Set Remote & User Identity)</span>
              <p className="text-[11px] text-slate-400 font-medium">Updates remote origin URL, git user.name, and git user.email in one command</p>
            </div>
            <button
              onClick={() => handleCopy(fullSetupCmd, 'fullSetup')}
              className="apple-button-secondary px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1 cursor-pointer"
            >
              {copiedCmd === 'fullSetup' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCmd === 'fullSetup' ? 'Copied!' : 'Copy Command'}</span>
            </button>
          </div>
          <pre className="p-3.5 bg-slate-950/90 rounded-2xl text-xs font-mono text-teal-300 overflow-x-auto border border-white/10 shadow-inner font-bold">
            {fullSetupCmd}
          </pre>
        </div>

        {/* Command 2: Set Remote URL */}
        <div className="apple-glass-card p-5 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold text-slate-100">Set Remote URL Only</span>
              <p className="text-[11px] text-slate-400 font-medium">Replaces existing origin remote URL with account SSH host</p>
            </div>
            <button
              onClick={() => handleCopy(setRemoteCmd, 'setRemote')}
              className="apple-button-secondary px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1 cursor-pointer"
            >
              {copiedCmd === 'setRemote' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCmd === 'setRemote' ? 'Copied!' : 'Copy Command'}</span>
            </button>
          </div>
          <pre className="p-3.5 bg-slate-950/90 rounded-2xl text-xs font-mono text-slate-200 overflow-x-auto border border-white/10 shadow-inner font-bold">
            {setRemoteCmd}
          </pre>
        </div>

        {/* Command 3: Add Remote URL */}
        <div className="apple-glass-card p-5 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold text-slate-100">Add Remote URL (New Local Repo)</span>
              <p className="text-[11px] text-slate-400 font-medium">Adds origin remote URL for freshly initialized repository</p>
            </div>
            <button
              onClick={() => handleCopy(addRemoteCmd, 'addRemote')}
              className="apple-button-secondary px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1 cursor-pointer"
            >
              {copiedCmd === 'addRemote' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCmd === 'addRemote' ? 'Copied!' : 'Copy Command'}</span>
            </button>
          </div>
          <pre className="p-3.5 bg-slate-950/90 rounded-2xl text-xs font-mono text-slate-200 overflow-x-auto border border-white/10 shadow-inner font-bold">
            {addRemoteCmd}
          </pre>
        </div>

        {/* Command 4: Set Git Author Identity */}
        <div className="apple-glass-card p-5 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold text-slate-100">Set Local Git Author Name & Email</span>
              <p className="text-[11px] text-slate-400 font-medium">Configures repository local user.name and user.email</p>
            </div>
            <button
              onClick={() => handleCopy(setIdentityCmd, 'setIdentity')}
              className="apple-button-secondary px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1 cursor-pointer"
            >
              {copiedCmd === 'setIdentity' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCmd === 'setIdentity' ? 'Copied!' : 'Copy Command'}</span>
            </button>
          </div>
          <pre className="p-3.5 bg-slate-950/90 rounded-2xl text-xs font-mono text-cyan-300 overflow-x-auto border border-white/10 shadow-inner font-bold">
            {setIdentityCmd}
          </pre>
        </div>

        {/* Command 5: Check Local Repository Identity */}
        <div className="apple-glass-card p-5 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold text-slate-100">Check / Verify Local Git Identity</span>
              <p className="text-[11px] text-slate-400 font-medium">Prints the active user.name and user.email configured in the local repository</p>
            </div>
            <button
              onClick={() => handleCopy(checkIdentityCmd, 'checkIdentity')}
              className="apple-button-secondary px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1 cursor-pointer"
            >
              {copiedCmd === 'checkIdentity' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCmd === 'checkIdentity' ? 'Copied!' : 'Copy Check Command'}</span>
            </button>
          </div>
          <pre className="p-3.5 bg-slate-950/90 rounded-2xl text-xs font-mono text-emerald-300 overflow-x-auto border border-white/10 shadow-inner font-bold">
            {checkIdentityCmd}
          </pre>
        </div>
      </div>
    </div>
  );
};
