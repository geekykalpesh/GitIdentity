import { api } from './api';

/**
 * Bulletproof cross-platform clipboard writer with 3-tier fallback strategy:
 * 1. Native Electron IPC Clipboard (never fails, bypasses OS browser focus restrictions)
 * 2. Navigator Clipboard API (Standard Async Web API)
 * 3. Document execCommand('copy') with transient hidden textarea
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try native Electron IPC clipboard
  try {
    const success = await api.copyToClipboard(text);
    if (success) return true;
  } catch (err) {
    // API not available or fallback required
  }

  // 2. Try Web Navigator Clipboard API
  try {
    if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    // Navigator clipboard restricted or failed
  }

  // 3. Dynamic Textarea Fallback (works in all web views)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('[GitIdentity] All clipboard copy strategies failed:', err);
    return false;
  }
}
