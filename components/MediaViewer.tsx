'use client';

import { useState, useRef, useEffect } from 'react';

type MediaType = '3d-model' | '360-photo' | '360-video' | 'video' | 'image' | 'bim-model' | 'vr-scene';

type Props = { 
  id: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  title?: string;
  thumbnail?: boolean;
};

export default function MediaViewer({ id, mediaUrl, mediaType, title, thumbnail = false }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Determine media type based on ID if not provided
  const getMediaTypeFromId = (id: string): MediaType => {
    if (id === 'hero' || id === 'bim-studio') return 'bim-model';
    if (id === 'tour-builder' || id === 'tours') return '360-photo';
    if (id === 'content') return 'video';
    if (id === 'vr') return 'vr-scene';
    return 'image';
  };

  const finalMediaType = mediaType || getMediaTypeFromId(id);

  const renderViewer = () => {
    if (!mediaUrl) {
      return renderPlaceholder();
    }

    switch (finalMediaType) {
      case '3d-model':
      case 'bim-model':
        return render3DViewer();
      case '360-photo':
      case '360-video':
        return render360Viewer();
      case 'video':
        return renderVideoViewer();
      case 'vr-scene':
        return renderVRViewer();
      default:
        return renderImageViewer();
    }
  };

  const renderPlaceholder = () => {
    const getPlaceholderContent = () => {
      switch (finalMediaType) {
        case '3d-model':
        case 'bim-model':
          return {
            icon: '🏗️',
            title: '3D Model Viewer',
            description: 'Interactive 3D models with measurement tools, annotations, and collaboration features'
          };
        case '360-photo':
        case '360-video':
          return {
            icon: '🌐',
            title: '360° Experience',
            description: 'Immersive 360° photos and videos with hotspots and navigation controls'
          };
        case 'video':
          return {
            icon: '🎬',
            title: 'Video Player',
            description: 'High-quality video playback with timeline controls and annotations'
          };
        case 'vr-scene':
          return {
            icon: '🥽',
            title: 'VR Experience',
            description: 'Virtual reality scenes compatible with WebXR and VR headsets'
          };
        default:
          return {
            icon: '🖼️',
            title: 'Media Viewer',
            description: 'Interactive media viewing with zoom, pan, and annotation tools'
          };
      }
    };

    const content = getPlaceholderContent();

    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-center p-8">
        <div className="text-6xl mb-4">{content.icon}</div>
        <h3 className="text-xl font-semibold text-slate-700 mb-2">{content.title}</h3>
        <p className="text-slate-500 mb-6 max-w-md leading-relaxed">{content.description}</p>
        <div className="flex gap-2 text-xs text-slate-400">
          <span className="px-2 py-1 bg-white rounded border">Dynamic Content</span>
          <span className="px-2 py-1 bg-white rounded border">Multi-format Support</span>
          <span className="px-2 py-1 bg-white rounded border">Interactive Controls</span>
        </div>
      </div>
    );
  };

  const render3DViewer = () => (
    <div className="w-full h-full relative bg-slate-900 flex items-center justify-center">
      <div className="absolute inset-4 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center">
        <div className="text-4xl mb-4">🏗️</div>
        <div className="text-white text-lg font-medium mb-2">3D Model Viewer</div>
        <div className="text-slate-400 text-sm text-center mb-4">
          • Rotate, zoom, and pan<br/>
          • Measurement tools<br/>
          • Annotations and markups
        </div>
      </div>
      {renderViewerControls('3D Model')}
    </div>
  );

  const render360Viewer = () => (
    <div className="w-full h-full relative bg-black flex items-center justify-center">
      <div className="absolute inset-4 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center">
        <div className="text-4xl mb-4">🌐</div>
        <div className="text-white text-lg font-medium mb-2">360° Viewer</div>
        <div className="text-slate-400 text-sm text-center mb-4">
          • Drag to look around<br/>
          • Hotspots and navigation<br/>
          • VR mode compatible
        </div>
      </div>
      {renderViewerControls('360° View')}
    </div>
  );

  const renderVideoViewer = () => (
    <div className="w-full h-full relative bg-black flex items-center justify-center">
      <div className="absolute inset-4 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center">
        <div className="text-4xl mb-4">🎬</div>
        <div className="text-white text-lg font-medium mb-2">Video Player</div>
        <div className="text-slate-400 text-sm text-center mb-4">
          • Timeline scrubbing<br/>
          • Playback controls<br/>
          • Annotations support
        </div>
      </div>
      {renderViewerControls('Video')}
    </div>
  );

  const renderVRViewer = () => (
    <div className="w-full h-full relative bg-gradient-to-b from-purple-900 to-blue-900 flex items-center justify-center">
      <div className="absolute inset-4 border-2 border-dashed border-purple-400 rounded-lg flex flex-col items-center justify-center">
        <div className="text-4xl mb-4">🥽</div>
        <div className="text-white text-lg font-medium mb-2">VR Experience</div>
        <div className="text-slate-300 text-sm text-center mb-4">
          • WebXR compatible<br/>
          • Multi-user sessions<br/>
          • Immersive walkthroughs
        </div>
      </div>
      {renderViewerControls('VR Scene')}
    </div>
  );

  const renderImageViewer = () => (
    <div className="w-full h-full relative bg-slate-100 flex items-center justify-center">
      <div className="text-slate-400">
        <div className="text-4xl mb-4 text-center">🖼️</div>
        <div>Image Viewer Ready</div>
      </div>
      {renderViewerControls('Image')}
    </div>
  );

  const renderViewerControls = (viewerType: string) => (
    <div className="absolute bottom-4 left-4 right-4">
      <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white text-sm font-medium">{viewerType}</span>
          <div className="flex gap-2">
            <button className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded flex items-center justify-center text-white transition-colors">
              ⚙️
            </button>
            <button className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded flex items-center justify-center text-white transition-colors">
              📐
            </button>
            <button className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded flex items-center justify-center text-white transition-colors">
              💬
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded flex items-center justify-center text-white transition-colors"
          >
            ⛶
          </button>
          <button className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded flex items-center justify-center text-white transition-colors">
            ⋮
          </button>
        </div>
      </div>
    </div>
  );

  // Thumbnail version for mobile
  if (thumbnail) {
    const content = (() => {
      switch (finalMediaType) {
        case '3d-model': return { icon: '🏗️', color: 'bg-slate-700' };
        case '360-photo': return { icon: '📷', color: 'bg-blue-600' };
        case '360-video': return { icon: '🎥', color: 'bg-red-600' };
        case 'video': return { icon: '🎬', color: 'bg-purple-600' };
        case 'bim-model': return { icon: '🏢', color: 'bg-green-600' };
        case 'vr-scene': return { icon: '🥽', color: 'bg-indigo-600' };
        default: return { icon: '🖼️', color: 'bg-gray-600' };
      }
    })();

    return (
      <div className={`w-full h-full ${content.color} flex items-center justify-center text-white text-lg hover:scale-105 transition-transform cursor-pointer`}>
        {content.icon}
      </div>
    );
  }

  return (
    <div 
      ref={viewerRef}
      className={`w-full h-full rounded-lg overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
    >
      {renderViewer()}
    </div>
  );
}
