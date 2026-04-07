import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ahmad Raza | Product-Focused Full-Stack Developer (MERN & Next.js)",
  description: "Experienced Full-Stack Engineer with a track record of increasing user engagement by 40%. Expertise in building scalable systems with Node.js, PostgreSQL, and Headless CMS.",
  openGraph: {
    title: "Ahmad Raza | Full-Stack & AI Solutions",
    description: "Building high-performance, AI-driven digital products.",
    url: "https://next-portfolio-el9m.vercel.app/",
    siteName: "Ahmad Raza Portfolio",
    images: [
      {
        url: "/og-image.png", // Create a simple 1200x630 image of your hero section
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

export default Layout;
