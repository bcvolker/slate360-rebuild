"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { HomeBrandMark } from "@/components/marketing/HomeBrandMark";
import {
  AUTH_CANVAS,
  AUTH_CARD,
  AUTH_ERROR,
  AUTH_INPUT,
  AUTH_LABEL,
  AUTH_SUBMIT,
} from "@/components/auth/auth-styles";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to send message. Please try again.");
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="text-center text-sm leading-relaxed text-[var(--mkt-ink-muted)]">
        Thank you. Your message was received and routed to the Slate360 team.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <div className={AUTH_ERROR}>{error}</div> : null}
      <div>
        <label htmlFor="contact-name" className={AUTH_LABEL}>Full Name</label>
        <input
          id="contact-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={AUTH_INPUT}
        />
      </div>
      <div>
        <label htmlFor="contact-email" className={AUTH_LABEL}>Work Email</label>
        <input
          id="contact-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={AUTH_INPUT}
        />
      </div>
      <div>
        <label htmlFor="contact-message" className={AUTH_LABEL}>Message</label>
        <textarea
          id="contact-message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${AUTH_INPUT} min-h-[120px] resize-none py-3`}
        />
      </div>
      <button type="submit" disabled={loading} className={AUTH_SUBMIT}>
        {loading ? <Loader2 size={16} className="animate-spin" /> : "Send Message"}
      </button>
    </form>
  );
}

export function ContactPageShell() {
  return (
    <div className={AUTH_CANVAS}>
      <div className={`${AUTH_CARD} max-w-lg`}>
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="Slate360 home">
            <HomeBrandMark iconClassName="h-9" wordClassName="text-[17px]" />
          </Link>
        </div>
        <h1 className="mb-2 text-center text-2xl font-bold text-[var(--mkt-ink)]">Contact Slate360</h1>
        <p className="mb-8 text-center text-sm text-[var(--mkt-ink-muted)]">
          Tell us about a site in greater Phoenix, or{" "}
          <Link href="/#request-a-visit" className="font-semibold text-[var(--mkt-accent)]">
            request a site visit
          </Link>
          .
        </p>
        <ContactForm />
      </div>
    </div>
  );
}
