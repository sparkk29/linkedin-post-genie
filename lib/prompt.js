export const POST_TYPES = {
  insight: {
    label: "Industry insight",
    brief: "Explain what this news really means for my field, why leaders should care, and what they should do next.",
  },
  security: {
    label: "Security / vulnerability breakdown",
    brief:
      "Break down the threat or vulnerability: what happened, who is exposed, the business risk in plain words, and 3-5 practical mitigations teams can apply this week.",
  },
  future: {
    label: "Future of tech prediction",
    brief: "Make a grounded, specific prediction about where this is heading in the next 2-5 years and how professionals and companies should prepare.",
  },
  hot_take: {
    label: "Contrarian take",
    brief: "Share a respectful but bold opinion that challenges the popular narrative, backed by clear reasoning.",
  },
  explainer: {
    label: "Explain it to a CEO",
    brief: "Explain the technical topic so a non-technical executive understands it in 60 seconds, with a clear 'so what' for their business.",
  },
  lessons: {
    label: "Actionable checklist",
    brief: "Turn the news into a short numbered checklist of concrete, actionable takeaways.",
  },
};

const LENGTHS = {
  short: "600-900 characters",
  medium: "1000-1600 characters",
  long: "1700-2500 characters",
};

const EMOJIS = {
  none: "Do not use emojis.",
  few: "Use at most 2-3 tasteful emojis (e.g. as bullet markers), never in the hook.",
  more: "Use emojis as bullet markers and for visual rhythm, but keep it professional.",
};

export function buildPrompt({ settings, articles, topic, postType, notes }) {
  const { profile, post } = settings;
  const type = POST_TYPES[postType] || POST_TYPES.insight;

  const system = `You are an elite LinkedIn ghostwriter for technology professionals.
Your job: write posts that position the author as a credible, practical thought leader so that ${profile.audience} notice them, visit their profile, and send connection invites.

Writing rules:
- Line 1 is a scroll-stopping hook under 150 characters (it's all people see before "...see more"). No clickbait, no "I'm excited to share".
- Short paragraphs of 1-2 sentences with blank lines between them. Easy to skim on mobile.
- Don't just summarize the news. Add the author's perspective, connected to their role, field and skills.
- Be specific and concrete. Avoid buzzwords and AI clichés ("game-changer", "delve", "in today's fast-paced world", "unlock", "revolutionize", "landscape").
- Never invent personal stories, employers, numbers, or quotes. Only state facts that appear in the provided sources; otherwise frame it as opinion or analysis.
- Do NOT put URLs in the post body (LinkedIn suppresses reach for external links). Put the source link(s) in "firstComment" instead.
- End with a thoughtful question or soft call-to-action that invites discussion from leaders. Never beg for jobs or say "hire me".
- Plain text only. LinkedIn does not render markdown, so no **bold**, no # headings.
- ${EMOJIS[post.emojis] || EMOJIS.few}
- Finish with exactly ${post.hashtags} relevant hashtags on the last line, mixing broad and niche tags.
- Target length: ${LENGTHS[post.length] || LENGTHS.medium}. Hard limit: 2900 characters.
- Tone: ${profile.tone}. Language: ${post.language}.

Return ONLY valid JSON in this exact shape:
{"posts":[{"angle":"3-6 word label for this variant","text":"the full post including hashtags","firstComment":"short first comment with source link(s) and one extra insight"}]}`;

  const author = [
    profile.name && `Name: ${profile.name}`,
    profile.role && `Current role / headline: ${profile.role}`,
    profile.field && `Field: ${profile.field}`,
    profile.experience && `Experience: ${profile.experience}`,
    profile.skills && `Key skills: ${profile.skills}`,
    profile.goal && `Career goal for posting: ${profile.goal}`,
  ]
    .filter(Boolean)
    .join("\n");

  const sources = articles.length
    ? articles
        .map(
          (a, i) =>
            `[${i + 1}] ${a.title}\nSource: ${a.source}${a.date ? ` (${new Date(a.date).toDateString()})` : ""}\nLink: ${a.link}\nSummary: ${a.summary || "n/a"}`
        )
        .join("\n\n")
    : "No articles selected.";

  const user = `AUTHOR
${author || "A technology professional."}

POST STYLE
${type.label}: ${type.brief}

SOURCE ARTICLES
${sources}
${topic ? `\nADDITIONAL TOPIC / IDEA FROM THE AUTHOR\n${topic}\n` : ""}${notes ? `\nEXTRA INSTRUCTIONS\n${notes}\n` : ""}
Write ${post.variants} distinct variants, each with a different hook and angle.`;

  return { system, user };
}

export function parsePosts(raw) {
  let text = (raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("The AI didn't return JSON. Try generating again.");
  text = text.slice(start, end + 1);

  const data = JSON.parse(text);
  const posts = (data.posts || []).filter((p) => p && typeof p.text === "string" && p.text.trim());
  if (!posts.length) throw new Error("The AI returned no posts. Try generating again.");
  return posts.map((p) => ({
    angle: String(p.angle || "Draft"),
    text: p.text.trim(),
    firstComment: String(p.firstComment || "").trim(),
  }));
}
