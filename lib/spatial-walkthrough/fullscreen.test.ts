import { describe, expect, it } from "vitest";
import {
  FULLSCREEN_CHANGE_EVENTS,
  bindExitFullscreen,
  bindRequestFullscreen,
  clearWalkImmersive,
  enterWalkImmersive,
  leaveWalkImmersive,
  readFullscreenElement,
  subscribeFullscreenChange,
  syncImmersiveApiExit,
} from "./fullscreen";

type AttrNode = {
  style: { overflow: string };
  hasAttribute: (name: string) => boolean;
  getAttribute: (name: string) => string | null;
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
};

function overflowNode(initial = ""): AttrNode {
  const attrs = new Map<string, string>();
  return {
    style: { overflow: initial },
    hasAttribute: (name) => attrs.has(name),
    getAttribute: (name) => attrs.get(name) ?? null,
    setAttribute: (name, value) => attrs.set(name, value),
    removeAttribute: (name) => attrs.delete(name),
  };
}

function host() {
  const attrs = new Map<string, string>();
  const styleProps = new Map<string, string>();
  const body = overflowNode("auto");
  const root = overflowNode("");
  const doc = {
    fullscreenElement: null as Element | null,
    webkitFullscreenElement: null as Element | null,
    body,
    documentElement: root,
    exitFullscreen: undefined as undefined | (() => unknown),
    webkitExitFullscreen: undefined as undefined | (() => unknown),
    addEventListener: (_name: string, _fn: () => void) => undefined,
    removeEventListener: (_name: string, _fn: () => void) => undefined,
  };
  const el = {
    ownerDocument: doc,
    style: {
      setProperty: (name: string, value: string) => styleProps.set(name, value),
      removeProperty: (name: string) => styleProps.delete(name),
    },
    setAttribute: (name: string, value: string) => attrs.set(name, value),
    getAttribute: (name: string) => attrs.get(name) ?? null,
    removeAttribute: (name: string) => attrs.delete(name),
    requestFullscreen: undefined as undefined | (() => unknown),
    webkitRequestFullscreen: undefined as undefined | (() => unknown),
    webkitRequestFullScreen: undefined as undefined | (() => unknown),
    msRequestFullscreen: undefined as undefined | (() => unknown),
    mozRequestFullScreen: undefined as undefined | (() => unknown),
  };
  return { el, doc, attrs, body };
}

describe("walkthrough fullscreen", () => {
  it("lists the prefixed change events", () => {
    expect(FULLSCREEN_CHANGE_EVENTS).toEqual([
      "fullscreenchange",
      "webkitfullscreenchange",
      "mozfullscreenchange",
      "MSFullscreenChange",
    ]);
  });

  it("prefers the unprefixed request and falls through vendor methods", () => {
    const { el } = host();
    const calls: string[] = [];
    el.requestFullscreen = () => calls.push("std");
    el.webkitRequestFullscreen = () => calls.push("wk");
    bindRequestFullscreen(el)!();
    expect(calls).toEqual(["std"]);

    const webkit = host();
    webkit.el.webkitRequestFullscreen = () => calls.push("wk");
    bindRequestFullscreen(webkit.el)!();
    expect(calls).toEqual(["std", "wk"]);

    const legacy = host();
    legacy.el.msRequestFullscreen = () => calls.push("ms");
    bindRequestFullscreen(legacy.el)!();
    expect(calls).toEqual(["std", "wk", "ms"]);
  });

  it("reads webkit fullscreen when the standard element is null", () => {
    const doc = host().doc;
    const node = { tag: "frame" } as unknown as Element;
    doc.webkitFullscreenElement = node;
    expect(readFullscreenElement(doc as unknown as Document)).toBe(node);
  });

  it("uses the CSS immersive fallback when the API rejects and restores on exit", async () => {
    const { el, doc, body } = host();
    el.requestFullscreen = () => Promise.reject(new Error("gesture"));
    const mode = await enterWalkImmersive(el as unknown as HTMLElement);
    expect(mode).toBe("pseudo");
    expect(el.getAttribute("data-sw-immersive")).toBe("pseudo");
    expect(body.style.overflow).toBe("hidden");
    await leaveWalkImmersive(el as unknown as HTMLElement, doc as unknown as Document);
    expect(el.getAttribute("data-sw-immersive")).toBeNull();
    expect(body.style.overflow).toBe("auto");
  });

  it("marks an accepted API session and clears it when fullscreen ends", async () => {
    const { el, doc } = host();
    el.requestFullscreen = () => Promise.resolve();
    expect(await enterWalkImmersive(el as unknown as HTMLElement)).toBe("api");
    expect(el.getAttribute("data-sw-immersive")).toBe("api");
    syncImmersiveApiExit(el as unknown as HTMLElement, doc as unknown as Document);
    expect(el.getAttribute("data-sw-immersive")).toBeNull();
  });

  it("does not clear a CSS fallback on an API fullscreen change", () => {
    const { el, doc } = host();
    el.setAttribute("data-sw-immersive", "pseudo");
    syncImmersiveApiExit(el as unknown as HTMLElement, doc as unknown as Document);
    expect(el.getAttribute("data-sw-immersive")).toBe("pseudo");
    clearWalkImmersive(el as unknown as HTMLElement);
    expect(el.getAttribute("data-sw-immersive")).toBeNull();
  });

  it("exits through the prefixed document method", async () => {
    const { el, doc } = host();
    const calls: string[] = [];
    doc.fullscreenElement = el as unknown as Element;
    doc.webkitExitFullscreen = () => calls.push("wk-exit");
    expect(bindExitFullscreen(doc as unknown as Document)).not.toBeNull();
    doc.exitFullscreen = () => {
      calls.push("std-exit");
      doc.fullscreenElement = null;
    };
    await leaveWalkImmersive(el as unknown as HTMLElement, doc as unknown as Document);
    expect(calls[0]).toBe("std-exit");
    expect(el.getAttribute("data-sw-immersive")).toBeNull();
  });

  it("subscribes and unsubscribes every change event", () => {
    const seen: string[] = [];
    const listeners = new Map<string, () => void>();
    const doc = {
      addEventListener: (name: string, fn: () => void) => {
        seen.push(`on:${name}`);
        listeners.set(name, fn);
      },
      removeEventListener: (name: string) => {
        seen.push(`off:${name}`);
        listeners.delete(name);
      },
    };
    const detach = subscribeFullscreenChange(doc as unknown as Document, () => undefined);
    expect(seen).toEqual(FULLSCREEN_CHANGE_EVENTS.map((name) => `on:${name}`));
    detach();
    expect(listeners.size).toBe(0);
  });
});
