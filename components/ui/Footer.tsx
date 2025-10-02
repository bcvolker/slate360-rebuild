

export default function Footer() {
  return (
    <footer className="w-full p-4 bg-slate-800 border-t border-slate-700 text-center text-xs">
      <p className="text-slate-200">&copy; {new Date().getFullYear()} Slate360. All Rights Reserved.</p>
    </footer>
  );
}
