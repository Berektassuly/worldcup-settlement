import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorldCup Settlement",
  description: "A verifiable World Cup prediction settlement demo powered by TxLINE data."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
