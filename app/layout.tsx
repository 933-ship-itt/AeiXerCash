import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://aeixercash.vercel.app"),
  applicationName: "AeiXerCash",
  title: "AeiXerCash: Crypto Wallet on Polygon",
  description: "Non-custodial USDC wallet for Polygon. Send, receive, and manage crypto payments with ease.",
  keywords: ["AeiXerCash", "USDC", "Polygon", "crypto wallet", "payments"],
  category: "finance",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "AeiXerCash: Non-Custodial Polygon Wallet",
    description: "Fast, secure USDC payments on Polygon. Send, receive, and manage crypto with the ease of an app.",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 1200,
        alt: "AeiXerCash",
      },
    ],
    siteName: "AeiXerCash",
  },
  twitter: {
    card: "summary_large_image",
    title: "AeiXerCash: Non-Custodial Polygon Wallet",
    description: "Fast, secure USDC payments on Polygon. Send, receive, and manage crypto with the ease of an app.",
    images: ["/logo.png"],
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/icon.png",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    title: "AeiXerCash",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8faff" },
    { media: "(prefers-color-scheme: dark)", color: "#101827" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
