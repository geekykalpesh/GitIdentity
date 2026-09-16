import React, { useState, useEffect } from 'react';
import { SystemStatus, Account } from '../../types';
import { api } from '../utils/api';
import { copyToClipboard } from '../utils/clipboard';
import { 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Copy, 
  ExternalLink, 
  Key, 
  Sparkles, 
  UserPlus, 
  Check,
  Terminal
} from 'lucide-react';

interface FirstRunWizardProps {
  onFinish: () => void;
  systemStatus: SystemStatus | null;
}

export const FirstRunWizard: React.FC<FirstRunWizardProps> = ({ onFinish, systemStatus }) => {
  const [step, setStep] = useState<number>(0);
  const [accountType, setAccountType] = useState<'Personal' | 'Work'>('Personal');
  const [accountName, setAccountName] = useState('Personal GitHub');
  const [username, setUsername] = useState('mahajankirti515');
  const [email, setEmail] = useState('');
  const [sshHostAlias, setSshHostAlias] = useState('github-mahajankirti515');
  const [token, setToken] = useState('');

  const [generatedKey, setGeneratedKey] = useState<{ privPath: string; pubPath: string } | null>(null);
  const [publicKeyText, setPublicKeyText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (accountType === 'Personal' && accountName.includes('Work')) {
      setAccountName('Personal GitHub');
    } else if (accountType === 'Work' && accountName.includes('Personal')) {
      setAccountName('Work GitHub');
    }
  }, [accountType]);

  const handleUsernameChange = (val: string) => {
    setUsername(val);
    const sanitized = val.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!sshHostAlias || sshHostAlias.startsWith('github-')) {
      setSshHostAlias(sanitized ? `github-${sanitized}` : '');
    }
  };

  const previewAlias = sshHostAlias.trim() || (username.trim() ? `github-${username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')}` : 'github-alias');
  const previewUser = username.trim() || 'username';
  const previewCommand = `git remote add origin git@${previewAlias}:${previewUser}/repository.git`;

  const handleGenerateKey = async () => {
    if (!username || !email) return;
    const finalAlias = sshHostAlias.trim() || `github-${username.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
    try {
      const keys = await api.generateSshKey(finalAlias, email);
      setGeneratedKey({ privPath: keys.privateKeyPath, pubPath: keys.publicKeyPath });
      
      const pubText = await api.readPublicKey(keys.publicKeyPath);
      setPublicKeyText(pubText);

      const newAccount: Account = {
        id: username.toLowerCase(),
        name: accountName,
        username,
        email,
        provider: 'github',
        sshKeyPath: keys.privateKeyPath,
        publicKeyPath: keys.publicKeyPath,
        sshHostAlias: finalAlias,
        token: token || undefined,
        status: 'unverified',
        createdAt: new Date().toISOString(),
      };

      await api.saveAccount(newAccount);
      await api.addKeyToAgent(keys.privateKeyPath);

      setStep(4);
    } catch (err: any) {
      alert(`Key generation error: ${err.message}`);
    }
  };

  const handleCopyKey = async () => {
    if (!publicKeyText) return;
    const success = await copyToClipboard(publicKeyText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenGitHubKeys = () => {
    api.openExternal('https://github.com/settings/ssh/new');
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    const finalAlias = sshHostAlias.trim() || `github-${username.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
    const accountDraft: Account = {
      id: username.toLowerCase(),
      name: accountName,
      username,
      email,
      provider: 'github',
      sshKeyPath: generatedKey?.privPath || '',
      publicKeyPath: generatedKey?.pubPath || '',
      sshHostAlias: finalAlias,
      token: token || undefined,
      status: 'unverified',
      createdAt: new Date().toISOString(),
    };

    const res = await api.testConnection(accountDraft);
    setConnectionResult(res);
    setTestingConnection(false);

    if (res && res.success) {
      accountDraft.status = 'connected';
      await api.saveAccount(accountDraft);
    }
  };

  const handleComplete = async () => {
    await api.updateSettings({ firstRunCompleted: true });
    onFinish();
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Stepper Progress */}
      {step > 0 && (
        <div className="mb-8 flex items-center justify-between">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                step === s
                  ? 'bg-teal-500 text-slate-950 glow-primary'
                  : step > s
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-500'
              }`}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              <span className="text-xs text-slate-400 hidden sm:inline">
                {s === 1 && 'System'}
                {s === 2 && 'Account'}
                {s === 3 && 'SSH Key'}
                {s === 4 && 'Add to GitHub'}
                {s === 5 && 'Verify'}
              </span>
              {s < 5 && <div className="w-6 sm:w-12 h-0.5 bg-slate-800" />}
            </div>
          ))}
        </div>
      )}

      {/* Step 0: Welcome */}
      {step === 0 && (
        <div className="glass-card p-10 rounded-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 mx-auto flex items-center justify-center shadow-xl shadow-teal-500/20">
            <ShieldCheck className="w-10 h-10 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Welcome to GitIdentity</h1>
            <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
              Manage multiple GitHub accounts seamlessly without manually configuring SSH configs or risking wrong-account commits.
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={() => setStep(1)}
              className="px-8 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-500/25 transition transform active:scale-95 flex items-center space-x-2 mx-auto text-sm cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Checking System */}
      {step === 1 && (
        <div className="glass-card p-8 rounded-2xl space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Step 1 — Checking your system</h2>
            <p className="text-xs text-slate-400 mt-1">Verifying Git, OpenSSH, and SSH environment setup</p>
          </div>

          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between p-2">
              <span className="text-sm font-medium text-slate-300">Git Installation</span>
              {systemStatus?.git.installed ? (
                <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{systemStatus.git.version}</span>
                </div>
              ) : (
                <span className="text-red-400 text-xs font-bold">Missing</span>
              )}
            </div>

            <div className="flex items-center justify-between p-2 border-t border-slate-800/80">
              <span className="text-sm font-medium text-slate-300">OpenSSH Client</span>
              {systemStatus?.ssh.installed ? (
                <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Installed</span>
                </div>
              ) : (
                <span className="text-red-400 text-xs font-bold">Missing</span>
              )}
            </div>

            <div className="flex items-center justify-between p-2 border-t border-slate-800/80">
              <span className="text-sm font-medium text-slate-300">SSH directory (~/.ssh)</span>
              {systemStatus?.sshDir.exists ? (
                <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ready</span>
                </div>
              ) : (
                <span className="text-amber-400 text-xs font-bold">Will be created</span>
              )}
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl transition flex items-center justify-center space-x-2 text-sm cursor-pointer"
          >
            <span>Continue to Step 2</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: Add Account */}
      {step === 2 && (
        <div className="glass-card p-8 rounded-2xl space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Step 2 — Add your first GitHub account</h2>
            <p className="text-xs text-slate-400 mt-1">Select account classification and enter your custom SSH alias name</p>
          </div>

          <div className="flex space-x-3">
            {(['Personal', 'Work'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setAccountType(type)}
                className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
                  accountType === type
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>[{type}]</span>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Account Display Name</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                placeholder="e.g. Personal GitHub"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">GitHub Username *</label>
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                placeholder="mahajankirti515"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Custom SSH Host Alias *</label>
              <input
                type="text"
                value={sshHostAlias}
                onChange={(e) => setSshHostAlias(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-teal-300 font-mono font-bold focus:outline-none focus:border-teal-500"
                placeholder="github-mahajankirti515"
              />
            </div>

            {/* Live Command Preview Box */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500">
                <span className="flex items-center space-x-1">
                  <Terminal className="w-3.5 h-3.5 text-teal-400" />
                  <span>Git Remote Command Preview:</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(previewCommand);
                    setCopiedCmd(true);
                    setTimeout(() => setCopiedCmd(false), 2000);
                  }}
                  className="px-2 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
                >
                  {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCmd ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="font-mono text-xs text-teal-300 break-all select-all font-semibold">
                {previewCommand}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Git Commit Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                placeholder="mahajankirti515@gmail.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">GitHub Personal Access Token (Optional)</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                placeholder="ghp_..."
              />
            </div>
          </div>

          <button
            disabled={!username || !email}
            onClick={() => setStep(3)}
            className="w-full py-3 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition flex items-center justify-center space-x-2 text-sm cursor-pointer"
          >
            <span>Proceed to Key Generation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 3: Generate Key */}
      {step === 3 && (
        <div className="glass-card p-8 rounded-2xl space-y-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 mx-auto flex items-center justify-center border border-teal-500/20">
            <Key className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-100">Step 3 — Generate SSH Key</h2>
            <p className="text-xs text-slate-400 mt-1">
              We will generate a modern ED25519 SSH key pair dedicated to <span className="text-teal-300 font-mono">{sshHostAlias}</span>.
            </p>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-left text-xs font-mono space-y-1.5 text-slate-300">
            <div><span className="text-slate-500">Algorithm:</span> ED25519</div>
            <div><span className="text-slate-500">Key Path:</span> ~/.ssh/id_ed25519_{sshHostAlias}</div>
            <div><span className="text-slate-500">Host Alias:</span> {sshHostAlias}</div>
            <div><span className="text-slate-500">Remote Command:</span> {previewCommand}</div>
          </div>

          <button
            onClick={handleGenerateKey}
            className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg transition flex items-center justify-center space-x-2 text-sm cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>[Generate Key]</span>
          </button>
        </div>
      )}

      {/* Step 4: Add public key to GitHub */}
      {step === 4 && (
        <div className="glass-card p-8 rounded-2xl space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Step 4 — Add the public key to GitHub</h2>
            <p className="text-xs text-slate-400 mt-1">Copy the generated SSH public key and add it under your GitHub account settings.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-400">Public Key Content</label>
              <button
                type="button"
                onClick={(e) => {
                  const parent = e.currentTarget.closest('.space-y-2');
                  const textarea = parent?.querySelector('textarea');
                  if (textarea) {
                    textarea.focus();
                    textarea.select();
                  }
                }}
                className="text-[11px] font-bold text-teal-300 hover:text-teal-200 underline cursor-pointer"
              >
                Select All Text
              </button>
            </div>
            <textarea
              readOnly
              value={publicKeyText}
              rows={4}
              onClick={(e) => e.currentTarget.select()}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-teal-300 focus:outline-none select-all resize-y leading-relaxed"
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleCopyKey}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-2 border border-slate-700 cursor-pointer"
            >
              <Copy className="w-4 h-4 text-teal-400" />
              <span>{copied ? 'Copied!' : '[Copy Public Key]'}</span>
            </button>

            <button
              onClick={handleOpenGitHubKeys}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-2 border border-slate-700 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-cyan-400" />
              <span>[Open GitHub]</span>
            </button>
          </div>

          <button
            onClick={() => setStep(5)}
            className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl transition flex items-center justify-center space-x-2 text-sm cursor-pointer"
          >
            <span>Proceed to Connection Test</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 5: Test Connection */}
      {step === 5 && (
        <div className="glass-card p-8 rounded-2xl space-y-6 text-center">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Step 5 — Test connection</h2>
            <p className="text-xs text-slate-400 mt-1">Verify that SSH authentication with GitHub is functioning properly.</p>
          </div>

          {connectionResult ? (
            <div className={`p-4 rounded-xl border text-sm font-medium ${
              connectionResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              {connectionResult.success ? (
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold">✓ Connected as {username} ({sshHostAlias})</span>
                </div>
              ) : (
                <div>{connectionResult.message}</div>
              )}
            </div>
          ) : (
            <div className="py-4 text-slate-400 text-xs">
              Click test connection after saving key to GitHub.
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 border border-slate-700 cursor-pointer"
            >
              <span>{testingConnection ? 'Testing...' : 'Test SSH Connection'}</span>
            </button>

            <button
              onClick={handleComplete}
              className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold rounded-xl transition flex items-center justify-center space-x-2 text-xs shadow-lg cursor-pointer"
            >
              <span>[Finish]</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
