import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Egis Deployment Log Analyzer',
  description: 'Analyze and monitor Intune and Autopilot deployment logs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <header className="border-b">
            <div className="container mx-auto py-4">
              <h1 className="text-xl font-bold">Egis Log Analyzer</h1>
            </div>
          </header>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
