import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { serverClient, writeClient } from "@/sanity/lib/serverClient";

type IncomingMessage = {
  role?: "user" | "assistant";
  content?: string;
};

type ProfilePayload = {
  firstName?: string;
  lastName?: string;
  headline?: string;
  shortBio?: string;
  location?: string;
  email?: string;
  yearsOfExperience?: string | number;
  socialLinks?: Record<string, string>;
};

const buildSystemInstruction = (profile?: ProfilePayload | null) => {
  const fullName = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const identity = fullName ? `You are ${fullName}.` : "You are the portfolio owner.";

  const details = [
    profile?.headline ? `Headline: ${profile.headline}` : null,
    profile?.shortBio ? `Bio: ${profile.shortBio}` : null,
    profile?.location ? `Location: ${profile.location}` : null,
    profile?.yearsOfExperience
      ? `Years of experience: ${profile.yearsOfExperience}`
      : null,
    profile?.email ? `Email: ${profile.email}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    `${identity} You are an AI twin answering questions about your work, skills, projects, and experience.`,
    "Be concise, confident, and friendly. Use first person. Keep answers focused on the portfolio.",
    "Format responses in clean Markdown with short headings and bullet points. Use plain-text labels like [Project], [Role], [Skill], [Service] instead of emojis.",
    "If asked about unrelated topics, politely steer back to your professional background.",
    details ? `Profile:\n${details}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
};

const truncate = (value: string | undefined | null, max = 280) => {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
};

const compactArray = <T,>(items: T[] | undefined, limit = 6) =>
  Array.isArray(items) ? items.slice(0, limit) : [];

const compactPortfolio = (data: Record<string, any>) => {
  const profile = data?.profile ?? {};
  const compact = {
    profile: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      headline: truncate(profile.headline, 140),
      shortBio: truncate(profile.shortBio, 420),
      location: profile.location,
      availability: profile.availability,
      yearsOfExperience: profile.yearsOfExperience,
      stats: compactArray(profile.stats, 6),
    },
    projects: compactArray(data?.projects, 8).map((project: any) => ({
      title: project.title,
      tagline: truncate(project.tagline, 160),
      category: project.category,
      technologies: compactArray(project.technologies, 8)?.map(
        (tech: any) => tech?.name,
      ),
      description: truncate(project.description, 420),
      liveUrl: project.liveUrl,
      githubUrl: project.githubUrl,
      featured: project.featured,
    })),
    experience: compactArray(data?.experience, 8).map((role: any) => ({
      company: role.company,
      position: role.position,
      employmentType: role.employmentType,
      location: role.location,
      startDate: role.startDate,
      endDate: role.endDate,
      current: role.current,
      description: truncate(role.description, 420),
      responsibilities: compactArray(role.responsibilities, 6),
      achievements: compactArray(role.achievements, 6),
      technologies: compactArray(role.technologies, 8)?.map(
        (tech: any) => tech?.name,
      ),
    })),
    skills: compactArray(data?.skills, 18).map((skill: any) => ({
      name: skill.name,
      category: skill.category,
      proficiency: skill.proficiency,
      yearsOfExperience: skill.yearsOfExperience,
    })),
    services: compactArray(data?.services, 8).map((service: any) => ({
      title: service.title,
      shortDescription: truncate(service.shortDescription, 240),
      features: compactArray(service.features, 8),
      technologies: compactArray(service.technologies, 8)?.map(
        (tech: any) => tech?.name,
      ),
      deliverables: compactArray(service.deliverables, 6),
      pricing: service.pricing,
      timeline: service.timeline,
    })),
    education: compactArray(data?.education, 6).map((edu: any) => ({
      school: edu.school,
      degree: edu.degree,
      field: edu.field,
      startDate: edu.startDate,
      endDate: edu.endDate,
      description: truncate(edu.description, 240),
      location: edu.location,
    })),
    certifications: compactArray(data?.certifications, 6).map((cert: any) => ({
      title: cert.title,
      issuer: cert.issuer,
      issueDate: cert.issueDate,
      expiryDate: cert.expiryDate,
      credentialId: cert.credentialId,
      credentialUrl: cert.credentialUrl,
      description: truncate(cert.description, 200),
    })),
    achievements: compactArray(data?.achievements, 8).map((item: any) => ({
      title: item.title,
      description: truncate(item.description, 200),
      date: item.date,
    })),
    testimonials: compactArray(data?.testimonials, 6).map((item: any) => ({
      name: item.name,
      role: item.role,
      company: item.company,
      quote: truncate(item.quote, 240),
    })),
    blog: compactArray(data?.blog, 10).map((post: any) => ({
      title: post.title,
      excerpt: truncate(post.excerpt, 240),
      category: post.category,
      tags: compactArray(post.tags, 6),
      publishedAt: post.publishedAt,
      readTime: post.readTime,
    })),
    siteSettings: data?.siteSettings
      ? {
          siteTitle: data.siteSettings.siteTitle,
          siteDescription: truncate(data.siteSettings.siteDescription, 200),
          ctaText: data.siteSettings.ctaText,
          heroHeadline: truncate(data.siteSettings.heroHeadline, 200),
          heroSubheadline: truncate(data.siteSettings.heroSubheadline, 240),
        }
      : {},
  };

  return compact;
};

const fetchPortfolioData = async () => {
  const query = `{
    "profile": *[_type=="profile" && _id=="singleton-profile"][0]{
      firstName,lastName,headline,shortBio,fullBio,location,availability,yearsOfExperience,stats
    },
    "projects": *[_type=="project"]|order(order asc){
      title,tagline,category,technologies[]->{name},description,liveUrl,githubUrl,featured
    },
    "experience": *[_type=="experience"]|order(order asc){
      company,position,employmentType,location,startDate,endDate,current,description,
      responsibilities,achievements,technologies[]->{name}
    },
    "skills": *[_type=="skill"]|order(order asc){
      name,category,proficiency,percentage,yearsOfExperience
    },
    "services": *[_type=="service"]|order(order asc){
      title,shortDescription,features,technologies[]->{name},deliverables,pricing,timeline
    },
    "education": *[_type=="education"]|order(order asc){
      school,degree,field,startDate,endDate,description,location
    },
    "certifications": *[_type=="certification"]|order(order asc){
      title,issuer,issueDate,expiryDate,credentialId,credentialUrl,description
    },
    "achievements": *[_type=="achievement"]|order(order asc){
      title,description,date
    },
    "testimonials": *[_type=="testimonial"]|order(order asc){
      name,role,company,quote
    },
    "blog": *[_type=="blog"]|order(publishedAt desc)[0..12]{
      title,excerpt,category,tags,publishedAt,readTime
    },
    "siteSettings": *[_type=="siteSettings" && _id=="singleton-siteSettings"][0]{
      siteTitle,siteDescription,ctaText,heroHeadline,heroSubheadline
    }
  }`;

  try {
    const data = await serverClient.fetch(query);
    return compactPortfolio(data ?? {});
  } catch (error) {
    console.error("[chat] Failed to fetch Sanity data", error);
    return {};
  }
};

const saveChatHistory = async (
  userId: string,
  entries: Array<{ role: "user" | "assistant"; content: string }>,
) => {
  if (!process.env.SANITY_SERVER_API_TOKEN) {
    return;
  }

  if (!entries.length) return;

  const now = new Date().toISOString();
  const sessionId = `chatSession-${userId}`;
  const messages = entries.map((entry) => ({
    role: entry.role,
    content: entry.content,
    createdAt: now,
  }));

  try {
    await writeClient.createIfNotExists({
      _id: sessionId,
      _type: "chatSession",
      userId,
      createdAt: now,
      messages: [],
    });

    await writeClient
      .patch(sessionId)
      .set({
        updatedAt: now,
        lastMessageAt: now,
      })
      .insert("after", "messages[-1]", messages)
      .commit({ autoGenerateArrayKeys: true });
  } catch (error) {
    console.error("[chat] Failed to save history", error);
  }
};

const buildGenerationConfig = () => {
  const maxOutputTokens = process.env.GEMINI_MAX_OUTPUT_TOKENS
    ? Number.parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS, 10)
    : undefined;
  const temperature = process.env.GEMINI_TEMPERATURE
    ? Number.parseFloat(process.env.GEMINI_TEMPERATURE)
    : undefined;
  const topP = process.env.GEMINI_TOP_P
    ? Number.parseFloat(process.env.GEMINI_TOP_P)
    : undefined;
  const topK = process.env.GEMINI_TOP_K
    ? Number.parseInt(process.env.GEMINI_TOP_K, 10)
    : undefined;

  const generationConfig: Record<string, number> = {};
  if (Number.isFinite(maxOutputTokens)) {
    generationConfig.maxOutputTokens = maxOutputTokens as number;
  }
  if (Number.isFinite(temperature)) {
    generationConfig.temperature = temperature as number;
  }
  if (Number.isFinite(topP)) {
    generationConfig.topP = topP as number;
  }
  if (Number.isFinite(topK)) {
    generationConfig.topK = topK as number;
  }

  return Object.keys(generationConfig).length > 0
    ? generationConfig
    : undefined;
};

export async function POST(request: Request) {
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

  let body: { messages?: IncomingMessage[]; profile?: ProfilePayload | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const trimmedMessages = rawMessages.slice(-12).filter((msg) => msg?.content);

  const contents = trimmedMessages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: String(message.content ?? "") }],
  }));

  if (contents.length === 0) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  const rawModel =
    process.env.GEMINI_MODEL?.trim() || "models/gemini-2.5-flash";
  const model = rawModel.startsWith("models/") ? rawModel : `models/${rawModel}`;

  const apiVersion = process.env.GEMINI_API_VERSION?.trim() || "v1";

  const portfolioData = await fetchPortfolioData();
  const systemInstruction = buildSystemInstruction(body.profile);
  const portfolioContext = `Portfolio data (JSON):\n${JSON.stringify(
    portfolioData,
  )}`;
  const contentsWithSystem = [
    {
      role: "user",
      parts: [{ text: `[SYSTEM]\n${systemInstruction}\n\n${portfolioContext}` }],
    },
    ...contents,
  ];
  const generationConfig = buildGenerationConfig();
  const requestBody = generationConfig
    ? { contents: contentsWithSystem, generationConfig }
    : { contents: contentsWithSystem };

  const { searchParams } = new URL(request.url);
  const shouldStream = searchParams.get("stream") === "1";

  if (shouldStream) {
    const streamResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${model}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!streamResponse.ok || !streamResponse.body) {
      const errorText = await streamResponse.text();
      return NextResponse.json(
        { error: errorText || "Gemini API error" },
        { status: streamResponse.status },
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = streamResponse.body!.getReader();
        let buffer = "";
        let accumulatedText = "";

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === "data: [DONE]") continue;
              if (!trimmed.startsWith("data:")) continue;
              const jsonPayload = trimmed.slice(5).trim();
              if (!jsonPayload) continue;

              try {
                const parsed = JSON.parse(jsonPayload);
                const text = parsed?.candidates?.[0]?.content?.parts
                  ?.map((part: { text?: string }) => part.text)
                  .filter(Boolean)
                  .join("");
                if (text) {
                  accumulatedText += text;
                  controller.enqueue(encoder.encode(text));
                }
              } catch {
                // Ignore malformed chunks
              }
            }
          }
        } catch (error) {
          controller.error(error);
          return;
        }

        const lastUserMessage =
          [...trimmedMessages].reverse().find((msg) => msg.role !== "assistant")
            ?.content ?? "";
        if (lastUserMessage && accumulatedText.trim()) {
          await saveChatHistory(userId, [
            { role: "user", content: String(lastUserMessage) },
            { role: "assistant", content: accumulatedText.trim() },
          ]);
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/${apiVersion}/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: errorText || "Gemini API error" },
      { status: response.status },
    );
  }

  const data = await response.json();
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text)
      .filter(Boolean)
      .join("") ?? "";

  if (!text) {
    return NextResponse.json(
      { error: "No response from model" },
      { status: 502 },
    );
  }

  const lastUserMessage =
    [...trimmedMessages].reverse().find((msg) => msg.role !== "assistant")
      ?.content ?? "";
  if (lastUserMessage && text.trim()) {
    await saveChatHistory(userId, [
      { role: "user", content: String(lastUserMessage) },
      { role: "assistant", content: text.trim() },
    ]);
  }

  return NextResponse.json({ text });
}
