import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "居酒屋開拓マップ | 自分専用のデジタル赤ちょうちん帳",
  description:
    "訪れた・気になっている酒場をピン留めし、やきとん・海鮮・立ち飲みなどジャンル別に即座に呼び出せる自分専用の居酒屋開拓マップ。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "居酒屋開拓",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#121316",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="居酒屋開拓" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="bg-sumi-950 text-kinari-100 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

