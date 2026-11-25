import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MIRA',
  description: 'A MIRA traduz o que você já faz para a língua das vagas e mostra o caminho grátis até elas.',
  appleWebApp: { capable: true, title: 'MIRA', statusBarStyle: 'default' },
  icons: { apple: '/icones/apple-touch-icon.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#FFFFFF' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Lexend:wght@400;500;600&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
