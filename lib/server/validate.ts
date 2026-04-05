/**
 * Shared request body validator using Zod.
 *
 * Parses `req.json()` through a Zod schema and returns a typed result.
 * On failure, returns a 400 BadRequest with the first validation error.
 *
 * Usage:
 *   import { parseBody } from "@/lib/server/validate";
 *   import { z } from "zod";
 *
 *   const schema = z.object({ filename: z.string().min(1), size: z.number().positive() });
 *
 *   export const POST = (req) => withAuth(req, async () => {
 *     const parsed = await parseBody(req, schema);
 *     if (!parsed.success) return parsed.error;
 *     const { filename, size } = parsed.data;
 *   });
 */
import { NextResponse } from "next/server";
import type { ZodSchema, ZodError } from "zod";

type ParseSuccess<T> = { success: true; data: T };
type ParseFailure = { success: false; error: NextResponse };
export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

function formatZodError(err: ZodError): string {
  return err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
}

/**
 * Parse and validate a JSON request body against a Zod schema.
 *
 * Returns `{ success: true, data }` on valid input.
 * Returns `{ success: false, error: NextResponse(400) }` on invalid input or parse failure.
 */
export async function parseBody<T>(
  req: Request,
  schema: ZodSchema<T>,
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      success: false,
      error: NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      ),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      error: NextResponse.json(
        { error: formatZodError(result.error) },
        { status: 400 },
      ),
    };
  }

  return { success: true, data: result.data };
}
