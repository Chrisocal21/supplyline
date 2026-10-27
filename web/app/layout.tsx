import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SupplyLine',
  description: 'SupplyLine is a logistics game on a 3D globe, in development by Probably Fine Studios. Build farms, forests and factories, and move goods by truck, train, ship and plane. The free demo is a Windows download.',
  openGraph: {
    title: 'SupplyLine - a logistics game on a 3D globe',
    description: 'In development.',
    images: ['/site/logo-full.jpg'],
  },
  icons: { icon: '/favicon.svg' },
  // Keeps dark-mode extensions from repainting the page, which is already dark.
  other: { 'darkreader-lock': '' },
};

export const viewport: Viewport = { themeColor: '#0a1115' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
