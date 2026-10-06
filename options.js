import { getSettings, saveSettings, DEFAULT_FEEDS, DEFAULT_MODELS, CATEGORY_LABELS } from "./lib/storage.js";
import { complete } from "./lib/ai.js";

const form = document.getElementById("settings-form");
const feedsBody = document.getElementById("feeds-body");
const provider = document.getElementById("provider");

init();

async function init() {
  const settings = await getSettings();
  for (const input of form.querySelectorAll("[name]")) {
    const [group, key] = input.name.split(".");
    input.value = settings[group][key] ?? "";
  }
  renderFeeds(settings.feeds);
  syncProvider();

  provider.addEventListener("change", syncProvider);
  document.getElementById("add-feed").addEventListener("click", () => {
    feedsBody.append(feedRow({ name: "", url: "", category: "field", enabled: true }));
  });
  document.getElementById("reset-feeds").addEventListener("click", () => renderFeeds(DEFAULT_FEEDS));
  document.getElementById("test-ai").addEventListener("click", testConnection);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveSettings(readForm());
    flash("save-status", "Saved ✓", false);
  });
}

function syncProvider() {
  document.getElementById("model").placeholder = DEFAULT_MODELS[provider.value];
  document.getElementById("base-url-field").hidden = provider.value !== "openai";
}

function readForm() {
  const settings = { profile: {}, ai: {}, post: {} };
  for (const input of form.querySelectorAll("[name]")) {
    const [group, key] = input.name.split(".");
    settings[group][key] = input.type === "number" ? Number(input.value) : input.value.trim();
  }
  settings.feeds = Array.from(feedsBody.querySelectorAll("tr"))
    .map((tr) => ({
      enabled: tr.querySelector(".f-enabled").checked,
      name: tr.querySelector(".f-name").value.trim(),
      category: tr.querySelector(".f-category").value,
      url: tr.querySelector(".f-url").value.trim(),
    }))
    .filter((f) => f.url);
  return settings;
}

function renderFeeds(feeds) {
  feedsBody.replaceChildren(...feeds.map(feedRow));
}

function feedRow(feed) {
  const tr = document.createElement("tr");

  const enabled = Object.assign(document.createElement("input"), { type: "checkbox", className: "f-enabled", checked: feed.enabled });
  const name = Object.assign(document.createElement("input"), { className: "f-name", value: feed.name, placeholder: "Feed name" });
  const url = Object.assign(document.createElement("input"), { className: "f-url", value: feed.url, placeholder: "https://…/feed.xml", type: "url" });
  const category = Object.assign(document.createElement("select"), { className: "f-category" });
  for (const [value, label] of Object.entries(CATEGORY_LABELS)) {
    category.append(new Option(label, value));
  }
  category.value = feed.category;
  const remove = Object.assign(document.createElement("button"), { type: "button", className: "icon-btn", textContent: "×", title: "Remove" });
  remove.addEventListener("click", () => tr.remove());

  for (const node of [enabled, name, category, url, remove]) {
    const td = document.createElement("td");
    td.append(node);
    tr.append(td);
  }
  return tr;
}

async function testConnection() {
  const { ai } = readForm();
  flash("test-result", "Testing…", false, 0);
  try {
    const reply = await complete(ai, 'Reply with the JSON {"ok": true} and nothing else.', "ping");
    flash("test-result", reply ? "Connected ✓" : "Connected, but got an empty reply", !reply);
  } catch (err) {
    flash("test-result", err.message, true, 10000);
  }
}

function flash(id, text, isError, ms = 3000) {
  const node = document.getElementById(id);
  node.textContent = text;
  node.className = `small ${isError ? "error-text" : "ok-text"}`;
  if (ms) setTimeout(() => (node.textContent = ""), ms);
}
