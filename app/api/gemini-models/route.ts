import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 },
    );
  }

  const apiVersion = process.env.GEMINI_API_VERSION?.trim() || "v1";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/${encodeURIComponent(
      apiVersion,
    )}/models`,
    {
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: errorText || "Failed to list models" },
      { status: response.status },
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
