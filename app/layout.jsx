import "./globals.css";

export const metadata = {
  title: "Forge — one studio for every frontier model",
  description:
    "Forge is an agentic workspace for 60+ AI providers: chats, agents, tools, MCP connectors, cloud sync, and a usage dashboard.",
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
