import type { Metadata } from "next";
import { PRODUCT_NAME } from "@/shared/product";
import { getServerEnvironment } from "@/server/env";
import "./globals.css";

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: "A workspace for understanding one document or video at a time.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  getServerEnvironment();
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#workspace">Skip to workspace</a>
        {children}
      </body>
    </html>
  );
}
