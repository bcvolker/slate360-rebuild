
import React from 'react';

export default function Footer() {
  return (
    <footer className="fixed bottom-0 z-10 w-full bg-black/20 p-4 text-center text-xs text-gray-400">
      <p>&copy; {new Date().getFullYear()} Slate360. All Rights Reserved. | <a href="#privacy" className="hover:text-white">Privacy Policy</a></p>
    </footer>
  );
}
