import {
  FileText,
  FileImage,
  FileVideo,
  FileArchive,
  File,
  type LucideIcon,
} from "lucide-react";
import type { SlateDropFolderNode as FolderNode } from "@/lib/slatedrop/folderTree";

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i > 1 ? 1 : 0)} ${sizes[i]}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function getFileIcon(type: string): LucideIcon {
  switch (type) {
    case "pdf": case "doc": case "docx": case "txt": return FileText;
    case "jpg": case "jpeg": case "png": case "gif": case "tif": case "psd": return FileImage;
    case "mp4": case "mov": case "avi": return FileVideo;
    case "zip": case "rar": case "7z": return FileArchive;
    default: return File;
  }
}

export function getFileColor(type: string): string {
  switch (type) {
    case "pdf": return "#EF4444";
    case "jpg": case "jpeg": case "png": case "gif": case "tif": case "psd": return "#8B5CF6";
    case "glb": case "obj": case "stl": case "dwg": case "fbx": return "#FF4D00";
    case "mp4": case "mov": return "#3B82F6";
    case "zip": case "rar": return "#059669";
    case "las": case "laz": return "#D97706";
    default: return "#6B7280";
  }
}

export function findFolder(nodes: FolderNode[], id: string): FolderNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const c = findFolder(n.children, id);
    if (c) return c;
  }
  return null;
}

export function findFolderPath(nodes: FolderNode[], id: string, path: string[] = []): string[] | null {
  for (const n of nodes) {
    const p = [...path, n.name];
    if (n.id === id) return p;
    const c = findFolderPath(n.children, id, p);
    if (c) return c;
  }
  return null;
}

export type SandboxProject = {
  id: string;
  name: string;
  folders: Array<{ id: string; name: string; isSystem: boolean }>;
};

export function withSandboxProjects(nodes: FolderNode[], projects: SandboxProject[]): FolderNode[] {
  return nodes.map((node) => {
    if (node.id !== "projects") {
      if (node.children.length === 0) return node;
      return { ...node, children: withSandboxProjects(node.children, projects) };
    }
    const projectNodes: FolderNode[] = projects.map((project) => ({
      id: project.id,
      name: project.name,
      isSystem: false,
      parentId: "projects",
      children: project.folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        isSystem: folder.isSystem,
        parentId: project.id,
        children: [],
      })),
    }));
    return { ...node, children: projectNodes };
  });
}

export type DbFile = {
  type: "file";
  id: string;
  file_name: string;
  s3_key: string;
  file_type: string;
  size: number;
  modified: string;
  folderId: string;
  thumbnail?: string;
  locked?: boolean;
};

export type SlateDropFolder = {
  type: "folder";
  id: string;
  path: string;
  name: string;
  isSystem?: boolean;
};

export type SlateDropItem = DbFile | SlateDropFolder;
