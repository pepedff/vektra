import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vektra — Chega de limites. Crie sem parar.",
  description:
    "Licenças com créditos ilimitados para suas ferramentas de criação com IA. Ativação automática via PIX e gestão completa em um painel.",
};

export const viewport: Viewport = {
  themeColor: "#0B0E14",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
