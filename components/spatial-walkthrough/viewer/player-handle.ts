import type { Viewer } from "@photo-sphere-viewer/core";
import type { VideoPlugin } from "@photo-sphere-viewer/video-plugin";
import type { WalkthroughPlayerHandle } from "./WalkthroughPlayer";

/**
 * Joystick look calls `animate`, which sets yaw/pitch immediately via
 * `viewer.rotate` so a held stick tracks the sphere. Station jumps inside
 * `seekTo` still use `viewer.animate` (2.5rpm) when a yaw and pitch are passed.
 */
export function createWalkthroughHandle(
  viewer: Viewer,
  video: HTMLVideoElement,
  videoPlugin: VideoPlugin,
  applyMarkers: (t: number) => void,
): WalkthroughPlayerHandle {
  const handle: WalkthroughPlayerHandle = {
    seekTo: (t, yaw, pitch, opts) => {
      if (opts?.pause !== false) videoPlugin.pause();
      videoPlugin.setTime(t);
      if (yaw != null && pitch != null) {
        void viewer.animate({ yaw: `${yaw}deg`, pitch: `${pitch}deg`, speed: "2.5rpm" });
      }
      applyMarkers(t);
    },
    animate: (yaw, pitch) => {
      viewer.rotate({ yaw: `${yaw}deg`, pitch: `${pitch}deg` });
    },
    getView: () => {
      const pos = viewer.getPosition();
      return {
        t: videoPlugin.getTime(),
        yaw: (pos.yaw * 180) / Math.PI,
        pitch: (pos.pitch * 180) / Math.PI,
      };
    },
    pause: () => videoPlugin.pause(),
    play: () => {
      void video.play().catch(() => undefined);
      videoPlugin.play();
    },
    setSourceMuted: (muted) => {
      video.muted = muted;
    },
    setSourceVolume: (volume) => {
      video.volume = Math.min(1, Math.max(0, volume));
    },
    isPaused: () => video.paused,
    setPlaybackRate: (rate) => {
      video.playbackRate = rate;
    },
    setSphereCorrection: (c) => {
      viewer.setOptions({ sphereCorrection: c });
    },
    viewerToSphere: (x, y) => {
      try {
        const pos = viewer.dataHelper.viewerCoordsToSphericalCoords({ x, y });
        return { yaw: (pos.yaw * 180) / Math.PI, pitch: (pos.pitch * 180) / Math.PI };
      } catch {
        return null;
      }
    },
    zoomBy: (delta) => {
      viewer.zoom(Math.min(100, Math.max(0, viewer.getZoomLevel() + delta)));
    },
  };
  return handle;
}
