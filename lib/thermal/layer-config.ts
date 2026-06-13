/** Share layer_config helpers — optional partial capture scoping for deliverables. */

export function filterCapturesByLayerConfig<T extends { id: string }>(
  captures: T[],
  layerConfig: Record<string, unknown>,
): T[] {
  const raw = layerConfig.capture_ids;
  if (!Array.isArray(raw) || !raw.length) return captures;
  const allowed = new Set(raw.filter((id): id is string => typeof id === "string"));
  if (!allowed.size) return captures;
  return captures.filter((capture) => allowed.has(capture.id));
}

export function captureAllowedByLayerConfig(
  captureId: string,
  layerConfig: Record<string, unknown>,
): boolean {
  const raw = layerConfig.capture_ids;
  if (!Array.isArray(raw) || !raw.length) return true;
  return raw.some((id) => typeof id === "string" && id === captureId);
}
