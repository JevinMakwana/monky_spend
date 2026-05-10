import "antd/dist/reset.css";
import type { Metadata } from "next";
import AntdCompatibility from "../components/AntdCompatibility";
import "./globals.css";


export const metadata: Metadata = {
  title: "Monthly Expense Tracker",
  description: "Track monthly expenses with category totals and history."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AntdCompatibility />
        {children}
      </body>
    </html>
  );
}
