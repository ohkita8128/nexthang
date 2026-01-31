import './globals.css';

export const metadata = {
  title: 'あそボット',
  description: '予定調整アプリ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}