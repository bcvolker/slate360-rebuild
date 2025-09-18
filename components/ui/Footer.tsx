import React from "react";

const Footer: React.FC = () => (
  <footer className="w-full py-6 text-center text-sm text-brand-gray bg-white/80 backdrop-blur-md shadow-inner mt-auto">
    <span>
      &copy; {new Date().getFullYear()} Slate360. All rights reserved.
    </span>
  </footer>
);

export default Footer;
