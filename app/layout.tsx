import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import VisibilityController from "@/components/VisibilityController";
import GlobalLoader from "@/components/GlobalLoader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hsdmtu.vercel.app"),
  title: {
    default: "HSD Malatya Turgut Özal Topluluğu",
    template: "%s | HSD MTÜ",
  },
  description:
    "Huawei Student Developers Malatya Turgut Özal Üniversitesi Topluluğu — teknoloji, yazılım ve inovasyon alanında öğrencileri bir araya getiren resmi topluluk.",
  keywords: [
    "HSD",
    "Huawei Student Developers",
    "Malatya Turgut Özal Üniversitesi",
    "MTÜ",
    "öğrenci topluluğu",
    "yazılım",
    "teknoloji",
    "inovasyon",
  ],
  authors: [{ name: "HSD MTÜ" }],
  creator: "HSD Malatya Turgut Özal Topluluğu",
  publisher: "HSD MTÜ",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "https://hsdmtu.vercel.app",
    siteName: "HSD Malatya Turgut Özal Topluluğu",
    title: "HSD Malatya Turgut Özal Topluluğu",
    description:
      "Huawei Student Developers Malatya Turgut Özal Üniversitesi Topluluğu — teknoloji, yazılım ve inovasyon alanında öğrencileri bir araya getiren resmi topluluk.",
    images: [
      {
        url: "/images/hsd-logo.png",
        width: 1200,
        height: 630,
        alt: "HSD Malatya Turgut Özal Topluluğu",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HSD Malatya Turgut Özal Topluluğu",
    description:
      "Huawei Student Developers Malatya Turgut Özal Üniversitesi Topluluğu — teknoloji, yazılım ve inovasyon.",
    images: ["/images/hsd-logo.png"],
    creator: "@hsdmtu",
  },
  alternates: {
    canonical: "https://hsdmtu.vercel.app",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <GlobalLoader />
        <VisibilityController />
        {children}
      </body>
    </html>
  );
}
