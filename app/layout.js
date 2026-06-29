import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Adulting OS — Your Life Score, Diagnosed in 60 Seconds",
  description: "See your money leaks, real risks, and the 3 moves to make right now. £4.99/month.",
  openGraph: {
    title: "Adulting OS",
    description: "Your finances and life admin, diagnosed in 60 seconds.",
    url: "https://adultingos.co.uk",
    siteName: "Adulting OS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Adulting OS",
    description: "Your finances and life admin, diagnosed in 60 seconds.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}