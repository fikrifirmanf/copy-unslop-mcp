#!/usr/bin/env node
import { run, byExt } from "unslop-core";
import { rules } from "./rules.mjs";
import { analyzeReadability, checkCopyLength } from "./prose.mjs";

await run({
  packageUrl: new URL("../package.json", import.meta.url),
  skill: "copy-unslop",
  description: "Copywriting anti-slop rules for landing pages, product UI, docs, emails and app-store copy (English + Bahasa Indonesia).",
  auditTool: "audit_copy_slop",
  auditDescription:
    "Deterministically scans markdown, markup, components and i18n JSON for copy slop: stock AI phrases (delve, unlock the power, seamless, in today's fast-paced world), empty marketing adjectives, 'not X but Y' framing, em-dash and exclamation overuse, 'click here' links, generic CTAs, unverifiable social proof, wordy filler, placeholder copy, emoji bullets, and Indonesian AI clichés.",
  rules,
  accept: byExt(".md", ".mdx", ".txt", ".html", ".htm", ".tsx", ".jsx", ".vue", ".svelte", ".astro", ".json"),
  tools: [
    {
      name: "analyze_readability",
      description:
        "Scores prose (raw text, or copy extracted from md/mdx/html/jsx/tsx/i18n JSON): Flesch reading ease, Flesch-Kincaid grade, sentence length, longest sentences, repeated openers, passive voice, adverb density, em dashes. Detects Indonesian and skips English-only formulas. Run on any user-facing copy you wrote.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Copy to analyze directly" },
          files: { type: "array", items: { type: "string" }, description: "Files or directories to extract copy from" },
          targetGrade: { type: "number", description: "Max acceptable Flesch-Kincaid grade (default 9; ~7 for consumer, ~11 for technical docs)" },
        },
      },
      handler: analyzeReadability,
    },
    {
      name: "check_copy_length",
      description:
        "Checks copy against channel length budgets: title, meta_description, og_title, og_description, headline, button, push_notification, sms, tweet, email_subject, app_store_subtitle, play_short_description. Pass items, and/or files to auto-extract <title>, meta description, OG tags, Next.js metadata and markdown frontmatter.",
      inputSchema: {
        type: "object",
        properties: {
          items: { type: "array", items: { type: "object", properties: { kind: { type: "string" }, text: { type: "string" } }, required: ["kind", "text"] } },
          files: { type: "array", items: { type: "string" } },
        },
      },
      handler: checkCopyLength,
    },
  ],
});
