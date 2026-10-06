<p align="center">
  <img src="icons/logo.png" alt="LinkedIn Post Genie logo" width="128" height="128" />
</p>

<h1 align="center">LinkedIn Post Genie</h1>

<p align="center">
  A Chrome extension that turns the latest news in your field, AI security, and future tech into LinkedIn posts that get recruiters, HR leaders, and CEOs to notice your profile.
</p>

---

## Why

Posting consistently about what's happening in your industry is one of the best ways to get inbound connection requests and job opportunities on LinkedIn, but finding the news and writing a sharp post every few days takes time. Post Genie does the research and the first draft so you only need to add your own perspective and hit **Post**.

## Features

- **Fresh news, sorted by topic**: pulls headlines from curated RSS feeds plus a Google News feed built from *your* field keywords. Stories are grouped as **Your field**, **AI & Security**, **AI**, and **Future tech**.
- **Six post styles**: Industry insight, Security / vulnerability breakdown, Future of tech prediction, Contrarian take, Explain it to a CEO, and Actionable checklist.
- **Written for decision-makers**: drafts are tuned to attract recruiters, hiring managers, CTOs, and CEOs:
  - a scroll-stopping first line (what shows before "...see more")
  - short, mobile-friendly paragraphs
  - your own analysis tied to your role and skills, not just a news summary
  - no invented stories or stats, no buzzword clichés, no "hire me" begging
  - ends with a question that invites leaders to engage
- **Reach-friendly formatting**: keeps external links out of the post body (LinkedIn shows those posts to fewer people) and gives you a ready-made **first comment** with the source links.
- **One-click insert**: opens LinkedIn's composer and fills in your draft. The text is also copied to your clipboard as a fallback.
- **Multiple variants**: generates up to 5 drafts per run, each with a different hook and angle, all editable with a 3,000-character counter.
- **Bring your own AI**: works with OpenAI, Anthropic Claude, Google Gemini, or any OpenAI-compatible API (OpenRouter, Groq, Ollama, Azure, …).
- **Private by design**: no backend. Your API key and profile stay in your browser's local storage and are sent only to the AI provider you choose.

## Installation

The extension isn't on the Chrome Web Store yet, so load it unpacked:

1. Clone the repo:
   ```bash
   git clone https://github.com/sparkk29/linkedin-post-genie.git
   ```
2. Open `chrome://extensions` in Chrome (or any Chromium browser, version 116+).
3. Turn on **Developer mode** (top-right).
4. Click **Load unpacked** and select the cloned `linkedin-post-genie` folder.
5. The settings page opens automatically on first install.

## Setup

In the settings page:

1. **Your profile**: add your field (required), role/headline, experience, key skills, and news keywords (e.g. `cloud security, zero trust, SOC`).
2. **AI provider**: pick a provider, paste your API key, and optionally set a model. Click **Test connection**.
3. **Post preferences**: length, emoji level, number of hashtags, variants per run, and language.
4. **News feeds**: enable, disable, or add any RSS/Atom feed.
5. Click **Save settings**.

Default models (change them in settings if your provider retires one):

| Provider  | Default model        |
| --------- | -------------------- |
| OpenAI    | `gpt-4.1-mini`       |
| Anthropic | `claude-sonnet-4-5`  |
| Gemini    | `gemini-2.5-flash`   |

## Usage

1. Click the Post Genie icon in the toolbar to open the side panel.
2. **Pick today's news**: filter by category or keyword and select 1-3 stories, or write your own idea.
3. **Choose an angle**: pick a post style and optionally add instructions (e.g. "mention my fintech background").
4. Click **Generate posts**.
5. **Review & post**: edit the draft you like, click **Insert into LinkedIn**, review it in the composer, and publish.
6. Right after publishing, paste the suggested **first comment** with the source links.

## Tips to get more invites

- Add one real detail from your own work to every draft. Genuine experience is what makes leaders reach out.
- Post 2-3 times a week, ideally on weekday mornings in your audience's time zone.
- Reply to every comment in the first hour.
- Make sure your LinkedIn headline and About section use the same keywords as your posts.

## Default news sources

| Category      | Feeds |
| ------------- | ----- |
| Your field    | Google News search built from your keywords (last 7 days) |
| AI & Security | The Hacker News, Dark Reading, The Register Security, Google News "AI vulnerabilities" |
| AI            | TechCrunch AI, MIT Technology Review AI, AI News |
| Future tech   | Wired, The Verge, Ars Technica, Hacker News (150+ points) |

## Project structure

```
├── manifest.json      # Manifest V3 config
├── background.js      # Opens the side panel on toolbar click and settings on install
├── sidepanel.html/js  # Main UI: news picker, generator, drafts
├── options.html/js    # Settings page
├── content.js         # Injected into LinkedIn to open the composer and insert the draft
├── styles.css         # Shared styles
├── lib/
│   ├── storage.js     # Defaults, settings, and panel state
│   ├── news.js        # RSS/Atom fetching and parsing
│   ├── ai.js          # OpenAI / Anthropic / Gemini clients
│   └── prompt.js      # Post styles, prompt, and response parsing
└── icons/             # Extension icons and logo
```

No build step and no dependencies. It's plain JavaScript (ES modules).

## Troubleshooting

- **"Insert into LinkedIn" didn't fill the composer**: LinkedIn changes its page layout often. The draft is always copied to your clipboard first, so paste it with `⌘V` / `Ctrl+V`.
- **A feed failed to load**: hover over the status line under the search box to see which feed failed. Disable it or swap in another RSS feed in settings.
- **AI request failed (404 / model not found)**: the default model may have been retired. Set a current model name in settings.
- **Using Ollama locally**: set the base URL to `http://localhost:11434/v1` and start Ollama with `OLLAMA_ORIGINS=chrome-extension://*` so it accepts requests from the extension.

## Disclaimer

Post Genie only drafts content and fills in LinkedIn's composer. You always review and publish posts yourself. It does not automate posting, scraping, or connection requests. Not affiliated with or endorsed by LinkedIn.

## License

MIT
