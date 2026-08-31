import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://auldmoney.workers.dev",
  ),
  title: "AuldMoney — Family ledger",
  description: "A simple private ledger for family balances and interest.",
  openGraph: {
    title: "AuldMoney",
    description: "A simple family ledger.",
    images: [{ url: "/og.png", width: 1730, height: 909 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AuldMoney",
    description: "A simple family ledger.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-primary/20">{children}</body>
    </html>
  );
}
