"use client";

import { createStore, del, get, set } from "idb-keyval";
import { createOfflineId } from "./offline-db";

export type QuickCaptureLaunch = {
  id: string;
  file: File;
  createdAt: number;
};

const launchStore = createStore("slate360-site-walk-launch", "quick_capture_files");
const memoryLaunches = new Map<string, QuickCaptureLaunch>();

export async function saveQuickCaptureLaunch(file: File) {
  const id = createOfflineId("launch");
  const launch = { id, file, createdAt: Date.now() };
  memoryLaunches.set(id, launch);
  await set(id, launch, launchStore);
  return id;
}

export async function readQuickCaptureLaunch(id: string) {
  return memoryLaunches.get(id) ?? get<QuickCaptureLaunch>(id, launchStore);
}

export async function removeQuickCaptureLaunch(id: string) {
  memoryLaunches.delete(id);
  await del(id, launchStore);
}
