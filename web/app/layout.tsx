import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Auto Click Drag",
  description: "Tải Auto Click Drag cho Windows và kích hoạt bằng key bản quyền."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
