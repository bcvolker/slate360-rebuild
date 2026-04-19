import { File, FileArchive, FileImage, FileText, FileVideo, type LucideIcon } from "lucide-react";
import type { SlateDropFolderNode as FolderNode } from "@/lib/slatedrop/folderTree";

export type SandboxProjectTree = {
  id: string;
  name: string;
  folders: Array<{
    id: string;
    name: string;
    isSystem: boolean;
  }>;
};

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i > 1 ? 1 : 0)} ${sizes[i]}`;
}

export function formatDate(dateStr: string): string {
  const dateValue = new Date(dateStr + "T12:00:00");
  return dateValue.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function getFileIcon(type: string): LucideIcon {
  switch (type) {
    case "pdf":
    case "doc":
    case "docx":
    case "txt":
      return FileText;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "tif":
    case "psd":
      return FileImage;
    case "mp4":
    case "mov":
    case "avi":
      return FileVideo;
    case "zip":
    case "rar":
    case "7z":
      return FileArchive;
    default:
      return File;
  }
}

export function getFileColor(type: string): string {
  switch (type) {
    case "pdf":
      return "#EF4444";
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "tif":
    case "psd":
      return "#8B5CF6";
    case "glb":
    case "obj":
    case "stl":
    case "dwg":
    case "fbx":
      return "#F59E0B";
    case "mp4":
    case "mov":
      return "#3B82F6";
    case "zip":
    case "rar":
      return "#059669";
    case "las":
    case "laz":
      return "#D97706";
    default:
      return "#6B7280";
  }
}

export function flattenFolders(nodes: FolderNode[], path: string[] = []): { node: FolderNode; path: string[] }[] {
  const result: { node: FolderNode; path: string[] }[] = [];
  for (const node of nodes) {
    const nextPath = [...path, node.name];
    result.push({ node, path: nextPath });
    if (node.children.length > 0) {
      result.push(...flattenFolders(node.children, nextPath));
    }
  }
  return result;
}

export function findFolder(nodes: FolderNode[], id: string): FolderNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const childMatch = findFolder(node.children, id);
    if (childMatch) return childMatch;
  }
  return null;
}

export function findFolderPath(nodes: FolderNode[], id: string, path: string[] = []): string[] | null {
  for (const node of nodes) {
    const nextPath = [...path, node.name];
    if (node.id === id) return nextPath;
    const childMatch = findFolderPath(node.children, id, nextPath);
    if (childMatch) return childMatch;
  }
  return null;
}

export function findFolderIdPath(nodes: FolderNode[], folderId: string, currentPath = ""): string | null {
  for (const node of nodes) {
    const nextPath = currentPath ? `${currentPath}/${node.id}` : node.id;
    if (node.id === folderId) return nextPath;
    const childPath = findFolderIdPath(node.children, folderId, nextPath);
    if (childPath) return childPath;
  }
  return null;
}

export function withSandboxProjects(nodes: FolderNode[], projects: SandboxProjectTree[]): FolderNode[] {
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