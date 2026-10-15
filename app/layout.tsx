import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Causa Raiz Lab',
  description: 'Análise de causa raiz com evidência, riscos e medição antes/depois',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
