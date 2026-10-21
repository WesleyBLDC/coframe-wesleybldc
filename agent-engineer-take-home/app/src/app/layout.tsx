import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TV Shop',
  description: 'Browse and compare TVs',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <a href="/">TV Shop</a>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
