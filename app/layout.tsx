import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Autogrow",
  description:
    "The growth engine that runs itself. Drop your website URL and get personas, scored leads, outbound emails, and inbound content — per buyer segment, in one run.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
      style={{ colorScheme: "light" }}
    >
      <body className="min-h-full flex flex-col bg-[#f4f4f0] text-[#0a0a0a]">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
