import type { Metadata } from 'next';
import { Geist, JetBrains_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import { Toaster } from '@shared/components/ui/sonner';
import { ThemeProvider } from '@shared/components/theme-provider';
import { TooltipProvider } from '@shared/components/ui/tooltip';
import { AuthProvider } from '@features/auth/context';
import { ShellWrapper } from '@shared/components/shell-wrapper';
import { createClient } from '@shared/lib/supabase/server';
import '../public/assets/css/globals.css';

const literataDisplay = localFont({
  src: './fonts/literata/Literata-Italic.ttf',
  variable: '--font-literata-display',
  weight: '700',
  style: 'italic',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
});

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin', 'latin-ext'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin', 'latin-ext'],
});

export const metadata: Metadata = {
  title: 'İcmal',
  description: 'İcmal — maliyet, metraj, analiz ve teklif çalışma alanı',
  icons: { icon: '/assets/images/brand/favicon_primary.svg' },
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
    <html
      lang="tr"
      className={`${geistSans.variable} ${jetbrainsMono.variable} ${literataDisplay.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <AuthProvider initialUser={user}>
              <ShellWrapper>{children}</ShellWrapper>
            </AuthProvider>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
