import type { Metadata } from "next";
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
  },
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
