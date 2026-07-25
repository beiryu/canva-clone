import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { SessionProvider } from "next-auth/react";

import { auth } from "@/auth";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

import "./globals.css";

const font = Space_Grotesk({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The Canvas",
  description: "Build Something Great!",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <SessionProvider session={session}>
      <html lang="en">
        <body className={font.className}>
          <Providers>
            <Toaster />
            {children}
          </Providers>
        </body>
      </html>
    </SessionProvider>
  );
}
