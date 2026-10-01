/**
 * Cross-browser fullscreen for the walkthrough frame (`.sw-frame`).
 *
 * Prefix order matches the platforms we care about:
 * `requestFullscreen`, `webkitRequestFullscreen` (older Android / Safari iPad),
 * `webkitRequestFullScreen`, `msRequestFullscreen` (legacy Edge), `mozRequestFullScreen`.
 * Exit and change events use the same vendor set.
 *
 * iPhone Safari does not implement the Fullscreen API for arbitrary elements.
 * `HTMLVideoElement.webkitEnterFullscreen` is also the wrong tool here: the
 * sphere is a canvas viewer, and fullscreening the source video would show the
 * raw equirectangular frame and drop the viewer, joysticks, and chrome.
 * When no prefixed request exists or the call rejects (it must run from a user
 * gesture), we apply a CSS immersive fallback: fixed to the visual viewport,
 * safe-area padding, and `overflow: hidden` on the document. That is not OS
 * fullscreen — the status bar and browser chrome can remain — but it is the
 * fullest view those WebViews allow without leaving the sphere.
 *
 * Portrait on a phone/tablet clears both the API session and the CSS fallback
 * so a rotation cannot leave a stuck overlay. Escape and `exitFullscreen`
 * clear an API session via the change events.
 */

export const FULLSCREEN_CHANGE_EVENTS = [
  "fullscreenchange",
  "webkitfullscreenchange",
  "mozfullscreenchange",
  "MSFullscreenChange",
] as const;

const REQUEST_NAMES = [
  "requestFullscreen",
  "webkitRequestFullscreen",
  "webkitRequestFullScreen",
  "msRequestFullscreen",
  "mozRequestFullScreen",
] as const;

const EXIT_NAMES = [
  "exitFullscreen",
  "webkitExitFullscreen",
  "webkitCancelFullScreen",
  "msExitFullscreen",
  "mozCancelFullScreen",
] as const;

export const IMMERSIVE_ATTR = "data-sw-immersive";
const OVERFLOW_LOCK = "data-sw-immersive-lock";

type RequestFn = () => unknown;

export type FullscreenHost = {
  requestFullscreen?: RequestFn;
  webkitRequestFullscreen?: RequestFn;
  webkitRequestFullScreen?: RequestFn;
  msRequestFullscreen?: RequestFn;
  mozRequestFullScreen?: RequestFn;
};

export type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitCurrentFullScreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: RequestFn;
  webkitCancelFullScreen?: RequestFn;
  msExitFullscreen?: RequestFn;
  mozCancelFullScreen?: RequestFn;
};

type OverflowHost = {
  style: { overflow: string };
  hasAttribute: (name: string) => boolean;
  getAttribute: (name: string) => string | null;
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
};

export type ImmersiveMode = "api" | "pseudo";

function firstBound(target: object, names: readonly string[]): RequestFn | null {
  const host = target as Record<string, unknown>;
  for (const name of names) {
    const fn = host[name];
    if (typeof fn === "function") return (fn as RequestFn).bind(target);
  }
  return null;
}

export function bindRequestFullscreen(el: FullscreenHost): RequestFn | null {
  return firstBound(el, REQUEST_NAMES);
}

export function bindExitFullscreen(doc: FullscreenDocument): RequestFn | null {
  return firstBound(doc, EXIT_NAMES);
}

export function readFullscreenElement(doc: Document): Element | null {
  const extra = doc as FullscreenDocument;
  const candidates = [
    doc.fullscreenElement,
    extra.webkitFullscreenElement,
    extra.webkitCurrentFullScreenElement,
    extra.mozFullScreenElement,
    extra.msFullscreenElement,
  ];
  for (const el of candidates) {
    if (el) return el;
  }
  return null;
}

export function syncVisualViewport(el: HTMLElement): void {
  if (typeof window === "undefined") return;
  const vv = window.visualViewport;
  const height = vv?.height ?? window.innerHeight;
  const offsetTop = vv?.offsetTop ?? 0;
  el.style.setProperty("--sw-vv-height", `${Math.round(height)}px`);
  el.style.setProperty("--sw-vv-offset-top", `${Math.round(offsetTop)}px`);
}

function lockOverflow(node: OverflowHost | null | undefined): void {
  if (!node || node.hasAttribute(OVERFLOW_LOCK)) return;
  node.setAttribute(OVERFLOW_LOCK, node.style.overflow);
  node.style.overflow = "hidden";
}

function restoreOverflow(node: OverflowHost | null | undefined): void {
  if (!node || !node.hasAttribute(OVERFLOW_LOCK)) return;
  node.style.overflow = node.getAttribute(OVERFLOW_LOCK) ?? "";
  node.removeAttribute(OVERFLOW_LOCK);
}

function applyPseudo(el: HTMLElement): void {
  syncVisualViewport(el);
  el.setAttribute(IMMERSIVE_ATTR, "pseudo");
  const doc = el.ownerDocument;
  lockOverflow(doc?.body);
  lockOverflow(doc?.documentElement);
}

export function clearWalkImmersive(el: HTMLElement | null): void {
  if (el) {
    el.removeAttribute(IMMERSIVE_ATTR);
    el.style.removeProperty("--sw-vv-height");
    el.style.removeProperty("--sw-vv-offset-top");
  }
  const doc = el?.ownerDocument ?? (typeof document !== "undefined" ? document : null);
  restoreOverflow(doc?.body);
  restoreOverflow(doc?.documentElement);
}

export function isWalkImmersive(el: HTMLElement | null, doc: Document = document): boolean {
  if (!el) return false;
  if (readFullscreenElement(doc) === el) return true;
  const mode = el.getAttribute(IMMERSIVE_ATTR);
  return mode === "pseudo" || mode === "api";
}

/** Call from a user gesture. Resolves to the mode actually applied. */
export function enterWalkImmersive(el: HTMLElement): Promise<ImmersiveMode> {
  syncVisualViewport(el);
  const req = bindRequestFullscreen(el);
  if (!req) {
    applyPseudo(el);
    return Promise.resolve("pseudo");
  }
  try {
    const result = req();
    if (result && typeof (result as Promise<void>).then === "function") {
      return (result as Promise<void>).then(
        () => {
          el.setAttribute(IMMERSIVE_ATTR, "api");
          return "api" as const;
        },
        () => {
          applyPseudo(el);
          return "pseudo" as const;
        },
      );
    }
    el.setAttribute(IMMERSIVE_ATTR, "api");
    return Promise.resolve("api");
  } catch {
    applyPseudo(el);
    return Promise.resolve("pseudo");
  }
}

export function leaveWalkImmersive(el: HTMLElement | null, doc: Document = document): Promise<void> {
  const active = readFullscreenElement(doc);
  const exit = active ? bindExitFullscreen(doc as FullscreenDocument) : null;
  const finish = () => {
    clearWalkImmersive(el);
  };
  if (!exit) {
    finish();
    return Promise.resolve();
  }
  try {
    const result = exit();
    if (result && typeof (result as Promise<void>).then === "function") {
      return (result as Promise<void>).then(finish, finish);
    }
  } catch {
    /* still clear the CSS fallback */
  }
  finish();
  return Promise.resolve();
}

/** API fullscreen ended (Escape, browser UI). Does not clear an intentional CSS fallback. */
export function syncImmersiveApiExit(el: HTMLElement | null, doc: Document = document): void {
  if (!el || readFullscreenElement(doc)) return;
  if (el.getAttribute(IMMERSIVE_ATTR) === "api") clearWalkImmersive(el);
}

export function subscribeFullscreenChange(doc: Document, onChange: () => void): () => void {
  for (const name of FULLSCREEN_CHANGE_EVENTS) doc.addEventListener(name, onChange);
  return () => {
    for (const name of FULLSCREEN_CHANGE_EVENTS) doc.removeEventListener(name, onChange);
  };
}
