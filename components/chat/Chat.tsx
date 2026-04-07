"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import type { CHAT_PROFILE_QUERYResult } from "@/sanity.types";
import { useSidebar } from "../ui/sidebar";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function Chat({
  profile,
}: {
  profile: CHAT_PROFILE_QUERYResult | null;
}) {
  const { isSignedIn, isLoaded } = useAuth();
  const { toggleSidebar } = useSidebar();
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Generate greeting based on available profile data
  const getGreeting = () => {
    if (!profile?.firstName) {
      return "Hi there! Ask me anything about my work, experience, or projects.";
    }

    // The .filter(Boolean) removes all falsy values from the array
    const fullName = [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(" ");

    return `Hi! I'm ${fullName}. Ask me anything about my work, experience, or projects.`;
  };

  const quickPrompts = useMemo(
    () => [
      {
        label: "What's your experience?",
        prompt: "Tell me about your professional experience and previous roles.",
      },
      {
        label: "What skills do you have?",
        prompt: "What technologies and programming languages do you specialize in?",
      },
      {
        label: "What have you built?",
        prompt: "Show me some of your most interesting projects.",
      },
      {
        label: "Who are you?",
        prompt: "Tell me more about yourself and your background.",
      },
    ],
    [],
  );

  const profilePayload = useMemo(() => {
    if (!profile) return null;
    return {
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      headline: profile.headline ?? "",
      shortBio: profile.shortBio ?? "",
      location: profile.location ?? "",
      email: profile.email ?? "",
      yearsOfExperience: profile.yearsOfExperience ?? "",
      socialLinks: profile.socialLinks ?? {},
    };
  }, [profile]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  const loadHistory = async () => {
    if (!isLoaded || !isSignedIn || isLoadingHistory) return;
    setIsLoadingHistory(true);
    setError(null);
    try {
      const response = await fetch("/api/chat/history");
      if (!response.ok) {
        throw new Error("Failed to load chat history.");
      }
      const data = (await response.json()) as {
        messages?: Array<{ role?: "user" | "assistant"; content?: string }>;
      };
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        const hydrated = data.messages
          .filter((msg) => msg?.content)
          .map((msg) => ({
            id: crypto.randomUUID(),
            role: msg.role === "assistant" ? "assistant" : "user",
            content: msg.content as string,
          }));
        setMessages(hydrated);
      } else {
        setError("No previous chat history found.");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load chat history.";
      setError(message);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    const assistantId = crypto.randomUUID();
    const nextMessages = [
      ...messages,
      userMessage,
      { id: assistantId, role: "assistant", content: "" },
    ];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch("/api/chat?stream=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          profile: profilePayload,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to fetch response.");
      }

      if (!response.body) {
        throw new Error("Streaming response not available.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          accumulated += chunk;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId
                ? { ...message, content: accumulated }
                : message,
            ),
          );
        }
      }

      if (!accumulated.trim()) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: "Sorry, I couldn't generate a response just now.",
                }
              : message,
          ),
        );
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to generate a response.";
      setError(message);
      setMessages((prev) => prev.filter((message) => message.id !== assistantId));
    } finally {
      setIsSending(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="h-full w-full z-50 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">Loading sign-in...</p>
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

  return (
    <div className="h-full w-full z-50 flex flex-col bg-background/70 backdrop-blur-xl border-l border-border/50">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/80 to-primary/30 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              Chat with {profile?.firstName || "Me"}
            </p>
            <p className="text-xs text-muted-foreground">
              AI Twin • Gemini 1.5 Flash
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/50 bg-card/60 p-5 space-y-4 shadow-sm"
          >
            <p className="text-sm text-foreground">{getGreeting()}</p>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  onClick={() => sendMessage(prompt.prompt)}
                  className="px-3 py-2 rounded-full text-xs bg-muted/70 hover:bg-muted transition-colors"
                >
                  {prompt.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadHistory}
                disabled={isLoadingHistory}
                className="px-3 py-2 rounded-full text-xs border border-border/70 hover:border-border transition-colors disabled:opacity-50"
              >
                {isLoadingHistory ? "Loading history..." : "View chat history"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setError(null);
                }}
                className="px-3 py-2 rounded-full text-xs border border-border/70 hover:border-border transition-colors"
              >
                Start fresh
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Disclaimer: This is my AI-powered twin. It may not be 100% accurate
              and should be verified for accuracy.
            </p>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card/80 border border-border/50"
                }`}
              >
                {message.role === "assistant" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h3: ({ children }) => (
                        <h3 className="text-sm font-semibold mt-3 mb-2">
                          {children}
                        </h3>
                      ),
                      h4: ({ children }) => (
                        <h4 className="text-sm font-semibold mt-3 mb-2">
                          {children}
                        </h4>
                      ),
                      p: ({ children }) => (
                        <p className="text-sm leading-relaxed">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="mt-2 space-y-1 list-disc list-inside">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="mt-2 space-y-1 list-decimal list-inside">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => <li className="text-sm">{children}</li>,
                      a: ({ children, href }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-4 text-primary"
                        >
                          {children}
                        </a>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                      ),
                      code: ({ children }) => (
                        <code className="rounded bg-muted px-1 py-0.5 text-xs">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 text-xs">
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isSending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="rounded-2xl px-4 py-3 text-sm bg-card/80 border border-border/50">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.2s]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.1s]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
              </span>
            </div>
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      <div className="px-5 pb-5">
        {error && (
          <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage(input);
          }}
          className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-2 shadow-sm"
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about my work, skills, or projects..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={isSending || input.trim().length === 0}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default Chat;
