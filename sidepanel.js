import { getSettings, getPanelState, savePanelState, CATEGORY_LABELS } from "./lib/storage.js";
import { fetchAllNews, timeAgo } from "./lib/news.js";
import { complete } from "./lib/ai.js";
import { buildPrompt, parsePosts, POST_TYPES } from "./lib/prompt.js";

const MAX_SELECTED = 3;
const NEWS_TTL_MS = 30 * 60 * 1000;
const LINKEDIN_LIMIT = 3000;

const $ = (sel) => document.querySelector(sel);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

const state = {
  news: [],
  fetchedAt: 0,
  selected: [],
  results: [],
  category: "all",
};

init();

async function init() {
  for (const [value, { label }] of Object.entries(POST_TYPES)) {
    const opt = el("option", null, label);
    opt.value = value;
    $("#post-type").append(opt);
  }

  const saved = await getPanelState();
  Object.assign(state, {
    news: saved.news || [],
    fetchedAt: saved.fetchedAt || 0,
    selected: saved.selected || [],
    results: saved.results || [],
  });
  if (saved.postType) $("#post-type").value = saved.postType;
  if (saved.customTopic) $("#custom-topic").value = saved.customTopic;

  $("#open-settings").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("#setup-btn").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("#refresh-news").addEventListener("click", () => loadNews(true));
  $("#news-search").addEventListener("input", renderNews);
  $("#generate").addEventListener("click", generate);
  $("#clear-results").addEventListener("click", () => {
    state.results = [];
    savePanelState({ results: [] });
    renderResults();
  });
  $("#post-type").addEventListener("change", (e) => savePanelState({ postType: e.target.value }));
  $("#custom-topic").addEventListener("input", (e) => savePanelState({ customTopic: e.target.value }));

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings) {
      checkSetup();
      loadNews(true);
    }
  });

  await checkSetup();
  renderSelected();
  renderResults();
  renderNews();
  loadNews(Date.now() - state.fetchedAt > NEWS_TTL_MS);
}

async function checkSetup() {
  const { profile, ai } = await getSettings();
  const needsKey = !ai.apiKey && !(ai.provider === "openai" && ai.baseUrl);
  $("#setup-banner").hidden = !(needsKey || !profile.field);
}

async function loadNews(force) {
  if (!force && state.news.length) return;
  const status = $("#news-status");
  status.textContent = "Fetching the latest headlines…";
  $("#refresh-news").disabled = true;
  try {
    const settings = await getSettings();
    const { items, errors } = await fetchAllNews(settings);
    state.news = items;
    state.fetchedAt = Date.now();
    await savePanelState({ news: items, fetchedAt: state.fetchedAt });
    status.textContent = `${items.length} stories · updated just now${errors.length ? ` · ${errors.length} feed(s) failed` : ""}`;
    status.title = errors.join("\n");
  } catch (err) {
    status.textContent = `Couldn't load news: ${err.message}`;
  } finally {
    $("#refresh-news").disabled = false;
    renderNews();
  }
}

function renderChips() {
  const chips = $("#category-chips");
  chips.replaceChildren();
  const present = new Set(state.news.map((n) => n.category));
  const cats = ["all", ...Object.keys(CATEGORY_LABELS).filter((c) => present.has(c))];
  if (!cats.includes(state.category)) state.category = "all";
  for (const cat of cats) {
    const chip = el("button", `chip${state.category === cat ? " active" : ""}`, cat === "all" ? "All" : CATEGORY_LABELS[cat]);
    chip.addEventListener("click", () => {
      state.category = cat;
      renderNews();
    });
    chips.append(chip);
  }
}

function renderNews() {
  renderChips();
  const list = $("#news-list");
  list.replaceChildren();
  const q = $("#news-search").value.trim().toLowerCase();
  const items = state.news.filter(
    (n) =>
      (state.category === "all" || n.category === state.category) &&
      (!q || `${n.title} ${n.summary} ${n.source}`.toLowerCase().includes(q))
  );

  if (!items.length) {
    list.append(el("li", "muted small empty", state.news.length ? "No stories match." : "No stories yet."));
    return;
  }

  const selectedIds = new Set(state.selected.map((s) => s.id));
  for (const item of items.slice(0, 100)) {
    const isSelected = selectedIds.has(item.id);
    const li = el("li", `news-item${isSelected ? " selected" : ""}`);
    const label = el("label");
    const cb = el("input");
    cb.type = "checkbox";
    cb.checked = isSelected;
    cb.addEventListener("change", () => toggleSelect(item, cb));

    const body = el("div", "news-body");
    const title = el("a", "news-title", item.title);
    title.href = item.link;
    title.target = "_blank";
    title.rel = "noopener noreferrer";
    const meta = el(
      "div",
      "news-meta",
      [CATEGORY_LABELS[item.category], item.source, timeAgo(item.date)].filter(Boolean).join(" · ")
    );
    body.append(title, meta);
    if (item.summary) body.append(el("p", "news-summary", truncate(item.summary, 160)));

    label.append(cb, body);
    li.append(label);
    list.append(li);
  }
}

function toggleSelect(item, cb) {
  if (cb.checked) {
    if (state.selected.length >= MAX_SELECTED) {
      cb.checked = false;
      toast(`Pick up to ${MAX_SELECTED} stories. Focused posts perform better.`, true);
      return;
    }
    state.selected.push(item);
  } else {
    state.selected = state.selected.filter((s) => s.id !== item.id);
  }
  savePanelState({ selected: state.selected });
  renderSelected();
  renderNews();
}

function renderSelected() {
  const box = $("#selected-list");
  box.replaceChildren();
  if (!state.selected.length) {
    box.append(el("p", "muted small", "No stories selected. Pick 1-3 above or write your own idea."));
    return;
  }
  for (const item of state.selected) {
    const row = el("div", "selected-item");
    row.append(el("span", null, truncate(item.title, 90)));
    const remove = el("button", "icon-btn", "×");
    remove.title = "Remove";
    remove.addEventListener("click", () => {
      state.selected = state.selected.filter((s) => s.id !== item.id);
      savePanelState({ selected: state.selected });
      renderSelected();
      renderNews();
    });
    row.append(remove);
    box.append(row);
  }
}

async function generate() {
  const settings = await getSettings();
  const topic = $("#custom-topic").value.trim();
  const needsKey = !settings.ai.apiKey && !(settings.ai.provider === "openai" && settings.ai.baseUrl);

  if (needsKey) {
    toast("Add your AI API key in Settings first.", true);
    chrome.runtime.openOptionsPage();
    return;
  }
  if (!state.selected.length && !topic) {
    toast("Select at least one story or write your own idea.", true);
    return;
  }

  const btn = $("#generate");
  btn.disabled = true;
  btn.textContent = "Writing your posts…";
  try {
    const { system, user } = buildPrompt({
      settings,
      articles: state.selected,
      topic,
      postType: $("#post-type").value,
      notes: $("#notes").value.trim(),
    });
    const raw = await complete(settings.ai, system, user);
    state.results = parsePosts(raw);
    await savePanelState({ results: state.results });
    renderResults();
    $("#results-section").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "✨ Generate posts";
  }
}

function renderResults() {
  const section = $("#results-section");
  const container = $("#results");
  container.replaceChildren();
  section.hidden = !state.results.length;

  state.results.forEach((post, idx) => {
    const card = el("div", "result");
    card.append(el("div", "result-angle", post.angle));

    const textarea = el("textarea", "result-text");
    textarea.value = post.text;
    const counter = el("div", "counter");
    const update = () => {
      const len = textarea.value.length;
      counter.textContent = `${len} / ${LINKEDIN_LIMIT}`;
      counter.classList.toggle("over", len > LINKEDIN_LIMIT);
      autosize(textarea);
    };
    textarea.addEventListener("input", () => {
      state.results[idx].text = textarea.value;
      savePanelState({ results: state.results });
      update();
    });

    const actions = el("div", "actions");
    const insertBtn = el("button", "btn btn-primary btn-small", "Insert into LinkedIn");
    insertBtn.addEventListener("click", () => insertIntoLinkedIn(textarea.value, insertBtn));
    const copyBtn = el("button", "btn btn-small", "Copy");
    copyBtn.addEventListener("click", async () => {
      await copyText(textarea.value);
      toast("Post copied.");
    });
    actions.append(insertBtn, copyBtn);

    card.append(textarea, counter, actions);

    if (post.firstComment) {
      const fc = el("div", "first-comment");
      const head = el("div", "fc-head");
      head.append(el("strong", null, "First comment (put source links here)"));
      const fcCopy = el("button", "btn btn-ghost btn-small", "Copy");
      fcCopy.addEventListener("click", async () => {
        await copyText(post.firstComment);
        toast("First comment copied. Post it right after publishing.");
      });
      head.append(fcCopy);
      fc.append(head, el("p", null, post.firstComment));
      card.append(fc);
    }

    container.append(card);
    requestAnimationFrame(update);
  });
}

async function insertIntoLinkedIn(text, btn) {
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = "Opening composer…";
  await copyText(text).catch(() => {});
  try {
    let tab = await getLinkedInTab();
    let res = await sendInsert(tab.id, text);
    if (!res?.ok && res?.code === "NO_TRIGGER") {
      tab = await navigateTab(tab.id, "https://www.linkedin.com/feed/");
      res = await sendInsert(tab.id, text);
    }
    if (res?.ok) toast("Draft is in the LinkedIn composer. Review it and hit Post.");
    else toast(`${res?.error || "Couldn't insert automatically."} The text is copied, so paste it with ⌘V / Ctrl+V.`, true);
  } catch (err) {
    toast(`${err.message}. The text is copied, so paste it with ⌘V / Ctrl+V.`, true);
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

async function sendInsert(tabId, text) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
  return chrome.tabs.sendMessage(tabId, { type: "POST_GENIE_INSERT", text });
}

async function getLinkedInTab() {
  const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (active?.url?.startsWith("https://www.linkedin.com/")) return active;
  const tab = await chrome.tabs.create({ url: "https://www.linkedin.com/feed/", active: true });
  return waitForTabLoad(tab.id);
}

async function navigateTab(tabId, url) {
  await chrome.tabs.update(tabId, { url });
  return waitForTabLoad(tabId);
}

function waitForTabLoad(tabId) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("LinkedIn took too long to load"));
    }, 25000);
    const listener = (id, info, tab) => {
      if (id === tabId && info.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(tab);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

function autosize(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight + 2}px`;
}

function truncate(str, n) {
  return str.length > n ? `${str.slice(0, n - 1)}…` : str;
}

let toastTimer;
function toast(message, isError = false) {
  const t = $("#toast");
  t.textContent = message;
  t.classList.toggle("error", isError);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), isError ? 6000 : 3000);
}
