import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app confirm dialog — replaces window.confirm() so focus never leaves
 * the Electron BrowserWindow. Using window.confirm() in Electron causes the
 * native OS dialog to steal focus; after dismissal Chromium does NOT
 * re-focus the renderer, which breaks all text-input caret behaviour until
 * the user physically clicks inside the window again.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Focus cleanup helper to prevent Chromium orphan-focus caret bug on element removal
  const resetFocus = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.focus();
  };

  // Auto-focus the Cancel button when opening, and clean focus when closing
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => cancelBtnRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    } else {
      resetFocus();
    }
  }, [open]);

  // Clean focus on unmount
  useEffect(() => {
    return () => {
      resetFocus();
    };
  }, []);

  const handleConfirm = () => {
    resetFocus();
    onConfirm();
  };

  const handleCancel = () => {
    resetFocus();
    onCancel();
  };

  // Dismiss on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  if (!open) return null;

  const isRed = variant === 'danger';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
    >
      <div
        className="relative bg-olive-900 border border-gold-500/30 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-msg"
      >
        {/* Close × */}
        <button
          onClick={handleCancel}
          className="absolute top-3 right-3 p-1.5 text-olive-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon + Title */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isRed ? 'bg-rose-500/15 border border-rose-500/30' : 'bg-amber-500/15 border border-amber-500/30'}`}>
            <AlertTriangle className={`w-5 h-5 ${isRed ? 'text-rose-400' : 'text-amber-400'}`} />
          </div>
          <h3 id="confirm-dialog-title" className="text-sm font-bold text-white">
            {title}
          </h3>
        </div>

        {/* Message */}
        <p id="confirm-dialog-msg" className="text-xs text-olive-300 leading-relaxed mb-5 pl-1">
          {message}
        </p>

        {/* Action buttons */}
        <div className="flex gap-2 justify-end">
          <button
            ref={cancelBtnRef}
            onClick={handleCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-olive-800 border border-gold-500/20 text-olive-300 hover:text-white hover:border-gold-500/40 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-colors ${
              isRed
                ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/60'
                : 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-500/60'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
