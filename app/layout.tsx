import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/AuthContext";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SynQall - CRM Data Entry Automation",
  description: "Upload your sales calls and get CRM-ready data instantly. No integrations required.",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light antialiased" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>
          <ThemeProvider>
            <AnalyticsProvider>
              <AuthProvider>
                <AuthLayout>
                  {children}
                </AuthLayout>
                <Toaster />
              </AuthProvider>
            </AnalyticsProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
