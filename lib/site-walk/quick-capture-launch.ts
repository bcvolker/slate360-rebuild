"use client";

import { createStore, del, get, set } from "idb-keyval";
import { createOfflineId } from "./offline-db";

export type QuickCaptureLaunch = {
  id: string;
  file: File;
  createdAt: number;
};

const launchStore = createStore("slate360-site-walk-launch", "quick_capture_files");

export async function saveQuickCaptureLaunch(file: File) {
  const id = createOfflineId("launch");
  await set(id, { id, file, createdAt: Date.now() }, launchStore);
  return id;
}

export async function readQuickCaptureLaunch(id: string) {
  return get<QuickCaptureLaunch>(id, launchStore);
}

export async function removeQuickCaptureLaunch(id: string) {
  await del(id, launchStore);
}
