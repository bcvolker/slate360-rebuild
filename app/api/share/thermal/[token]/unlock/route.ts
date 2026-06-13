import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getThermalSharePasswordHash, resolveThermalShareToken } from "@/lib/thermal/share-token";
import { shareUnlockCookieName, verifySharePassword, createShareUnlockProof } from "@/lib/thermal/share-password";

type Params = { params: Promise<{ token: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const gate = await resolveThermalShareToken(token);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: 403 });
  }
  if (!gate.requiresPassword) {
    return NextResponse.json({ unlocked: true });
  }

  const body = (await req.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password?.trim();
  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const storedHash = await getThermalSharePasswordHash(token);
  if (!storedHash || !verifySharePassword(password, storedHash)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(shareUnlockCookieName(token), createShareUnlockProof(token, storedHash), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: `/share/thermal/${token}`,
  });

  return NextResponse.json({ unlocked: true });
}
