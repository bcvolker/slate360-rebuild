'use client';

import { useState, useRef } from 'react';

type MediaType = '3d-model' | '360-photo' | '360-video' | 'video' | 'image' | 'bim-model' | 'vr-scene';

type Props = { 
  id: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  title?: string;
  thumbnail?: boolean;
};

export default function MediaViewer({ id, mediaUrl, mediaType, title, thumbnail = false }: Props) {
  // removed unused isLoading and error state (placeholders)
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
    const heading = title ?? content.title;

    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-theme-surface text-center p-8 border border-theme-border/40">
        <div className="text-6xl mb-4">{content.icon}</div>
        <h3 className="text-lg font-semibold text-white/90 mb-1">{heading}</h3>
        <p className="text-white/70 mb-6 max-w-md leading-relaxed">{content.description}</p>
        <div className="inline-flex items-center gap-2 text-xs text-white/80 bg-theme-accent/10 border border-theme-accent/20 rounded-full px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Content Coming Soon</span>
        </div>
      </div>
    );
  };

  const render3DViewer = () => (
    <div className="w-full h-full relative bg-theme-surface flex items-center justify-center">
      <div className="absolute inset-4 border-2 border-dashed border-theme-borderStrong/60 rounded-lg flex flex-col items-center justify-center">
        <div className="text-4xl mb-4">🏗️</div>
        <div className="text-white text-lg font-medium mb-2">3D Model Viewer</div>
        <div className="text-theme-soft text-sm text-center mb-4">
          • Rotate, zoom, and pan<br/>
          • Measurement tools<br/>
          • Annotations and markups
        </div>
      </div>
      {renderViewerControls('3D Model')}
    </div>
  );

  const render360Viewer = () => (
    <div className="w-full h-full relative bg-theme-surface flex items-center justify-center">
      <div className="absolute inset-4 border-2 border-dashed border-theme-borderStrong/60 rounded-lg flex flex-col items-center justify-center">
        <div className="text-4xl mb-4">🌐</div>
        <div className="text-white text-lg font-medium mb-2">360° Viewer</div>
        <div className="text-theme-soft text-sm text-center mb-4">
          • Drag to look around<br/>
          • Hotspots and navigation<br/>
          • VR mode compatible
        </div>
      </div>
      {renderViewerControls('360° View')}
    </div>
  );

  const renderVideoViewer = () => (
    <div className="w-full h-full relative bg-theme-surface flex items-center justify-center">
      <div className="absolute inset-4 border-2 border-dashed border-theme-borderStrong/60 rounded-lg flex flex-col items-center justify-center">
        <div className="text-4xl mb-4">🎬</div>
        <div className="text-white text-lg font-medium mb-2">Video Player</div>
        <div className="text-theme-soft text-sm text-center mb-4">
          • Timeline scrubbing<br/>
          • Playback controls<br/>
          • Annotations support
        </div>
      </div>
      {renderViewerControls('Video')}
    </div>
  );

  const renderVRViewer = () => (
    <div className="w-full h-full relative bg-gradient-to-b from-theme-accentSecondary/30 via-theme-accent/40 to-theme-accent flex items-center justify-center">
      <div className="absolute inset-4 border-2 border-dashed border-theme-accent/50 rounded-lg flex flex-col items-center justify-center">
        <div className="text-4xl mb-4">🥽</div>
        <div className="text-white text-lg font-medium mb-2">VR Experience</div>
        <div className="text-theme-muted text-sm text-center mb-4">
          • WebXR compatible<br/>
          • Multi-user sessions<br/>
          • Immersive walkthroughs
        </div>
      </div>
      {renderViewerControls('VR Scene')}
    </div>
  );

  const renderImageViewer = () => (
    <div className="w-full h-full relative bg-theme-surfaceAlt flex items-center justify-center">
      <div className="text-theme-soft">
        <div className="text-4xl mb-4 text-center">🖼️</div>
        <div>Image Viewer Ready</div>
      </div>
      {renderViewerControls('Image')}
    </div>
  );

  const renderViewerControls = (viewerType: string) => (
    <div className="absolute bottom-4 left-4 right-4">
      <div className="bg-theme-overlay/70 backdrop-blur-sm rounded-lg p-3 flex items-center justify-between border border-theme-border/40">
        <div className="flex items-center gap-3">
          <span className="text-white text-sm font-medium">{viewerType}</span>
          <div className="flex gap-2">
            <button className="w-8 h-8 bg-white/15 hover:bg-white/25 rounded flex items-center justify-center text-white transition-colors">
              ⚙️
            </button>
            <button className="w-8 h-8 bg-white/15 hover:bg-white/25 rounded flex items-center justify-center text-white transition-colors">
              📐
            </button>
            <button className="w-8 h-8 bg-white/15 hover:bg-white/25 rounded flex items-center justify-center text-white transition-colors">
              💬
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="w-8 h-8 bg-white/15 hover:bg-white/25 rounded flex items-center justify-center text-white transition-colors"
          >
            ⛶
          </button>
          <button className="w-8 h-8 bg-white/15 hover:bg-white/25 rounded flex items-center justify-center text-white transition-colors">
            ⋮
          </button>
        </div>
      </div>
    </div>
  );

  // Thumbnail version for mobile
  if (thumbnail) {
    const icon = (() => {
      switch (finalMediaType) {
        case '3d-model': return '🏗️';
        case '360-photo': return '📷';
        case '360-video': return '🎥';
        case 'video': return '🎬';
        case 'bim-model': return '🏢';
        case 'vr-scene': return '🥽';
        default: return '🖼️';
      }
    })();

    return (
      <div className="w-full h-full bg-theme-accent/20 flex items-center justify-center text-white text-lg hover:scale-105 transition-transform cursor-pointer">
        {icon}
      </div>
    );
  }

  return (
    <div 
      ref={viewerRef}
      className={`MediaViewer w-full h-full rounded-lg overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
      aria-label={title || `${finalMediaType} viewer`}
    >
      {renderViewer()}
    </div>
  );
}
