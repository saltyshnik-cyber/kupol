/** @type {import('next').NextConfig} */
const nextConfig = {
  // схема БД читается с диска в /api/setup
  outputFileTracingIncludes: { "/api/setup": ["./db/schema.sql"] },
  // Mini App открывается внутри Telegram (iframe/webview)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org https://t.me" },
        ],
      },
    ];
  },
};
export default nextConfig;
