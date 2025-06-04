import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* The body tag will be styled by globals.css or specific page styles */}
      <body>{children}</body>
    </html>
  );
}