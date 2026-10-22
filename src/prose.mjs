import fs from "node:fs/promises";
import path from "node:path";
import { collectFiles, maskComments } from "unslop-core";

const COPY_FILES = /\.(?:mdx?|txt|html?|[jt]sx|vue|svelte|astro|json)$/;
const COPY_KEYS = /\b(?:title|description|subtitle|heading|headline|label|body|text|cta|tagline|quote|summary|content|message|caption|alt|placeholder|aria-label)\s*[:=]\s*(?:"([^"\n]{3,})"|'([^'\n]{3,})'|`([^`$]{3,})`|\{\s*["']([^"'\n]{3,})["']\s*\})/g;

/** Pulls human-facing prose out of markdown, markup, component and i18n JSON files. */
export function extractProse(raw, file) {
  if (/\.(?:md|mdx|txt)$/.test(file)) {
    return raw
      .replace(/^---\n[\s\S]*?\n---\n/, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/^(?:import|export) .*$/gm, "")
      .replace(/`[^`]*`/g, "")
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/<[^>]+>/g, " ")
      .replace(/^[ \t]*(?:#{1,6}|[-*+]|\d+\.|>)[ \t]+/gm, "")
      .replace(/[*_~]{1,3}/g, "");
  }
  if (file.endsWith(".json")) {
    try {
      const out = [];
      const visit = (v) => (typeof v === "string" ? /\s/.test(v.trim()) && out.push(v) : v && typeof v === "object" && Object.values(v).forEach(visit));
      visit(JSON.parse(raw));
      return out.join(".\n");
    } catch {
      return "";
    }
  }
  const src = maskComments(raw, file).replace(/<(script|style)\b[\s\S]*?<\/\1>/g, "");
  const parts = [];
  for (const m of src.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)) {
    const t = m[1].replace(/\s+/g, " ").trim();
    if (t.split(" ").length >= 2 && !/[;=]|=>|\)\s*$/.test(t)) parts.push(t);
  }
  for (const m of src.matchAll(COPY_KEYS)) parts.push(m[1] ?? m[2] ?? m[3] ?? m[4]);
  return parts.map((p) => (/[.!?:]$/.test(p) ? p : `${p}.`)).join("\n");
}

const sentencesOf = (text) =>
  text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'“(])/)
    .map((s) => s.trim())
    .filter((s) => /[A-Za-z]{2}/.test(s));

function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

const isIndonesian = (words) => {
  const hits = words.filter((w) => /^(?:yang|dan|di|untuk|dengan|tidak|ini|itu|dari|ke|adalah|akan|bisa|kami|anda)$/i.test(w)).length;
  return hits / Math.max(words.length, 1) > 0.06;
};

export function readability(text) {
  const sentences = sentencesOf(text);
  const words = text.match(/[A-Za-zÀ-ɏ'’-]+/g) ?? [];
  if (words.length < 20) return { words: words.length, note: "Too little text for meaningful readability scores (need 20+ words)." };
  const wps = words.length / Math.max(sentences.length, 1);
  const indonesian = isIndonesian(words);
  const syl = words.reduce((n, w) => n + syllables(w), 0) / words.length;
  const lengths = sentences.map((s) => ({ s, n: s.split(/\s+/).length }));
  const starts = {};
  for (const { s } of lengths) {
    const first = s.split(/\s+/)[0].toLowerCase().replace(/[^a-zÀ-ɏ]/g, "");
    if (first) starts[first] = (starts[first] ?? 0) + 1;
  }
  const passive = indonesian ? [] : [...text.matchAll(/\b(?:is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?\w+(?:ed|en)\b/gi)].map((m) => m[0]);
  return {
    language: indonesian ? "id" : "en",
    words: words.length,
    sentences: sentences.length,
    avgWordsPerSentence: Math.round(wps * 10) / 10,
    ...(indonesian
      ? { note: "Flesch scores are calibrated for English and are omitted for Indonesian." }
      : {
          fleschReadingEase: Math.round(206.835 - 1.015 * wps - 84.6 * syl),
          fleschKincaidGrade: Math.round((0.39 * wps + 11.8 * syl - 15.59) * 10) / 10,
        }),
    longSentences: lengths.filter((l) => l.n > 25).sort((a, b) => b.n - a.n).slice(0, 5).map((l) => ({ words: l.n, sentence: l.s.slice(0, 220) })),
    repeatedOpeners: Object.entries(starts).filter(([w, n]) => n >= 3 && n / sentences.length > 0.15 && !/^(?:the|a|an|i)$/.test(w)).map(([word, count]) => ({ word, count })),
    passiveVoice: { count: passive.length, examples: [...new Set(passive)].slice(0, 6) },
    adverbsPer100Words: indonesian ? undefined : Math.round(((text.match(/\b\w{4,}ly\b/gi) ?? []).length / words.length) * 1000) / 10,
    emDashes: (text.match(/—/g) ?? []).length,
    exclamations: (text.match(/!/g) ?? []).length,
  };
}

export async function analyzeReadability(args, root) {
  const targetGrade = Number(args.targetGrade) || 9;
  const sources = [];
  if (typeof args.text === "string" && args.text.trim()) sources.push({ file: "(text)", text: args.text });
  if (Array.isArray(args.files) && args.files.length) {
    const { files, errors } = await collectFiles(args.files, root, (p) => COPY_FILES.test(p));
    if (errors.length) return { status: "FAIL", errors, _failed: true };
    for (const f of files) sources.push({ file: path.relative(root, f), text: extractProse(await fs.readFile(f, "utf8"), f) });
  }
  if (!sources.length) return { status: "FAIL", message: "Pass `text` or `files`.", _failed: true };

  const results = sources.map(({ file, text }) => {
    const r = readability(text);
    const flags = [];
    if (r.fleschKincaidGrade > targetGrade) flags.push(`Grade ${r.fleschKincaidGrade} is above the target ${targetGrade}. Shorten sentences and swap long words for short ones.`);
    if (r.avgWordsPerSentence > 20) flags.push(`Average sentence is ${r.avgWordsPerSentence} words; aim for 12-18.`);
    if (r.repeatedOpeners?.length) flags.push(`Repeated sentence openers: ${r.repeatedOpeners.map((o) => `"${o.word}" x${o.count}`).join(", ")}.`);
    if (r.passiveVoice?.count > Math.max(2, r.sentences * 0.2)) flags.push(`${r.passiveVoice.count} passive constructions; name who does what.`);
    if (r.emDashes >= 3 && r.emDashes / r.words > 1 / 150) flags.push(`${r.emDashes} em dashes; most should be periods or commas.`);
    return { file, ...r, flags };
  });
  const flagged = results.some((r) => r.flags.length);
  return {
    status: flagged ? "NEEDS_EDIT" : "PASS",
    targetGrade,
    results,
    instruction: flagged ? "Revise the flagged passages, then re-run. Readability scores are guides; clarity for the reader is the goal." : "Copy reads clearly at the target level.",
  };
}

// Length budgets: [min, max] characters unless `words` is set.
const LIMITS = {
  title: { max: 60, why: "Google truncates titles around 60 characters" },
  meta_description: { min: 70, max: 160, why: "search snippets cut off around 155-160 characters" },
  og_title: { max: 70, why: "social cards truncate long titles" },
  og_description: { max: 200, why: "social cards show about two lines" },
  headline: { words: 12, why: "headlines over ~12 words stop being scannable" },
  button: { words: 4, max: 28, why: "buttons should name one action in a few words" },
  push_notification: { max: 110, why: "lock screens truncate around 110 characters" },
  sms: { max: 160, why: "longer messages split into multiple SMS" },
  tweet: { max: 280, why: "X/Twitter limit" },
  email_subject: { max: 50, why: "mobile inboxes show about 40-50 characters" },
  app_store_subtitle: { max: 30, why: "App Store subtitle limit" },
  play_short_description: { max: 80, why: "Google Play short description limit" },
};

function extractMeta(raw) {
  const items = [];
  const push = (kind, text) => text && items.push({ kind, text: text.trim() });
  push("title", raw.match(/<title>([^<]+)<\/title>/i)?.[1]);
  push("meta_description", raw.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1]);
  push("og_title", raw.match(/property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1]);
  push("og_description", raw.match(/property=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1]);
  const meta = raw.match(/export\s+const\s+metadata[^=]*=\s*\{([\s\S]*?)\n\}/)?.[1];
  if (meta) {
    push("title", meta.match(/^\s*title\s*:\s*["'`]([^"'`]+)["'`]/m)?.[1]);
    push("meta_description", meta.match(/^\s*description\s*:\s*["'`]([^"'`]+)["'`]/m)?.[1]);
  }
  const fm = raw.match(/^---\n([\s\S]*?)\n---/)?.[1];
  if (fm) {
    push("title", fm.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1]);
    push("meta_description", fm.match(/^description:\s*["']?(.+?)["']?\s*$/m)?.[1]);
  }
  return items;
}

export async function checkCopyLength(args, root) {
  const items = Array.isArray(args.items) ? [...args.items] : [];
  if (Array.isArray(args.files) && args.files.length) {
    const { files } = await collectFiles(args.files, root, (p) => /\.(?:html?|[jt]sx?|mdx?|astro|vue|svelte)$/.test(p));
    for (const f of files) for (const it of extractMeta(await fs.readFile(f, "utf8"))) items.push({ ...it, file: path.relative(root, f) });
  }
  if (!items.length) return { status: "FAIL", message: `Pass items: [{ kind, text }] (kinds: ${Object.keys(LIMITS).join(", ")}) and/or files to extract <title>/meta/frontmatter from.`, _failed: true };
  const results = items.map((it) => {
    const limit = LIMITS[it.kind];
    if (!limit) return { ...it, error: `Unknown kind. Use one of: ${Object.keys(LIMITS).join(", ")}` };
    const chars = [...String(it.text)].length;
    const wordCount = String(it.text).trim().split(/\s+/).length;
    const problems = [];
    if (limit.max && chars > limit.max) problems.push(`${chars} chars > ${limit.max}`);
    if (limit.min && chars < limit.min) problems.push(`${chars} chars < ${limit.min}`);
    if (limit.words && wordCount > limit.words) problems.push(`${wordCount} words > ${limit.words}`);
    return { ...it, chars, words: wordCount, ok: problems.length === 0, ...(problems.length ? { problem: `${problems.join(", ")} (${limit.why}).` } : {}) };
  });
  const failed = results.some((r) => r.error || r.ok === false);
  return { status: failed ? "FAIL" : "PASS", results, _failed: failed };
}
