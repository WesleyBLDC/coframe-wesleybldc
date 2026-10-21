import type { Metadata } from 'next';
import { Suspense } from 'react';
import TestBar from '@/components/TestBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'TV Shop',
  description: 'Browse and compare TVs',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* useSearchParams in a client component needs a Suspense boundary. */}
        <Suspense fallback={<div className="testbar" />}>
          <TestBar />
        </Suspense>
        <nav>
          <a href="/">TV Shop</a>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
