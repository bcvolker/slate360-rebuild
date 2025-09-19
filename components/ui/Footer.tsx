

import React from 'react';

export default function Footer() {
  return (
    <footer className="absolute bottom-0 left-0 right-0 p-2 text-center text-xs text-gray-500 bg-transparent">
      <p>&copy; {new Date().getFullYear()} Slate360. All Rights Reserved.</p>
      <div className="flex flex-wrap justify-center gap-2 mt-1">
        <a href="/about" className="hover:text-brand-blue">About</a> |
        <a href="/contact" className="hover:text-brand-blue">Contact</a> |
        <a href="/privacy" className="hover:text-brand-blue">Privacy</a> |
        <a href="/terms" className="hover:text-brand-blue">Terms</a> |
        <a href="/cookies" className="hover:text-brand-blue">Cookies</a> |
        <a href="https://twitter.com/slate360" className="hover:text-brand-copper" aria-label="Twitter">Twitter</a> |
        <a href="https://linkedin.com/company/slate360" className="hover:text-brand-copper" aria-label="LinkedIn">LinkedIn</a>
      </div>
    </footer>
  );
}
