import type { Metadata } from "next";
import { PRODUCT_NAME } from "@/shared/product";
import { getServerEnvironment } from "@/server/env";
import "./globals.css";
import { themeBootstrap } from "../shared/theme";

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: "A workspace for understanding one document or video at a time.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  getServerEnvironment();
  return (
    <html lang="en" suppressHydrationWarning>
      <head><link rel="preload" href="/fonts/GeistVariable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" /><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body>
        <a className="skip-link" href="#workspace">Skip to workspace</a>
        {children}
      </body>
    </html>
  );
}
