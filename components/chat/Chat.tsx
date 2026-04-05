"use client";

import { ChatKit, useChatKit } from "@openai/chatkit-react";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { createSession } from "@/app/actions/create-session";
import type { CHAT_PROFILE_QUERYResult } from "@/sanity.types";
import { useSidebar } from "../ui/sidebar";
import { useState } from "react";

export function Chat({
  profile,
}: {
  profile: CHAT_PROFILE_QUERYResult | null;
}) {
  const { isSignedIn, isLoaded } = useAuth();
  const { toggleSidebar } = useSidebar();
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  // Generate greeting based on available profile data
  const getGreeting = () => {
    if (!profile?.firstName) {
      return "Hi there! Ask me anything about my work, experience, or projects.";
    }

    // The .filter(Boolean) removes all falsy values from the array, so if the firstName or lastName is not set, it will be removed
    const fullName = [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(" ");

    return `Hi! I'm ${fullName}. Ask me anything about my work, experience, or projects.`;
  };

  const { control } = useChatKit({
    api: {
      getClientSecret: async (_existingSecret) => {
        // Called on initial load and when session needs refresh, we dont actuall use the existing secret as userId is managed by Clerk
        try {
          setError(null);
          return await createSession();
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to create chat session.";
          console.error("Chat session creation error:", err);
          setError(message);
          throw err;
        }
      },
    },
    // Note: event handlers are omitted to keep type safety for production builds
    // https://chatkit.studio/playground
    theme: {},
    header: {
      title: {
        text: `Chat with ${profile?.firstName || "Me"} `,
      },
      leftAction: {
        icon: "close",
        onClick: () => {
          toggleSidebar();
        },
      },
    },
    startScreen: {
      greeting: getGreeting(),
      prompts: [
        {
          icon: "suitcase",
          label: "What's your experience?",
          prompt:
            "Tell me about your professional experience and previous roles",
        },
        {
          icon: "square-code",
          label: "What skills do you have?",
          prompt:
            "What technologies and programming languages do you specialize in?",
        },
        {
          icon: "cube",
          label: "What have you built?",
          prompt: "Show me some of your most interesting projects",
        },
        {
          icon: "profile",
          label: "Who are you?",
          prompt: "Tell me more about yourself and your background",
        },
      ],
    },
    // Leave composer config to defaults to avoid mismatched model ids

    disclaimer: {
      text: "Disclaimer: This is my AI-powered twin. It may not be 100% accurate and should be verified for accuracy.",
    },
  });

  if (!isLoaded) {
    return (
      <div className="h-full w-full z-50 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">Loading sign-in…</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="h-full w-full z-50 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Please sign in to start a chat session.
        </p>
        <SignInButton mode="modal">
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
          >
            Sign in
          </button>
        </SignInButton>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full z-50 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          type="button"
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
          onClick={() => {
            setError(null);
            setRetryKey((k) => k + 1);
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return <ChatKit key={retryKey} control={control} className="h-full w-full z-50" />;
}

export default Chat;
