"use client";

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface AccountSettingsClientProps {
  email: string;
  tier: string;
  orgName: string | null;
}

export function AccountSettingsClient({
  email,
  tier,
  orgName,
}: AccountSettingsClientProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (confirmation !== "DELETE MY ACCOUNT") return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      if (res.ok) {
        window.location.href = "/login?deleted=true";
      } else {
        const d = await res.json();
        setError(d.error ?? "Failed to delete account. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Account Info */}
      <Card>
        <CardContent className="space-y-3 pt-4">
          <h2 className="text-lg font-semibold">Account Information</h2>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subscription</span>
              <span className="capitalize">{tier}</span>
            </div>
            {orgName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Organization</span>
                <span>{orgName}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
          </div>

          {!showDeleteConfirm ? (
            <div>
              <p className="mb-3 text-sm text-muted-foreground">
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Account
              </Button>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-medium">
                This will permanently delete:
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Your user account and login</li>
                <li>All active subscriptions (cancelled immediately)</li>
                <li>All uploaded files and media</li>
                {orgName && (
                  <li>
                    Organization &ldquo;{orgName}&rdquo; (if you are the sole
                    member)
                  </li>
                )}
              </ul>
              <p className="text-sm">
                Type{" "}
                <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-bold text-destructive">
                  DELETE MY ACCOUNT
                </code>{" "}
                to confirm:
              </p>
              <Input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                className="max-w-xs font-mono"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting || confirmation !== "DELETE MY ACCOUNT"}
                >
                  {deleting ? (
                    <Loader2 className="mr-1 size-4 animate-spin" />
                  ) : null}
                  Permanently Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setConfirmation("");
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
