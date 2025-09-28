'use client';
import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  label?: string;
}

export default function Modal({ open, onClose, children, label = 'Dialog' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-label={label}
        className="relative z-10 w-[95vw] max-w-5xl max-h-[90vh] overflow-auto rounded-2xl bg-white p-4 shadow-xl"
      >
        <button onClick={onClose} className="absolute right-3 top-3 rounded-md border px-2 py-1 text-sm">
          Close
        </button>
        {children}
      </div>
    </div>
  );
}