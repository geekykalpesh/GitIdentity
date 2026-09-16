import React, { useState, useEffect } from 'react';
import { LogEntry } from '../../types';
import { api } from '../utils/api';
import { copyToClipboard } from '../utils/clipboard';
import { FileText, Search, RefreshCw, ShieldCheck, Copy, Check } from 'lucide-react';

export const LogsViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  const fetchLogs = async () => {
    try {
      const fetched = await api.getLogs();
      setLogs(fetched || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter((l) => {
    const matchesSearch = l.message.toLowerCase().includes(search.toLowerCase()) ||
                          (l.category && l.category.toLowerCase().includes(search.toLowerCase()));
    const matchesLevel = filterLevel === 'all' || l.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  const handleCopyLogs = async () => {
    const text = filteredLogs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.category || 'App'}]: ${l.message}`).join('\n');
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Security & Application Logs</h2>
          <p className="text-xs text-slate-400">All logs are automatically sanitized to prevent token or key leakage</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyLogs}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Logs'}</span>
          </button>
          <button
            onClick={fetchLogs}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search log entries..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          />
        </div>

        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
        >
          <option value="all">All Levels</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
          <option value="debug">Debug</option>
        </select>
      </div>

      {/* Logs Feed */}
      <div className="glass-card p-4 rounded-2xl">
        <div className="max-h-[500px] overflow-y-auto space-y-2 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">No log entries found.</div>
          ) : (
            filteredLogs.map((log) => {
              const levelColor =
                log.level === 'error'
                  ? 'text-red-400 bg-red-950/40 border-red-500/30'
                  : log.level === 'warn'
                  ? 'text-amber-400 bg-amber-950/40 border-amber-500/30'
                  : log.level === 'debug'
                  ? 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30'
                  : 'text-slate-300 bg-slate-950/60 border-slate-800';

              return (
                <div key={log.id} className={`p-2.5 rounded-lg border flex items-start space-x-3 ${levelColor}`}>
                  <span className="text-slate-500 text-[10px] shrink-0 mt-0.5">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-900 shrink-0">
                    {log.level}
                  </span>
                  {log.category && (
                    <span className="text-teal-400 text-[11px] shrink-0">[{log.category}]</span>
                  )}
                  <span className="text-slate-200 break-all flex-1">{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
