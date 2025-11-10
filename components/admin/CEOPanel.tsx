'use client';

import { useState, useRef, useEffect } from 'react';

type MediaUpload = {
  id: string;
  file: File;
  type: 'image' | 'video' | '3d-model' | '360-photo' | '360-video' | 'vr-scene';
  preview?: string;
};

type TileContent = {
  id: string;
  title: string;
  mediaUrl?: string;
  mediaType?: string;
  description?: string;
  lastUpdated?: string;
};

export default function CEOPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [activeTab, setActiveTab] = useState<'upload' | 'manage' | 'analytics'>('upload');
  const [uploads, setUploads] = useState<MediaUpload[]>([]);
  const [tileContents, setTileContents] = useState<TileContent[]>([
    { id: 'hero', title: 'Slate360 Hero', description: 'Main landing section' },
    { id: 'bim-studio', title: 'BIM Studio', description: '3D modeling workspace' },
    { id: 'tour-builder', title: '360° Tour Builder', description: 'Immersive tours' },
    { id: 'content', title: 'Content Creation', description: 'Media production' },
    { id: 'geospatial', title: 'Geospatial & Robotics', description: 'Mapping tools' },
    { id: 'insights', title: 'Reports & Insights', description: 'Analytics dashboard' },
    { id: 'vr', title: 'VR / AR', description: 'Virtual experiences' },
    { id: 'project-hub', title: 'Project Hub', description: 'Centralized management' },
  ]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTileId, setSelectedTileId] = useState<string>('');

  // Check authentication on component mount
  useEffect(() => {
    const authToken = localStorage.getItem('slate360_ceo_auth');
    if (authToken === 'authenticated') {
      setIsAuthenticated(true);
    }

    // Listen for CEO login trigger
    const handleShowLogin = () => {
      if (!isAuthenticated) {
        setShowLogin(true);
      }
    };

    window.addEventListener('show-ceo-login', handleShowLogin);
    return () => window.removeEventListener('show-ceo-login', handleShowLogin);
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // CEO credentials check (in production, this would use secure authentication)
    if (credentials.username === 'admin' && credentials.password === 'slate360ceo2025') {
      setIsAuthenticated(true);
      localStorage.setItem('slate360_ceo_auth', 'authenticated');
      setShowLogin(false);
      setCredentials({ username: '', password: '' });
    } else {
      alert('Invalid credentials');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('slate360_ceo_auth');
    setIsOpen(false);
  };

  // Don't render anything for unauthenticated users
  if (!isAuthenticated && !showLogin) {
    return null;
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !selectedTileId) return;

    Array.from(files).forEach((file) => {
      const mediaType = getMediaTypeFromFile(file);
      const upload: MediaUpload = {
        id: `${selectedTileId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        type: mediaType,
      };

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          upload.preview = e.target?.result as string;
          setUploads(prev => [...prev, upload]);
        };
        reader.readAsDataURL(file);
      } else {
        setUploads(prev => [...prev, upload]);
      }
    });
  };

  const getMediaTypeFromFile = (file: File): MediaUpload['type'] => {
    if (file.type.startsWith('image/')) {
      if (file.name.includes('360') || file.name.includes('pano')) return '360-photo';
      return 'image';
    }
    if (file.type.startsWith('video/')) {
      if (file.name.includes('360')) return '360-video';
      return 'video';
    }
    if (file.name.endsWith('.glb') || file.name.endsWith('.gltf') || file.name.endsWith('.obj')) {
      return '3d-model';
    }
    return 'image';
  };

  const assignMediaToTile = (uploadId: string, tileId: string) => {
    const upload = uploads.find(u => u.id === uploadId);
    if (!upload) return;

    // In a real app, this would upload to your storage service
    const mockUrl = `https://cdn.slate360.com/${upload.file.name}`;
    
    setTileContents(prev => prev.map(tile => 
      tile.id === tileId 
        ? { 
            ...tile, 
            mediaUrl: mockUrl, 
            mediaType: upload.type,
            lastUpdated: new Date().toISOString()
          }
        : tile
    ));

    // Remove from uploads after assignment
    setUploads(prev => prev.filter(u => u.id !== uploadId));
  };

  const getSupportedFormats = () => {
    return [
      { type: '3D Models', formats: '.glb, .gltf, .obj, .fbx, .dae' },
      { type: '360° Photos', formats: '.jpg, .png (equirectangular)' },
      { type: '360° Videos', formats: '.mp4, .webm (360° encoded)' },
      { type: 'Regular Media', formats: '.jpg, .png, .mp4, .webm' },
      { type: 'VR Scenes', formats: '.glb, .gltf (WebXR compatible)' },
    ];
  };

  // Show login form if not authenticated but login was requested
  if (showLogin && !isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">CEO Access</h2>
            <p className="text-gray-600">Enter your credentials to access the content management panel</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-transparent"
                placeholder="Enter username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-transparent"
                placeholder="Enter password"
                required
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowLogin(false)}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#9f5f24] transition-colors"
              >
                Login
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-[#B87333] hover:bg-[#9f5f24] text-white p-4 rounded-full shadow-lg z-50 transition-colors"
        title="CEO Content Panel"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-90vh flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">CEO Content Management Panel</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-800 px-3 py-1 text-sm border border-red-300 rounded hover:bg-red-50 transition-colors"
            >
              Logout
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {(['upload', 'manage', 'analytics'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium capitalize ${
                activeTab === tab 
                  ? 'border-b-2 border-[#B87333] text-[#B87333]' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Upload Media Content</h3>
                
                {/* Tile Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Tile to Update
                  </label>
                  <select
                    value={selectedTileId}
                    onChange={(e) => setSelectedTileId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333] focus:border-transparent"
                  >
                    <option value="">Choose a tile...</option>
                    {tileContents.map(tile => (
                      <option key={tile.id} value={tile.id}>{tile.title}</option>
                    ))}
                  </select>
                </div>

                {/* Upload Area */}
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#B87333] transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Drop files here or click to upload
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports all media types: 3D models, 360° content, videos, images
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.mp4,.webm,.glb,.gltf,.obj,.fbx,.dae"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* Supported Formats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {getSupportedFormats().map((format, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-1">{format.type}</h4>
                      <p className="text-sm text-gray-600">{format.formats}</p>
                    </div>
                  ))}
                </div>

                {/* Pending Uploads */}
                {uploads.length > 0 && (
                  <div className="mt-8">
                    <h4 className="font-medium text-gray-900 mb-4">Pending Uploads ({uploads.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {uploads.map(upload => (
                        <div key={upload.id} className="bg-white border rounded-lg p-4 shadow-sm">
                          {upload.preview && (
                            <img src={upload.preview} alt="Preview" className="w-full h-32 object-cover rounded mb-3" />
                          )}
                          <div className="space-y-2">
                            <p className="font-medium text-sm truncate">{upload.file.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{upload.type}</p>
                            <select
                              onChange={(e) => e.target.value && assignMediaToTile(upload.id, e.target.value)}
                              className="w-full text-xs p-2 border rounded"
                              defaultValue=""
                            >
                              <option value="">Assign to tile...</option>
                              {tileContents.map(tile => (
                                <option key={tile.id} value={tile.id}>{tile.title}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Manage Tile Content</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tileContents.map(tile => (
                  <div key={tile.id} className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">{tile.title}</h4>
                        <p className="text-sm text-gray-600">{tile.description}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        tile.mediaUrl ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {tile.mediaUrl ? 'Has Media' : 'No Media'}
                      </span>
                    </div>
                    
                    {tile.mediaUrl && (
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Media Type:</span> {tile.mediaType}</p>
                        <p><span className="font-medium">Last Updated:</span> {
                          tile.lastUpdated ? new Date(tile.lastUpdated).toLocaleString() : 'Never'
                        }</p>
                      </div>
                    )}
                    
                    <div className="flex gap-2 mt-4">
                      <button className="flex-1 px-3 py-2 text-sm bg-[#B87333] text-white rounded hover:bg-[#9f5f24] transition-colors">
                        Update
                      </button>
                      {tile.mediaUrl && (
                        <button className="px-3 py-2 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Content Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Total Views</h4>
                  <p className="text-3xl font-bold text-blue-600">12,458</p>
                  <p className="text-sm text-blue-700 mt-1">+15% this week</p>
                </div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Engagement Rate</h4>
                  <p className="text-3xl font-bold text-green-600">68%</p>
                  <p className="text-sm text-green-700 mt-1">+8% this week</p>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2">Active Tiles</h4>
                  <p className="text-3xl font-bold text-purple-600">
                    {tileContents.filter(t => t.mediaUrl).length}/{tileContents.length}
                  </p>
                  <p className="text-sm text-purple-700 mt-1">Content loaded</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}