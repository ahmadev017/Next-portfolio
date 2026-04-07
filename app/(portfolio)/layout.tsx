import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SanityLive } from "@/sanity/lib/live";
import "../globals.css";
import { draftMode } from "next/headers";
import { VisualEditing } from "next-sanity/visual-editing";
import { AppSidebar } from "@/components/app-sidebar";
import { ModeToggle } from "@/components/DarkModeToggle";
import { DisableDraftMode } from "@/components/DisableDraftMode";
import { FloatingDock } from "@/components/FloatingDock";
import SidebarToggle from "@/components/SidebarToggle";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { serverClient } from "@/sanity/lib/serverClient";
import { urlFor } from "@/sanity/lib/image";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const query = `*[_type=="siteSettings" && _id=="singleton-siteSettings"][0]{
    siteTitle,
    siteDescription,
    siteKeywords,
    ogImage,
    favicon,
    twitterHandle
  }`;

  const settings =
    (await serverClient.fetch(query)) ?? ({} as Record<string, any>);

  const title =
    settings.siteTitle ??
    "Ahmad Raza | Product-Focused Full-Stack Developer (MERN & Next.js)";
  const description =
    settings.siteDescription ??
    "Experienced Full-Stack Engineer with a track record of increasing user engagement by 40%. Expertise in building scalable systems with Node.js, PostgreSQL, and Headless CMS.";

  const ogImageUrl = settings.ogImage
    ? urlFor(settings.ogImage).width(1200).height(630).url()
    : "/og-image.png";
  const faviconUrl = settings.favicon
    ? urlFor(settings.favicon).width(32).height(32).url()
    : "/favicon.ico";

  const metadataBase = new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  );

  return {
    metadataBase,
    title,
    description,
    keywords: settings.siteKeywords ?? [],
    openGraph: {
      title,
      description,
      url: metadataBase.toString(),
      siteName: title,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
      creator: settings.twitterHandle ? `@${settings.twitterHandle}` : undefined,
    },
    icons: {
      icon: faviconUrl,
      apple: faviconUrl,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SidebarProvider defaultOpen={false}>
              <SidebarInset className="">{children}</SidebarInset>

              <AppSidebar side="right" />

              <FloatingDock />
              <SidebarToggle />

              {/* Mode Toggle - Desktop: bottom right next to AI chat, Mobile: top right next to burger menu */}
              <div className="fixed md:bottom-6 md:right-24 top-4 right-18 md:top-auto md:left-auto z-20">
                <div className="w-10 h-10 md:w-12 md:h-12">
                  <ModeToggle />
                </div>
              </div>
            </SidebarProvider>

            {/* Live content API */}
            <SanityLive />

            {(await draftMode()).isEnabled && (
              <>
                <VisualEditing />
                <DisableDraftMode />
              </>
            )}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
