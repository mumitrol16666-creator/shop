import type { Metadata, Viewport } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";
import "../components/store/store-routes.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["cyrillic", "latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["cyrillic", "latin"],
});

export const metadata: Metadata = {
  title: "Maestro — музыкальные инструменты",
  description:
    "Гитары, укулеле, оборудование и аксессуары для начинающих музыкантов.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Maestro", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "Maestro — музыка начинается здесь",
    description: "Инструменты для первых аккордов и собственного звучания.",
    images: ["/og-maestro.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Maestro — музыка начинается здесь",
    description: "Инструменты для первых аккордов и собственного звучания.",
    images: ["/og-maestro.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#181511",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${manrope.variable} ${playfair.variable}`}>
        {children}
      </body>
    </html>
  );
}
