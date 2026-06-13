"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  validateBio,
  validateDisplayName,
  validateLocation,
  validatePhone,
} from "./settings-validation";

type ProfilePrefs = {
  bio?: string;
  location?: string;
};

type UseSettingsProfileOptions = {
  userId: string;
  initialName: string;
  initialAvatarUrl?: string | null;
  onStatus: (ok: boolean, text: string) => void;
  onProfileSaved?: () => void;
};

export function useSettingsProfile({
  userId,
  initialName,
  initialAvatarUrl,
  onStatus,
  onProfileSaved,
}: UseSettingsProfileOptions) {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState(initialName);
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);
  const extraPrefsRef = useRef<Record<string, unknown>>({});

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      setLoading(true);
      try {
        const [{ data: authData }, { data: profile }] = await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from("profiles")
            .select("display_name, job_title, phone, preferences, avatar_url")
            .eq("id", userId)
            .maybeSingle(),
        ]);
        if (cancelled) return;

        const meta = authData.user?.user_metadata ?? {};
        const prefs = (profile?.preferences ?? meta.profilePrefs ?? {}) as ProfilePrefs & Record<string, unknown>;
        extraPrefsRef.current = Object.fromEntries(
          Object.entries(prefs).filter(([key]) => key !== "bio" && key !== "location"),
        );
        setDisplayName(
          profile?.display_name ??
            (meta.full_name as string | undefined) ??
            (meta.name as string | undefined) ??
            initialName,
        );
        setJobTitle(profile?.job_title ?? (meta.job_title as string | undefined) ?? "");
        setPhone(profile?.phone ?? (meta.phone as string | undefined) ?? "");
        setBio(String(prefs.bio ?? meta.bio ?? ""));
        setLocation(String(prefs.location ?? meta.location ?? ""));
        const avatar =
          profile?.avatar_url ??
          (meta.avatar_url as string | undefined) ??
          initialAvatarUrl ??
          "";
        if (avatar) setAvatarUrl(avatar);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [supabase, userId, initialName, initialAvatarUrl]);

  const persistProfile = useCallback(
    async (opts?: { silent?: boolean }) => {
      const nameError = validateDisplayName(displayName);
      const phoneError = validatePhone(phone);
      const bioError = validateBio(bio);
      const locationError = validateLocation(location);
      const error = nameError ?? phoneError ?? bioError ?? locationError;
      if (error) {
        setFieldError(error);
        if (!opts?.silent) onStatus(false, error);
        return false;
      }

      setFieldError(null);
      const trimmedName = displayName.trim();
      const profilePrefs: ProfilePrefs = {
        bio: bio.trim(),
        location: location.trim(),
      };

      try {
        const { error: authError } = await supabase.auth.updateUser({
          data: {
            full_name: trimmedName,
            job_title: jobTitle.trim(),
            phone: phone.trim(),
            bio: bio.trim(),
            location: location.trim(),
            profilePrefs,
          },
        });
        if (authError) throw authError;

        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            display_name: trimmedName,
            job_title: jobTitle.trim() || null,
            phone: phone.trim() || null,
            preferences: { ...extraPrefsRef.current, ...profilePrefs },
          })
          .eq("id", userId);
        if (profileError) throw profileError;

        if (!opts?.silent) onStatus(true, "Profile updated.");
        onProfileSaved?.();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not save profile.";
        setFieldError(message);
        if (!opts?.silent) onStatus(false, message);
        return false;
      }
    },
    [supabase, displayName, jobTitle, phone, bio, location, userId, onStatus, onProfileSaved],
  );

  const queueAutoSave = useCallback(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void persistProfile({ silent: true });
    }, 700);
  }, [persistProfile]);

  const saveProfile = useCallback(async () => {
    await persistProfile();
  }, [persistProfile]);

  const savePhoto = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        onStatus(false, "Photo must be an image file.");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        onStatus(false, "Photo must be under 2 MB.");
        return;
      }
      setPhotoBusy(true);
      try {
        const dataUrl = await resizeImageToDataUrl(file);
        const { error } = await supabase.auth.updateUser({ data: { avatar_url: dataUrl } });
        if (error) throw error;
        await supabase.from("profiles").update({ avatar_url: dataUrl }).eq("id", userId);
        setAvatarUrl(dataUrl);
        onStatus(true, "Profile photo updated.");
      } catch (err) {
        onStatus(false, err instanceof Error ? err.message : "Could not update photo.");
      } finally {
        setPhotoBusy(false);
      }
    },
    [supabase, userId, onStatus],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, []);

  return {
    loading,
    displayName,
    setDisplayName,
    jobTitle,
    setJobTitle,
    phone,
    setPhone,
    bio,
    setBio,
    location,
    setLocation,
    avatarUrl,
    photoBusy,
    fieldError,
    saveProfile,
    savePhoto,
    queueAutoSave,
  };
}

async function resizeImageToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const maxEdge = 256;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  if (dataUrl.length > 120_000) {
    throw new Error("Photo is too large after compression. Try a smaller image.");
  }
  return dataUrl;
}
