import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'APEX KREATİF — Growth OS',
  description: 'APEX için satış, müşteri operasyonu, SEO ve reklam karar merkezi.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className="bg-apex-dark text-white antialiased selection:bg-apex-orange selection:text-white">
        {children}
      </body>
    </html>
  );
}
