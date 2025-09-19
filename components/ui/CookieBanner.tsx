'use client';
import React, { useEffect, useState } from 'react';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('slate360-cookie-consent');
    if (!consent) {
      setVisible(true);
    }
    const handleReopen = () => {
      setVisible(true);
    };
    window.addEventListener('open-cookie-banner', handleReopen);
    return () => {
      window.removeEventListener('open-cookie-banner', handleReopen);
    };
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('slate360-cookie-consent', 'accepted');
    setVisible(false);
  };

  const rejectCookies = () => {
    localStorage.setItem('slate360-cookie-consent', 'rejected');
    setVisible(false);
  };

  const openCookiePolicy = () => {
    window.dispatchEvent(new Event('open-cookies-modal'));
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 text-white p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <p className="text-sm">
        We use cookies to enhance your experience. <button onClick={openCookiePolicy} className="underline hover:text-brand-blue transition">Learn more</button>
      </p>
      <div className="flex gap-2 shrink-0">
        <button onClick={rejectCookies} className="px-4 py-2 rounded-md border border-white/40 text-sm hover:bg-white/10 transition">Reject</button>
        <button onClick={acceptCookies} className="px-4 py-2 rounded-md bg-brand-blue text-white text-sm hover:bg-brand-copper transition">Accept</button>
      </div>
    </div>
  );
}
