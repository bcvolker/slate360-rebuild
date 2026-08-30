export type ShareChannel = "member" | "guest" | "public";
export type ShareAction = "view" | "download" | "share" | "manage";
export type MemberRole = "owner" | "admin" | "member" | "collaborator" | "viewer";

export type ChannelPermission = Record<ShareAction, boolean>;

const PUBLIC: ChannelPermission = { view: true, download: false, share: false, manage: false };
const GUEST: ChannelPermission = { view: true, download: true, share: false, manage: false };

export function normalizeMemberRole(role: string | null | undefined): MemberRole {
  const r = (role ?? "member").toLowerCase();
  if (r === "owner" || r === "admin" || r === "collaborator" || r === "viewer") return r;
  return "member";
}

export function memberPermissions(role: string | null | undefined): ChannelPermission {
  switch (normalizeMemberRole(role)) {
    case "owner":
    case "admin":
      return { view: true, download: true, share: true, manage: true };
    case "member":
      return { view: true, download: true, share: true, manage: false };
    case "collaborator":
      return { view: true, download: true, share: false, manage: false };
    case "viewer":
      return { view: true, download: false, share: false, manage: false };
  }
}

export function guestPermissions(allowDownload: boolean): ChannelPermission {
  return { ...GUEST, download: allowDownload };
}

export function publicPermissions(allowDownload: boolean): ChannelPermission {
  return { ...PUBLIC, download: allowDownload };
}

export function channelLabel(channel: ShareChannel): string {
  if (channel === "member") return "Member access";
  if (channel === "guest") return "Guest share";
  return "Public share";
}

export function channelSummary(channel: ShareChannel): string {
  if (channel === "member") return "Signed-in people on this project. Roles decide who can share or manage.";
  if (channel === "guest") return "A private link sent to a specific recipient. View, and download when enabled.";
  return "An open link. View only unless download is explicitly enabled.";
}

export const SHARE_ACTIONS: ShareAction[] = ["view", "download", "share", "manage"];
