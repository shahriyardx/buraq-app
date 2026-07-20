import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TRPCProvider } from "@/trpc/client";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Buraq Horse Riding School",
    template: "%s · Buraq Horse Riding School",
  },
  description:
    "Buraq Horse Riding School — dashboard for students and administration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistMono.variable,
        "font-sans",
        geist.variable,
      )}
    >
      <body className="min-h-full bg-background text-foreground">
        <TRPCProvider>{children}</TRPCProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
