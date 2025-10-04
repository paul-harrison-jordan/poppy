import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import ClientLayout from "./ClientLayout";

const inter = Inter({ subsets: ["latin"] });
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: "ChatPRD",
  description: "Chat with your PRD",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${playfair.variable} bg-[#FFFAF3] text-[#232426]`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
