import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, priority } = body;

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    // Try to save to feature_suggestions table
    const { error: dbError } = await supabase
      .from("feature_suggestions")
      .insert({
        user_id: user.id,
        user_email: user.email,
        user_name: user.user_metadata?.full_name ?? user.email,
        title: title.trim(),
        description: description.trim(),
        priority: priority || "medium",
      });

    if (dbError) {
      // Table might not exist yet — log and continue
      console.log(
        "[suggest-feature] DB insert skipped (table may not exist):",
        dbError.message
      );
      console.log("[suggest-feature] Suggestion received:", {
        from: user.email,
        title,
        description,
        priority,
      });
    }

    // Email notification would go here when configured
    // e.g. Resend, SendGrid, or Supabase Edge Function
    // Target: slate360ceo@gmail.com
    console.log(
      `[suggest-feature] EMAIL → slate360ceo@gmail.com | From: ${user.email} | "${title}"`
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[suggest-feature] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
