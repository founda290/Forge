export const APPS = {
  github: {
    name: "GitHub",
    desc: "Repositories, issues, pull requests",
    apiHosts: ["api.github.com"],
    scope: "repo read:user",
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    clientIdEnv: "FORGE_GITHUB_CLIENT_ID",
    clientSecretEnv: "FORGE_GITHUB_CLIENT_SECRET",
    pkce: false,
    pat: true,
  },
  google: {
    name: "Google (Drive · Gmail · Calendar)",
    desc: "Read documents, search mail, manage events",
    apiHosts: ["www.googleapis.com"],
    scope:
      "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientIdEnv: "FORGE_GOOGLE_CLIENT_ID",
    clientSecretEnv: "FORGE_GOOGLE_CLIENT_SECRET",
    pkce: true,
  },
  notion: {
    name: "Notion",
    desc: "Search and manage workspace content",
    apiHosts: ["api.notion.com"],
    scope: "",
    authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    clientIdEnv: "FORGE_NOTION_CLIENT_ID",
    clientSecretEnv: "FORGE_NOTION_CLIENT_SECRET",
    pkce: false,
    ownerUser: true,
    pat: true,
  },
  figma: {
    name: "Figma",
    desc: "Access design files",
    apiHosts: ["api.figma.com"],
    scope: "file_read",
    authorizeUrl: "https://www.figma.com/oauth",
    tokenUrl: "https://www.figma.com/api/oauth/token",
    clientIdEnv: "FORGE_FIGMA_CLIENT_ID",
    clientSecretEnv: "FORGE_FIGMA_CLIENT_SECRET",
    pkce: true,
    pat: true,
  },
  supabase: {
    name: "Supabase",
    desc: "Interact with your project databases",
    apiHostsWildcard: [".supabase.co"],
    pat: true,
  },
};

export function appFor(provider) {
  return APPS[provider] || null;
}

export function hostAllowed(provider, host) {
  const cfg = APPS[provider];
  if (!cfg) return false;
  if (cfg.apiHosts?.includes(host)) return true;
  if (cfg.apiHostsWildcard?.some((w) => host.endsWith(w))) return true;
  return false;
}

export function tokenHeaders(provider, token) {
  if (provider === "figma") return { "X-Figma-Token": token };
  if (provider === "notion") return { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28" };
  return { Authorization: `Bearer ${token}` };
}
