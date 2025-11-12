export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-20 bg-slate-900 text-white flex items-center px-6">
      <div className="flex-1 flex items-center gap-4">
        <div className="w-10 h-10 bg-white rounded" />
        <span className="text-2xl font-bold">SLATE360</span>
      </div>
      <nav className="flex gap-6 text-sm">
        <a href="#slate360" className="hover:text-gray-300">Slate360</a>
        <a href="#bim" className="hover:text-gray-300">BIM Studio</a>
        <a href="#360" className="hover:text-gray-300">360 Tour</a>
        <a href="#content" className="hover:text-gray-300">Content</a>
        <a href="#geospatial" className="hover:text-gray-300">Geospatial</a>
        <a href="#analytics" className="hover:text-gray-300">Analytics</a>
        <a href="#vr" className="hover:text-gray-300">VR/AR</a>
      </nav>
    </header>
  );
}
