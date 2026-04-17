/** Small HTTP helpers used by API route handlers. */
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./auth";
import { ScoreError } from "./scores";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function err(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

/** Wrap a handler to convert thrown errors into clean JSON responses. */
export function handle<T extends (...args: any[]) => Promise<Response>>(fn: T) {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (e: unknown) {
      if (e instanceof ZodError) {
        return err("Invalid input", 400, { issues: e.errors });
      }
      if (e instanceof AuthError) {
        return err(e.message, e.status);
      }
      if (e instanceof ScoreError) {
        return err(e.message, e.status);
      }
      console.error("[api]", e);
      const msg = e instanceof Error ? e.message : "Server error";
      return err(msg, 500);
    }
  }) as T;
}
