const gnews = (query) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

export const CATEGORY_LABELS = {
  field: "Your field",
  security: "AI & Security",
  ai: "AI",
  future: "Future tech",
};

export const DEFAULT_FEEDS = [
  { name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews", category: "security", enabled: true },
  { name: "Dark Reading", url: "https://www.darkreading.com/rss.xml", category: "security", enabled: true },
  { name: "The Register Security", url: "https://www.theregister.com/security/headlines.atom", category: "security", enabled: true },
  {
    name: "Google News: AI vulnerabilities",
    url: gnews('AI (vulnerability OR "prompt injection" OR jailbreak OR "LLM security" OR "AI agent" exploit) when:7d'),
    category: "security",
    enabled: true,
  },
  { name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", category: "ai", enabled: true },
  { name: "MIT Technology Review AI", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed", category: "ai", enabled: true },
  { name: "AI News", url: "https://www.artificialintelligence-news.com/feed/", category: "ai", enabled: true },
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/technology-lab", category: "future", enabled: true },
  { name: "Wired", url: "https://www.wired.com/feed/rss", category: "future", enabled: true },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "future", enabled: true },
  { name: "Hacker News (150+ points)", url: "https://hnrss.org/frontpage?points=150", category: "future", enabled: true },
];

export const DEFAULT_MODELS = {
  openai: "gpt-4.1-mini",
  anthropic: "claude-sonnet-4-5",
  gemini: "gemini-2.5-flash",
};

export const DEFAULT_SETTINGS = {
  profile: {
    name: "",
    role: "",
    field: "",
    experience: "",
    skills: "",
    newsKeywords: "",
    audience: "Recruiters, HR leaders, hiring managers, CTOs and CEOs",
    goal: "Be seen as a sharp, practical expert so leaders view my profile and send connection invites",
    tone: "insightful",
  },
  ai: {
    provider: "openai",
    apiKey: "",
    model: "",
    baseUrl: "",
  },
  post: {
    length: "medium",
    emojis: "few",
    hashtags: 4,
    variants: 3,
    language: "English",
  },
  feeds: DEFAULT_FEEDS,
};

export function fieldFeedUrl(profile) {
  const raw = profile.newsKeywords?.trim() || profile.field?.trim();
  if (!raw) return null;
  const terms = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.includes(" ") ? `"${t}"` : t));
  return gnews(`(${terms.join(" OR ")}) when:7d`);
}

export async function getSettings() {
  const { settings = {} } = await chrome.storage.local.get("settings");
  return {
    profile: { ...DEFAULT_SETTINGS.profile, ...settings.profile },
    ai: { ...DEFAULT_SETTINGS.ai, ...settings.ai },
    post: { ...DEFAULT_SETTINGS.post, ...settings.post },
    feeds: Array.isArray(settings.feeds) ? settings.feeds : DEFAULT_FEEDS,
  };
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ settings });
}

export async function getPanelState() {
  const { panelState = {} } = await chrome.storage.local.get("panelState");
  return panelState;
}

export async function savePanelState(patch) {
  const current = await getPanelState();
  await chrome.storage.local.set({ panelState: { ...current, ...patch } });
}
