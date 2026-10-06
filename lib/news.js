import { fieldFeedUrl } from "./storage.js";

const MAX_AGE_DAYS = 14;
const MAX_PER_FEED = 15;

export function buildFeedList(settings) {
  const feeds = settings.feeds.filter((f) => f.enabled && f.url);
  const fieldUrl = fieldFeedUrl(settings.profile);
  if (fieldUrl) {
    feeds.unshift({ name: `Google News: ${settings.profile.field || "your field"}`, url: fieldUrl, category: "field" });
  }
  return feeds;
}

export async function fetchAllNews(settings) {
  const feeds = buildFeedList(settings);
  const results = await Promise.allSettled(feeds.map(fetchFeed));

  const errors = [];
  const seen = new Set();
  const items = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      errors.push(`${feeds[i].name}: ${r.reason?.message || r.reason}`);
      return;
    }
    for (const item of r.value) {
      const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }
  });

  const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
  const fresh = items.filter((i) => !i.date || i.date >= cutoff);
  fresh.sort((a, b) => (b.date || 0) - (a.date || 0));
  return { items: fresh, errors };
}

async function fetchFeed(feed) {
  const res = await fetch(feed.url, { signal: AbortSignal.timeout(15000), cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("Not a valid RSS/Atom feed");

  const isAtom = doc.getElementsByTagName("entry").length > 0 && doc.getElementsByTagName("item").length === 0;
  const nodes = Array.from(doc.getElementsByTagName(isAtom ? "entry" : "item")).slice(0, MAX_PER_FEED);

  return nodes
    .map((node) => {
      const title = cleanText(firstText(node, "title"));
      const link = isAtom ? atomLink(node) : firstText(node, "link") || firstText(node, "guid");
      const rawDate = firstText(node, "pubDate", "published", "updated", "dc:date");
      const date = rawDate ? Date.parse(rawDate) || null : null;
      const summary = cleanText(firstText(node, "description", "summary", "content:encoded", "content")).slice(0, 500);
      const source = cleanText(firstText(node, "source")) || feed.name;
      return { id: link || title, title, link, date, summary, source, category: feed.category };
    })
    .filter((i) => i.title && i.link);
}

function firstText(node, ...tags) {
  for (const tag of tags) {
    const el = node.getElementsByTagName(tag)[0];
    if (el?.textContent?.trim()) return el.textContent.trim();
  }
  return "";
}

function atomLink(node) {
  const links = Array.from(node.getElementsByTagName("link"));
  const alt = links.find((l) => !l.getAttribute("rel") || l.getAttribute("rel") === "alternate");
  return (alt || links[0])?.getAttribute("href") || "";
}

function cleanText(html) {
  if (!html) return "";
  const text = new DOMParser().parseFromString(html, "text/html").body.textContent || "";
  return text.replace(/\s+/g, " ").trim();
}

export function timeAgo(ts) {
  if (!ts) return "";
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
