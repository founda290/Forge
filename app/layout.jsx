import "./globals.css";

export const metadata = {
  title: "Forge — give a task, get it done",
  description:
    "Forge Studio is a Manus-style agentic workspace: give it a task and it plans, executes tools and MCP connectors, streams live steps and delivers files, reports and slides. 60+ AI providers, bring your own keys.",
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
