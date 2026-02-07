import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@shared/components/ui/sonner';
import { ThemeProvider } from '@shared/components/theme-provider';
import { TooltipProvider } from '@shared/components/ui/tooltip';
import { AuthProvider } from '@features/auth/context';
import { createClient } from '@shared/lib/supabase/server';
import '../public/assets/css/globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'EKAP Editör',
  description: 'Elektronik Kamu Alımları Platformu Teklif Editörü',
  icons: { icon: '/favicon.ico' },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <AuthProvider initialUser={user}>{children}</AuthProvider>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
