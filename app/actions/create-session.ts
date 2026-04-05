"use server";

import { auth } from "@clerk/nextjs/server";
import { WORKFLOW_ID } from "@/lib/config";

export async function createSession() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized - Please sign in");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  if (!WORKFLOW_ID) {
    throw new Error("WORKFLOW_ID not configured");
  }

  console.log("Creating ChatKit session", {
    userId,
    hasApiKey: Boolean(apiKey),
    hasWorkflowId: Boolean(WORKFLOW_ID),
  });

  const controller = new AbortController();
  const timeoutMs = 12_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // Create ChatKit session with Clerk user ID
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chatkit/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Beta": "chatkit_beta=v1",
      },
      body: JSON.stringify({
        workflow: { id: WORKFLOW_ID },
        user: userId,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error(
        "Chat session creation timed out. Please try again in a moment.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const error = await response.text();
    console.error("ChatKit session creation failed", {
      status: response.status,
      body: error,
    });
    throw new Error(`Failed to create session (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.client_secret as string;
}
