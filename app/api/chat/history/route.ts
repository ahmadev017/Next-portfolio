import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { serverClient } from "@/sanity/lib/serverClient";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sessionId = `chatSession-${userId}`;
    const query = `*[_type=="chatSession" && _id==$sessionId][0]{
      messages[]{role, content, createdAt}
    }`;

    const data = await serverClient.fetch(query, { sessionId });
    const messages = data?.messages ?? [];

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[chat-history] Failed to load history", error);
    return NextResponse.json(
      { error: "Failed to load chat history" },
      { status: 500 },
    );
  }
}
