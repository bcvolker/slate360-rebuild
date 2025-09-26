'use client';

import { useEffect } from 'react';
import CEOPanel from './CEOPanel';

export default function CEOPanelWrapper() {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // CEO access: Ctrl + Shift + C
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        // Trigger CEO login by dispatching a custom event
        window.dispatchEvent(new CustomEvent('show-ceo-login'));
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  return <CEOPanel />;
}