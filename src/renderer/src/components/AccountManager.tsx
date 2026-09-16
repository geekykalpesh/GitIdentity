import React, { useState, useEffect } from 'react';
import { Account } from '../../types';
import { api } from '../utils/api';
import { copyToClipboard } from '../utils/clipboard';
import { Users, Plus, CheckCircle2, AlertCircle, Trash2, Key, RefreshCw, Github, ShieldAlert, X, Copy, Check, Terminal, Clock, Sparkles, HelpCircle, ExternalLink } from 'lucide-react';

interface AccountManagerProps {
  accounts: Account[];
  onAccountsChange: () => void;
}

export const AccountManager: React.FC<AccountManagerProps> = ({ accounts, onAccountsChange }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [sshHostAlias, setSshHostAlias] = useState('');
  const [repoName, setRepoName] = useState('first');
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<Record<string, boolean>>({});
  const [publicKeys, setPublicKeys] = useState<Record<string, string>>({});

  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  useEffect(() => {
    let isMounted = true;
    const loadPublicKeys = async () => {
      const keysMap: Record<string, string> = {};
      for (const acc of accounts) {
        if (acc.publicKeyPath) {
          try {
            const keyText = await api.readPublicKey(acc.publicKeyPath);
            if (keyText) {
              keysMap[acc.id] = keyText.trim();
            }
          } catch (err) {
            console.warn(`Could not load public key for account ${acc.id}`, err);
          }
        }
      }
      if (isMounted) {
        setPublicKeys(keysMap);
      }
    };
    loadPublicKeys();
    return () => {
      isMounted = false;
    };
  }, [accounts]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  const handleUsernameChange = (newVal: string) => {
    setUsername(newVal);
    const sanitized = newVal.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!sshHostAlias || sshHostAlias.startsWith('github-')) {
      setSshHostAlias(sanitized ? `github-${sanitized}` : '');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAddModal) {
        setShowAddModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal]);

  const rawAlias = sshHostAlias.trim();
  const formattedAlias = rawAlias
    ? rawAlias.startsWith('github-') ? rawAlias : `github-${rawAlias}`
    : (username.trim() ? `github-${username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')}` : 'github-alias');

  const previewUser = username.trim() || 'username';
  const cleanRepo = (repoName.trim() || 'repository').replace(/\.git$/, '');
  const previewCommand = `git remote add origin git@${formattedAlias}:${previewUser}/${cleanRepo}.git`;

  const handleCopy = async (text: string, id: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedCmd((prev) => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setCopiedCmd((prev) => ({ ...prev, [id]: false }));
      }, 2000);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const trimmedUser = username.trim();
    const trimmedEmail = email.trim();
    const finalAlias = formattedAlias;

    if (!trimmedUser || !trimmedEmail) {
      setModalError('Please enter both GitHub Username and Git Commit Email.');
      return;
    }

    setSaving(true);
    try {
      const sanitizedUser = trimmedUser.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      
      let keyPaths = { privateKeyPath: '', publicKeyPath: '' };
      try {
        keyPaths = await api.generateSshKey(finalAlias, trimmedEmail);
      } catch (keyErr: any) {
        console.warn('SSH key generation note:', keyErr.message);
      }

      const newAcc: Account = {
        id: sanitizedUser,
        name: name.trim() || `${trimmedUser} (${finalAlias})`,
        username: trimmedUser,
        email: trimmedEmail,
        provider: 'github',
        sshKeyPath: keyPaths?.privateKeyPath || `~/.ssh/id_ed25519_${finalAlias}`,
        publicKeyPath: keyPaths?.publicKeyPath || `~/.ssh/id_ed25519_${finalAlias}.pub`,
        sshHostAlias: finalAlias,
        token: token.trim() || undefined,
        status: 'unverified',
        createdAt: new Date().toISOString(),
      };

      await api.saveAccount(newAcc);
      if (keyPaths && keyPaths.privateKeyPath) {
        await api.addKeyToAgent(keyPaths.privateKeyPath);
      }

      setShowAddModal(false);
      setName('');
      setUsername('');
      setEmail('');
      setSshHostAlias('');
      setToken('');
      onAccountsChange();
    } catch (err: any) {
      setModalError(`Failed to save account: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this account configuration?')) {
      await api.deleteAccount(id);
      onAccountsChange();
    }
  };

  const handleTest = async (account: Account) => {
    setTestingId(account.id);
    const res = await api.testConnection(account);
    if (res) {
      setTestResults((prev) => ({ ...prev, [account.id]: res }));
      if (res.success && account.status !== 'connected') {
        account.status = 'connected';
        await api.saveAccount(account);
        onAccountsChange();
      }
    }
    setTestingId(null);
  };

  const [showGuide, setShowGuide] = useState(accounts.length === 0);

  return (
    <div className="space-y-6">
      {/* Apple Pro Hero Banner */}
      <div className="apple-glass p-5 px-6 rounded-3xl border border-white/10 space-y-3.5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-400 via-cyan-400 to-emerald-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-teal-500/25 border border-white/20 shrink-0">
              <Users className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-100 tracking-tight flex items-center space-x-2">
                <span>GitHub Identity Manager</span>
              </h2>
              <p className="text-xs text-slate-400/90 mt-0.5 font-medium">Add your GitHub profiles. GitIdentity automatically routes your SSH keys & repository identities!</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="apple-button-secondary px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-teal-300" />
              <span>{showGuide ? 'Hide Guide' : 'Setup Guide'}</span>
            </button>

            <button
              onClick={() => {
                setModalError(null);
                setShowAddModal(true);
              }}
              className="apple-button-primary flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add GitHub Account</span>
            </button>
          </div>
        </div>

        <div className="pt-2.5 border-t border-white/10 flex items-center space-x-2 text-xs text-slate-300 font-medium relative z-10">
          <Sparkles className="w-4 h-4 text-teal-300 shrink-0" />
          <span><strong>Pro Tip:</strong> Use the generated SSH host alias (e.g., <code className="text-teal-300 font-mono font-bold bg-white/5 px-2 py-0.5 rounded border border-white/10">git@github-kirti:user/repo.git</code>) when setting git remotes.</span>
        </div>
      </div>

      {/* 4-Step Quick Start Setup Guide Component */}
      {showGuide && (
        <div className="apple-glass p-5 rounded-3xl border border-white/10 space-y-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-500/30">
                <HelpCircle className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-100 tracking-tight">How It Works — Step-by-Step Setup Guide</h3>
                <p className="text-[11px] text-slate-400 font-medium">Follow these 4 simple steps to connect and route your GitHub accounts</p>
              </div>
            </div>
            <button
              onClick={() => setShowGuide(false)}
              className="text-slate-400 hover:text-slate-200 text-xs font-bold cursor-pointer p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 pt-3 border-t border-white/10">
            {/* Step 1 */}
            <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-white/10 space-y-2 relative">
              <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 text-xs font-extrabold flex items-center justify-center border border-teal-500/40">
                1
              </div>
              <h4 className="text-xs font-extrabold text-slate-200">1. Add Profile</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                Click <strong>"Add GitHub Account"</strong>. Enter your Name, GitHub Username, Email, and Host Alias (e.g. <code className="text-teal-300 font-mono">github-personal</code>).
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-white/10 space-y-2 relative">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-extrabold flex items-center justify-center border border-cyan-500/40">
                2
              </div>
              <h4 className="text-xs font-extrabold text-slate-200">2. Add SSH Key</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                GitIdentity generates an ED25519 keypair. Copy your Public SSH key and paste it at <button type="button" onClick={() => api.openExternal('https://github.com/settings/ssh/new')} className="text-teal-300 underline font-bold cursor-pointer">github.com/settings/ssh</button>.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-white/10 space-y-2 relative">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-extrabold flex items-center justify-center border border-emerald-500/40">
                3
              </div>
              <h4 className="text-xs font-extrabold text-slate-200">3. Test Connection</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                Click <strong>"Test Connection"</strong> on your profile card to verify OpenSSH authentication with GitHub servers.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-white/10 space-y-2 relative">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-extrabold flex items-center justify-center border border-indigo-500/40">
                4
              </div>
              <h4 className="text-xs font-extrabold text-slate-200">4. Run Commands</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                Copy pre-formatted terminal commands from your card (<code className="text-teal-300 font-mono text-[10px]">git remote add origin ...</code>) into your project folder!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Account Grid */}
      {accounts.length === 0 ? (
        <div className="apple-glass p-14 rounded-3xl text-center space-y-5 border-dashed border-slate-700/60">
          <div className="w-16 h-16 rounded-3xl bg-teal-500/15 text-teal-300 flex items-center justify-center mx-auto border border-teal-500/30 shadow-xl shadow-teal-500/10">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-200 tracking-tight">No GitHub Accounts Added Yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed font-medium">
              Click the button below to add your Personal or Work GitHub account. Your dedicated SSH keypair will be generated and configured automatically!
            </p>
          </div>
          <button
            onClick={() => {
              setModalError(null);
              setShowAddModal(true);
            }}
            className="apple-button-primary px-6 py-3 rounded-2xl text-xs font-extrabold shadow-lg cursor-pointer"
          >
            Add Your First Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accounts.map((acc) => {
            const result = testResults[acc.id];
            const isTesting = testingId === acc.id;
            const sampleCmd = `git remote add origin git@${acc.sshHostAlias}:${acc.username}/repository.git`;
            const configNameCmd = `git config user.name "${acc.username}"`;
            const configEmailCmd = `git config user.email "${acc.email}"`;
            const configBothCmd = `git config user.name "${acc.username}" && git config user.email "${acc.email}"`;
            const checkConfigCmd = `git config user.name && git config user.email`;
            const formattedCreated = formatDate(acc.createdAt);

            return (
              <div key={acc.id} className="apple-glass-card p-6 rounded-3xl flex flex-col justify-between space-y-5 relative overflow-hidden group">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center justify-center text-teal-300 font-bold shadow-md shrink-0">
                        <Github className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-100 tracking-tight leading-tight">{acc.name}</h3>
                        <p className="text-xs text-teal-400 font-mono font-bold">@{acc.username}</p>
                      </div>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold border flex items-center space-x-1.5 shadow-sm ${
                      acc.status === 'connected'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${acc.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      <span>{acc.status === 'connected' ? 'SSH Connected' : 'Unverified'}</span>
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400/90 font-semibold">Commit Email:</span>
                      <span className="font-mono text-slate-100 font-bold select-all">{acc.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400/90 font-semibold">SSH Host Alias:</span>
                      <span className="font-mono text-teal-300 bg-slate-950/80 px-2.5 py-0.5 rounded-xl border border-white/10 select-all font-bold shadow-inner text-xs">
                        {acc.sshHostAlias}
                      </span>
                    </div>
                    {formattedCreated && (
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                        <span className="text-slate-400/80 flex items-center space-x-1 font-medium">
                          <Clock className="w-3 h-3 text-teal-400" />
                          <span>Added:</span>
                        </span>
                        <span className="font-mono text-slate-300 font-semibold">{formattedCreated}</span>
                      </div>
                    )}
                  </div>

                  {/* 🔑 High-Visibility Unmistakable SSH Key Box */}
                  <div className="mt-4 p-3.5 bg-slate-950/90 rounded-2xl border border-teal-500/40 space-y-2.5 shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center space-x-2">
                        <Key className="w-4 h-4 text-teal-300 shrink-0" />
                        <span className="text-xs font-extrabold text-slate-100 tracking-tight">Public SSH Key (Paste to GitHub)</span>
                      </div>

                      <div className="flex items-center space-x-2 flex-wrap gap-1.5">
                        <button
                          onClick={() => handleCopy(publicKeys[acc.id] || '', `${acc.id}_pubkey`)}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 text-slate-950 rounded-xl text-xs font-black flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-teal-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          {copiedCmd[`${acc.id}_pubkey`] ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 stroke-[3]" />}
                          <span>{copiedCmd[`${acc.id}_pubkey`] ? 'Key Copied!' : 'Copy Public Key'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            const parentBox = e.currentTarget.closest('.space-y-2\\.5, .mt-4');
                            const textarea = parentBox?.querySelector('textarea');
                            if (textarea) {
                              textarea.focus();
                              textarea.select();
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer transition shadow-sm"
                          title="Select all text in SSH key box"
                        >
                          <span>Select All</span>
                        </button>

                        <button
                          onClick={() => api.openExternal('https://github.com/settings/ssh/new')}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer transition shadow-sm"
                          title="Open GitHub SSH Key Settings"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open GitHub ↗</span>
                        </button>
                      </div>
                    </div>

                    {/* Display Key Preview Box - Whole key completely visible */}
                    <textarea
                      readOnly
                      value={publicKeys[acc.id] || 'Loading public SSH key...'}
                      rows={3}
                      onClick={(e) => e.currentTarget.select()}
                      onFocus={(e) => e.currentTarget.select()}
                      className="w-full font-mono text-[11px] text-teal-300 bg-slate-900/95 p-3 rounded-xl border border-white/10 break-all select-all leading-relaxed shadow-inner resize-y focus:outline-none focus:border-teal-400/60 cursor-text"
                    />

                    <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-medium pt-0.5">
                      <AlertCircle className="w-3 h-3 text-teal-400 shrink-0" />
                      <span>Click inside box or click <strong>Select All</strong> to copy manually (Ctrl+C). Paste at <strong>GitHub ➔ Settings ➔ SSH keys</strong></span>
                    </div>
                  </div>

                  {/* macOS Terminal Box for Setup & Verification Commands */}
                  <div className="mt-4 bg-slate-950/90 rounded-2xl border border-white/10 overflow-hidden shadow-inner">
                    {/* Terminal Header Dots */}
                    <div className="px-3.5 py-1.5 bg-slate-900/80 border-b border-white/5 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400/80 uppercase font-bold tracking-wider">Terminal Commands</span>
                    </div>

                    <div className="p-3 space-y-2.5">
                      {/* 1. Remote URL Command */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          <span>1. Remote SSH Setup:</span>
                          <button
                            onClick={() => handleCopy(sampleCmd, `${acc.id}_remote`)}
                            className="px-2 py-0.5 bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 rounded-lg text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition"
                          >
                            {copiedCmd[`${acc.id}_remote`] ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCmd[`${acc.id}_remote`] ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </div>
                        <div className="font-mono text-xs text-teal-300 break-all select-all font-bold p-2 bg-slate-900/90 rounded-xl border border-white/5">
                          {sampleCmd}
                        </div>
                      </div>

                      {/* 2. Local Repo Git Identity Config Commands */}
                      <div className="space-y-1 pt-1.5 border-t border-white/5">
                        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          <span>2. Local Git Config:</span>
                          <button
                            onClick={() => handleCopy(configBothCmd, `${acc.id}_config`)}
                            className="px-2 py-0.5 bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 rounded-lg text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition"
                          >
                            {copiedCmd[`${acc.id}_config`] ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCmd[`${acc.id}_config`] ? 'Copied Both!' : 'Copy Both'}</span>
                          </button>
                        </div>
                        <div className="space-y-1 font-mono text-xs select-all font-bold p-2 bg-slate-900/90 rounded-xl border border-white/5">
                          <div className="text-cyan-300">{configNameCmd}</div>
                          <div className="text-cyan-300">{configEmailCmd}</div>
                        </div>
                      </div>

                      {/* 3. Check Local Config Command */}
                      <div className="space-y-1 pt-1.5 border-t border-white/5">
                        <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          <span>3. Verify Config:</span>
                          <button
                            onClick={() => handleCopy(checkConfigCmd, `${acc.id}_check`)}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 rounded-lg text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition"
                          >
                            {copiedCmd[`${acc.id}_check`] ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCmd[`${acc.id}_check`] ? 'Copied!' : 'Copy Check'}</span>
                          </button>
                        </div>
                        <div className="font-mono text-xs text-emerald-400 break-all select-all font-bold p-2 bg-slate-900/90 rounded-xl border border-white/5 flex items-center justify-between">
                          <span>{checkConfigCmd}</span>
                          <span className="text-[9px] text-slate-500 font-sans uppercase font-extrabold">Check</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {result && (
                  <div className={`p-3 rounded-2xl text-xs font-mono border shadow-inner ${
                    result.success
                      ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-950/50 border-red-500/30 text-red-300'
                  }`}>
                    {result.message}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <button
                    onClick={() => handleTest(acc)}
                    disabled={isTesting}
                    className="apple-button-secondary flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-teal-400' : ''}`} />
                    <span>{isTesting ? 'Testing SSH...' : 'Test Connection'}</span>
                  </button>

                  <button
                    onClick={() => handleDelete(acc.id)}
                    className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition cursor-pointer border border-transparent hover:border-rose-500/20"
                    title="Delete Account Configuration"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex items-center justify-center p-4 font-sans animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
        >
          <div className="apple-glass-modal w-full max-w-lg p-7 rounded-3xl space-y-5 border border-white/15 relative z-50 pointer-events-auto max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-500/30">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-100 tracking-tight">Add GitHub Account</h3>
                  <p className="text-xs text-slate-400 font-medium">Create a new SSH identity profile</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-2xl text-xs text-rose-300 font-medium shadow-inner">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Account Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Personal GitHub"
                  className="w-full px-4 py-3 bg-slate-950/80 border border-white/10 rounded-2xl text-xs text-slate-100 focus:outline-none focus:border-teal-400 cursor-text font-medium shadow-inner transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">GitHub Username *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="e.g. mahajankirti515"
                  className="w-full px-4 py-3 bg-slate-950/80 border border-white/10 rounded-2xl text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-400 cursor-text shadow-inner transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Custom Host Alias *</label>
                  <input
                    type="text"
                    required
                    value={sshHostAlias}
                    onChange={(e) => setSshHostAlias(e.target.value)}
                    placeholder="github-kirti"
                    className="w-full px-4 py-3 bg-slate-950/80 border border-white/10 rounded-2xl text-xs text-teal-300 font-mono font-bold focus:outline-none focus:border-teal-400 cursor-text shadow-inner transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Sample Repo Name</label>
                  <input
                    type="text"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    placeholder="first"
                    className="w-full px-4 py-3 bg-slate-950/80 border border-white/10 rounded-2xl text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-400 cursor-text shadow-inner transition"
                  />
                </div>
              </div>

              {/* Live Git Remote Command Preview */}
              <div className="p-3.5 bg-slate-950/90 rounded-2xl border border-white/10 space-y-1.5 shadow-inner">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <span className="flex items-center space-x-1.5">
                    <Terminal className="w-3.5 h-3.5 text-teal-400" />
                    <span>Exact Remote Command You Will Use:</span>
                  </span>
                </div>
                <div className="font-mono text-xs text-teal-300 break-all select-all font-bold p-2.5 bg-slate-900/90 rounded-xl border border-white/5">
                  {previewCommand}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Git Commit Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-3 bg-slate-950/80 border border-white/10 rounded-2xl text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-400 cursor-text shadow-inner transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Personal Access Token (Optional)</label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full px-4 py-3 bg-slate-950/80 border border-white/10 rounded-2xl text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-400 cursor-text shadow-inner transition"
                />
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="apple-button-secondary flex-1 py-3 rounded-2xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="apple-button-primary flex-1 py-3 rounded-2xl text-xs font-extrabold cursor-pointer disabled:opacity-50 shadow-lg shadow-teal-500/20"
                >
                  {saving ? 'Saving Profile...' : 'Save Account & Setup Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
