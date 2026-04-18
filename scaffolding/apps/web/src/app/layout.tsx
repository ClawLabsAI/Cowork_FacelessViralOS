import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Faceless Viral OS',
    template: '%s | Faceless Viral OS',
  },
  description: 'Automated faceless video content creation and publishing platform.',
  robots: { index: false, follow: false }, // Private app
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
