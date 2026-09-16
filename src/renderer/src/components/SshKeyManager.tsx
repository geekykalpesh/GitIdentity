import React, { useState, useEffect } from 'react';
import { Key, Copy, Plus, FileCode, Check, ShieldCheck, RefreshCw, Cpu, Trash2, Calendar, Clock } from 'lucide-react';
import { api } from '../utils/api';
import { copyToClipboard } from '../utils/clipboard';
import { KeyPairInfo } from '../../types';

export const SshKeyManager: React.FC = () => {
  const [keys, setKeys] = useState<KeyPairInfo[]>([]);
  const [sshConfigContent, setSshConfigContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPubKey, setSelectedPubKey] = useState<string | null>(null);
  const [pubKeyText, setPubKeyText] = useState('');
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const keyList = await api.listSshKeys();
      setKeys(keyList || []);
      const config = await api.getSshConfigContent();
      setSshConfigContent(config || '');
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const handleReadPubKey = async (pubPath: string) => {
    try {
      const text = await api.readPublicKey(pubPath);
      setPubKeyText(text || '');
      setSelectedPubKey(pubPath);
    } catch (err: any) {
      alert(`Could not read public key: ${err.message}`);
    }
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(pubKeyText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddToAgent = async (privPath: string) => {
    const success = await api.addKeyToAgent(privPath);
    if (success) {
      alert(`Key added to SSH Agent successfully!`);
    } else {
      alert(`Failed to add key to SSH Agent. Ensure ssh-agent service is running.`);
    }
    loadData();
  };

  const handleDeleteKey = async (privPath: string, keyName: string) => {
    if (confirm(`Are you sure you want to permanently delete the SSH keypair '${keyName}' from ~/.ssh?`)) {
      try {
        await api.deleteSshKey(privPath);
        if (selectedPubKey && selectedPubKey.includes(keyName)) {
          setSelectedPubKey(null);
          setPubKeyText('');
        }
        loadData();
      } catch (err: any) {
        alert(`Failed to delete SSH key: ${err.message}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Apple Pro Header Banner */}
      <div className="apple-glass p-6 rounded-3xl border border-white/10 space-y-3 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 via-teal-400 to-indigo-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-cyan-500/25 border border-white/20">
              <Key className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">SSH Keypairs & Config Vault</h2>
              <p className="text-xs text-slate-400/90 font-medium mt-0.5">Inspect generated ED25519 keys, creation dates, SSH agent status, and ~/.ssh/config</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="apple-button-secondary flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-400' : ''}`} />
            <span>Sync Vault</span>
          </button>
        </div>
      </div>

      {/* Keys Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-extrabold text-slate-200 tracking-tight flex items-center space-x-2">
          <ShieldCheck className="w-4.5 h-4.5 text-teal-400" />
          <span>Active Keychain Keypairs</span>
        </h3>

        {keys.length === 0 ? (
          <div className="apple-glass p-8 rounded-3xl text-center text-xs text-slate-400 font-medium border-dashed border-slate-700/60">
            No SSH keys detected in ~/.ssh directory.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {keys.map((k, idx) => {
              const formattedCreated = formatDate(k.createdAt);

              return (
                <div key={idx} className="apple-glass-card p-5 rounded-3xl space-y-4 flex flex-col justify-between relative overflow-hidden group">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-100 font-mono tracking-tight">{k.name}</h4>
                        <p className="text-[11px] text-teal-400 font-mono font-bold mt-0.5">{k.type}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 bg-teal-500/15 text-teal-300 border border-teal-500/30 rounded-full text-[10px] font-extrabold shadow-sm">
                          ED25519
                        </span>
                        <button
                          onClick={() => handleDeleteKey(k.privateKeyPath, k.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer border border-transparent hover:border-rose-500/20"
                          title="Delete SSH Keypair"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {k.comment && (
                      <p className="text-xs text-slate-400 truncate mt-2 font-mono bg-slate-950/60 px-2.5 py-1 rounded-xl border border-white/5">
                        {k.comment}
                      </p>
                    )}

                    {/* Creation Date & Time Badge */}
                    {formattedCreated && (
                      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center space-x-1.5 text-[11px] font-mono text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span>Created: <strong className="text-slate-200 font-semibold">{formattedCreated}</strong></span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                    <button
                      onClick={() => handleReadPubKey(k.publicKeyPath)}
                      className="flex items-center space-x-1.5 text-teal-300 hover:text-teal-200 font-bold cursor-pointer transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>View Public Key</span>
                    </button>

                    <button
                      onClick={() => handleAddToAgent(k.privateKeyPath)}
                      className="apple-button-secondary px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Cpu className="w-3.5 h-3.5 text-teal-400" />
                      <span>ssh-add</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Public Key Display Modal/Box */}
      {selectedPubKey && (
        <div className="apple-glass-modal p-6 rounded-3xl space-y-3.5 border-teal-500/40 shadow-2xl animate-in fade-in">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="text-xs font-bold text-teal-300 font-mono tracking-tight truncate max-w-md">Public Key: {selectedPubKey}</h4>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  const modal = e.currentTarget.closest('.apple-glass-modal');
                  const textarea = modal?.querySelector('textarea');
                  if (textarea) {
                    textarea.focus();
                    textarea.select();
                  }
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-bold cursor-pointer transition shadow-sm"
              >
                <span>Select All</span>
              </button>
              <button
                onClick={handleCopy}
                className="apple-button-primary px-4 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Key'}</span>
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={pubKeyText}
            rows={4}
            onClick={(e) => e.currentTarget.select()}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full p-4 bg-slate-950/90 border border-white/10 rounded-2xl text-xs font-mono text-teal-200 focus:outline-none resize-y select-all shadow-inner leading-relaxed"
          />
        </div>
      )}

      {/* Managed SSH Config Viewer */}
      <div className="space-y-4">
        <h3 className="text-sm font-extrabold text-slate-200 tracking-tight flex items-center space-x-2">
          <FileCode className="w-4.5 h-4.5 text-cyan-400" />
          <span>Managed SSH Config (~/.ssh/config)</span>
        </h3>

        <div className="apple-glass p-5 rounded-3xl space-y-3 border border-white/10 shadow-xl">
          <p className="text-xs text-slate-400 font-medium">
            GitIdentity automatically maintains account host aliases within marked boundaries. Non-managed lines are preserved intact.
          </p>
          <div className="bg-slate-950/90 rounded-2xl border border-white/10 overflow-hidden shadow-inner">
            <div className="px-4 py-2.5 bg-slate-900/80 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">~/.ssh/config</span>
            </div>
            <pre className="w-full p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-60">
              {sshConfigContent || '# ~/.ssh/config is empty or not created yet.'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
