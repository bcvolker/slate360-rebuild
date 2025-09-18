"use client";
import React from "react";
// Framer Motion removed
import Button from "./Button";

export default function InteractiveForm() {
  return (
    <form
      className="max-w-md mx-auto flex flex-col gap-4 mt-6"
      onSubmit={(e) => {
        e.preventDefault();
        alert("Thank you for reaching out!");
      }}
    >
      <div className="fade-slide-in">
        <input
          type="email"
          required
          placeholder="Your email"
          className="px-4 py-2 rounded border border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue"
        />
        <textarea
          required
          placeholder="Your message"
          className="px-4 py-2 rounded border border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue"
          rows={4}
        />
        <Button type="submit">Send Message</Button>
  </div>
    </form>
  );
}
