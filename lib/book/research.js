import {
  firecrawlApiKey,
  geminiApiKey,
  geminiModel,
  openaiApiKey,
  openaiModel,
} from "@/lib/env";

export const RESEARCH_PLACEHOLDER = "Looking into the company…";

const CONSUMER_MAIL = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "gmx.net",
]);

const SYSTEM = `You brief a designer named Koussay before a 1-hour intro call.
Research the business from the Firecrawl notes. Write in simple English, like explaining to a smart friend.
Do not invent funding, headcount, awards, or clients. If you are unsure, say so.
Return JSON only with this shape:
{
  "summary": "3-5 sentences: who they are and what they do",
  "whatTheyDo": "one short paragraph",
  "who": "who they serve, one or two sentences",
  "callNotes": ["3-6 practical talking points for this call, tied to the help they asked for"],
  "watchOuts": ["gaps, things to confirm on the call, or 'None obvious.'"]
}`;

const BRIEFING_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "3-5 simple sentences: who they are and what they do",
    },
    whatTheyDo: {
      type: "string",
      description: "One short paragraph on the product or service",
    },
    who: {
      type: "string",
      description: "Who they serve, one or two sentences",
    },
    callNotes: {
      type: "array",
      items: { type: "string" },
      description: "Practical talking points for an intro call",
    },
    watchOuts: {
      type: "array",
      items: { type: "string" },
      description: "Gaps or things to confirm, not invented facts",
    },
  },
  required: ["summary", "whatTheyDo"],
};

export function isResearchConfigured() {
  return Boolean(firecrawlApiKey() || openaiApiKey() || geminiApiKey());
}

export async function researchBusiness(booking) {
  if (!isResearchConfigured()) return null;

  const site = await readCompanySite(booking);
  const prompt = buildPrompt(booking, site);

  let briefing = null;
  if (geminiApiKey()) {
    try {
      briefing = await fromGemini(prompt);
    } catch (error) {
      console.error("[book] Gemini research failed", error);
    }
  }
  if (!briefing && openaiApiKey()) {
    try {
      briefing = await fromOpenAI(prompt);
    } catch (error) {
      console.error("[book] OpenAI research failed", error);
    }
  }
  if (!briefing && firecrawlApiKey() && site?.url) {
    try {
      briefing = await fromFirecrawlExtract(booking, site.url);
    } catch (error) {
      console.error("[book] Firecrawl extract failed", error);
    }
  }
  if (!briefing && site?.summary) {
    briefing = {
      summary: site.summary.slice(0, 1500),
      whatTheyDo: site.summary.slice(0, 1200),
      who: "",
      callNotes: booking.services?.length
        ? [`They asked for help with ${booking.services.join(", ")}.`]
        : [],
      watchOuts: [
        "This is a site summary only — skim their site before the call.",
      ],
    };
  }
  if (briefing && site?.sources?.length) {
    briefing.sources = site.sources;
  }
  return briefing;
}

function buildPrompt(booking, site) {
  const lines = [
    `Company: ${booking.company}`,
    `Website: ${booking.website || "not given"}`,
    `Contact: ${booking.name} <${booking.email}>`,
    `They want help with: ${(booking.services || []).join(", ") || "not given"}`,
    `Budget: ${booking.budget || "not given"}`,
    `Deadline: ${booking.deadline || "not given"}`,
    `Their notes: ${booking.details && booking.details !== "Skipped" ? booking.details : "none"}`,
  ];
  if (site?.url) lines.push(`Fetched page: ${site.url}`);
  if (site?.title) lines.push(`Page title: ${site.title}`);
  if (site?.description) lines.push(`Meta description: ${site.description}`);
  if (site?.summary) {
    lines.push("Firecrawl page summary:");
    lines.push(site.summary);
  }
  if (site?.search) {
    lines.push("Web and news hits:");
    lines.push(site.search);
  }
  if (site?.text) {
    lines.push("Website excerpt:");
    lines.push(site.text);
  }
  lines.push(
    "Use only these notes. Then write the JSON briefing. Keep it under 250 words of readable text.",
  );
  return lines.join("\n");
}

function websiteGuess(booking) {
  if (booking.website) return booking.website;
  const host = String(booking.email || "")
    .split("@")[1]
    ?.toLowerCase();
  if (!host || CONSUMER_MAIL.has(host)) return "";
  return `https://${host}`;
}

function hostOf(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isSafeHttpUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host === "::1") {
      return false;
    }
    if (
      /^(127\.|10\.|192\.168\.|169\.254\.|0\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(
        host,
      )
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function decode(text) {
  return String(text || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtml(html) {
  return decode(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html, name) {
  const patterns = [
    new RegExp(
      `<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decode(match[1]).trim();
  }
  return "";
}

async function firecrawlPost(path, body, timeoutMs) {
  const headers = { "content-type": "application/json" };
  const key = firecrawlApiKey();
  if (key) headers.authorization = `Bearer ${key}`;
  const response = await fetch(`https://api.firecrawl.dev/v2${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || `Firecrawl ${path} ${response.status}`);
  }
  return payload.data ?? payload;
}

function searchHits(data) {
  const groups = [data?.web, data?.news, data].filter(Array.isArray);
  const rows = groups.length ? groups.flat() : [];
  const lines = [];
  const sources = [];
  for (const item of rows) {
    if (!item || typeof item !== "object") continue;
    const title = String(item.title || "").trim();
    const url = String(item.url || "").trim();
    const blurb = String(
      item.description || item.snippet || item.highlights?.[0] || "",
    ).trim();
    if (!title && !url) continue;
    lines.push(
      `- ${title}${url ? ` (${url})` : ""}${blurb ? `: ${blurb}` : ""}`,
    );
    if (url) sources.push(url);
    if (lines.length >= 8) break;
  }
  return {
    text: lines.join("\n").slice(0, 4000),
    sources: sources.slice(0, 6),
  };
}

async function fromFirecrawl(booking, home) {
  const query = [booking.company, hostOf(home)].filter(Boolean).join(" ");
  const scrapePromise =
    home && isSafeHttpUrl(home)
      ? firecrawlPost(
          "/scrape",
          {
            url: home,
            formats: ["markdown", "summary"],
            onlyMainContent: true,
            timeout: 20000,
          },
          22000,
        )
      : Promise.resolve(null);
  const searchPromise = query
    ? firecrawlPost(
        "/search",
        { query, limit: 5, sources: ["web", "news"] },
        18000,
      )
    : Promise.resolve(null);

  const [scrape, search] = await Promise.all([
    scrapePromise.catch((error) => {
      console.error("[book] Firecrawl scrape failed", error);
      return null;
    }),
    searchPromise.catch((error) => {
      console.error("[book] Firecrawl search failed", error);
      return null;
    }),
  ]);

  const hits = searchHits(search);
  const markdown = String(scrape?.markdown || "").trim();
  const summary = String(scrape?.summary || "").trim();
  const meta = scrape?.metadata || {};
  const pageUrl = meta.sourceURL || meta.url || home || "";
  const sources = [
    ...new Set([pageUrl, ...hits.sources].filter((url) => isSafeHttpUrl(url))),
  ].slice(0, 6);

  if (!markdown && !summary && !hits.text) return null;

  return {
    url: pageUrl,
    title: String(meta.title || meta.ogTitle || "").trim(),
    description: String(meta.description || meta.ogDescription || "").trim(),
    summary: summary.slice(0, 2000),
    search: hits.text,
    text: markdown.slice(0, 12_000),
    sources,
  };
}

async function fromFirecrawlExtract(booking, url) {
  if (!isSafeHttpUrl(url)) return null;
  const data = await firecrawlPost(
    "/scrape",
    {
      url,
      formats: [
        {
          type: "json",
          schema: BRIEFING_SCHEMA,
          prompt: [
            `Brief a designer before a 1-hour intro call with ${booking.company}.`,
            `They want help with: ${(booking.services || []).join(", ") || "not given"}.`,
            `Budget: ${booking.budget || "not given"}. Deadline: ${booking.deadline || "not given"}.`,
            "Write simply. Do not invent funding, headcount, or awards.",
          ].join(" "),
        },
      ],
      onlyMainContent: true,
      timeout: 20000,
    },
    22000,
  );
  return parseBriefing(JSON.stringify(data.json ?? data));
}

async function fetchPage(url) {
  if (!isSafeHttpUrl(url)) return null;
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent":
        "KoussayBooking/1.0 (+https://koussay.online) research briefing",
      accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const type = response.headers.get("content-type") || "";
  if (!type.includes("html") && !type.includes("text/plain")) return null;
  const html = (await response.text()).slice(0, 180_000);
  const title = decode(
    (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "")
      .replace(/\s+/g, " ")
      .trim(),
  );
  return {
    url: response.url || url,
    title,
    description:
      metaContent(html, "description") || metaContent(html, "og:description"),
    text: stripHtml(html).slice(0, 10_000),
  };
}

async function readCompanySite(booking) {
  const home = websiteGuess(booking);
  if (firecrawlApiKey()) {
    try {
      const gathered = await fromFirecrawl(booking, home);
      if (gathered) return gathered;
    } catch (error) {
      console.error("[book] Firecrawl research failed", error);
    }
  }
  if (!home) return null;
  try {
    const first = await fetchPage(home);
    if (!first?.url) return first;
    const origin = new URL(first.url).origin;
    const extra = await fetchPage(`${origin}/about`).catch(() => null);
    if (!extra?.text) return first;
    return {
      ...first,
      text: `${first.text}\n\nAbout page:\n${extra.text}`.slice(0, 12_000),
    };
  } catch (error) {
    console.error("[book] site fetch failed", error);
    return { url: home, title: "", description: "", text: "" };
  }
}

function asList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((item) => item.slice(0, 400));
}

function parseBriefing(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let data;
  try {
    data = JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
  const summary = String(data.summary || "").trim();
  const whatTheyDo = String(data.whatTheyDo || "").trim();
  const who = String(data.who || "").trim();
  if (!summary && !whatTheyDo) return null;
  return {
    summary: (summary || whatTheyDo).slice(0, 1500),
    whatTheyDo: whatTheyDo.slice(0, 1200),
    who: who.slice(0, 800),
    callNotes: asList(data.callNotes),
    watchOuts: asList(data.watchOuts),
  };
}

async function fromOpenAI(prompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${openaiApiKey()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: openaiModel(),
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(25000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI ${response.status}`);
  }
  return parseBriefing(payload.choices?.[0]?.message?.content);
}

async function fromGemini(prompt) {
  const model = encodeURIComponent(geminiModel());
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiApiKey())}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(25000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || `Gemini ${response.status}`);
  }
  const text = (payload.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || "")
    .join("\n");
  return parseBriefing(text);
}
