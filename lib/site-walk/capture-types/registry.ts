import type { CaptureTypeId, CaptureTypePlugin } from "./types";

const plugins = new Map<CaptureTypeId, CaptureTypePlugin<Record<string, unknown>>>();

export function registerCaptureType<P extends CaptureTypePlugin>(plugin: P): P {
  if (plugins.has(plugin.id)) {
    throw new Error(`Capture type already registered: ${plugin.id}`);
  }
  plugins.set(plugin.id, plugin as CaptureTypePlugin<Record<string, unknown>>);
  return plugin;
}

export function getCaptureType(id: CaptureTypeId): CaptureTypePlugin {
  const plugin = plugins.get(id);
  if (!plugin) {
    throw new Error(`Unknown capture type: ${id}`);
  }
  return plugin;
}

export function listCaptureTypes(): CaptureTypePlugin[] {
  return [...plugins.values()].sort(
    (a, b) => (a.sourcePicker?.order ?? 99) - (b.sourcePicker?.order ?? 99),
  );
}

export function hasCaptureType(id: CaptureTypeId): boolean {
  return plugins.has(id);
}
