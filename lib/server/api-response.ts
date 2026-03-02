/**
 * Shared API response helpers — single source of truth.
 *
 * Replaces 367+ inline `NextResponse.json({ error: ... })` calls
 * with concise, consistent helpers.
 */
import { NextResponse } from "next/server";

/** 200 — success with JSON payload */
export function ok<T>(data: T) {
  return NextResponse.json(data);
}

/** 201 — resource created */
export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

/** 400 — bad request */
export function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

/** 401 — unauthorized (no auth / bad token) */
export function unauthorized(msg = "Unauthorized") {
  return NextResponse.json({ error: msg }, { status: 401 });
}

/** 403 — forbidden (authed but not allowed) */
export function forbidden(msg = "Forbidden") {
  return NextResponse.json({ error: msg }, { status: 403 });
}

/** 404 — not found */
export function notFound(msg = "Not found") {
  return NextResponse.json({ error: msg }, { status: 404 });
}

/** 409 — conflict */
export function conflict(msg: string) {
  return NextResponse.json({ error: msg }, { status: 409 });
}

/** 500 — internal server error */
export function serverError(msg: string) {
  return NextResponse.json({ error: msg }, { status: 500 });
}
