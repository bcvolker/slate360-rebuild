"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Send user to the real login page immediately — no fake auth simulation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    onOpenChange(false);
    router.push("/login");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <img
              src="/uploads/slate360-logo-reversed-v2.svg?v=amber-2026-04-19"
              alt="Slate360"
              className="h-7 w-auto"
            />
          </div>
          <DialogTitle className="text-foreground">Welcome back</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Sign in to your account to continue
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label htmlFor="modal-email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <Input
              id="modal-email"
              type="email"
              placeholder="you@company.com"
              className="bg-muted border-border text-foreground"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="modal-password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <Input
              id="modal-password"
              type="password"
              placeholder="Enter your password"
              className="bg-muted border-border text-foreground"
              autoComplete="current-password"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" className="rounded border-border" />
              Remember me
            </label>
            <a href="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </a>
          </div>
          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <a href="/signup" className="text-primary hover:underline">
              Start free trial
            </a>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
