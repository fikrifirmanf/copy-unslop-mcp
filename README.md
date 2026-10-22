# copy-unslop-mcp

> Stop AI-sounding copy: skill + MCP verifier for landing pages, product UI, docs, emails and store listings, in English and Bahasa Indonesia, with readability scoring and SEO/microcopy length budgets.

[![npm](https://img.shields.io/npm/v/copy-unslop-mcp?color=cb3837&logo=npm)](https://www.npmjs.com/package/copy-unslop-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![MCP](https://img.shields.io/badge/MCP-server-blue)](https://modelcontextprotocol.io)

An **agent skill** plus an **MCP server** in one package. The skill tells your coding agent what slop to avoid; the MCP tools then *deterministically verify* the result, so the agent can't just claim it's done.

Works with **Claude Code**, **Claude Desktop**, **Codex** and **Antigravity**.

## What it catches

| Rule | Severity | Catches |
| --- | --- | --- |
| `AI_TELL_PHRASE` | ERROR | Stock AI-writing phrase. Say the specific thing: what it does, for whom, with what result. |
| `MARKETING_FILLER` | WARN | Empty marketing adjective. Replace it with a concrete fact or number. |
| `NOT_X_BUT_Y` | WARN | "It's not X, it's Y" contrast framing is a signature AI cadence. State Y directly. |
| `EM_DASH_DENSITY` | WARN | Too many em dashes. |
| `EXCLAMATION_OVERUSE` | WARN | Too many exclamation marks. |
| `CLICK_HERE_LINK` | ERROR | Link text that means nothing out of context (screen readers list links by text). Name the destination: "Read the pricing FAQ". |
| `GENERIC_CTA` | WARN | Generic button label. Say what happens: "Start free trial", "Download the report", "Book a 15-min demo". |
| `UNVERIFIED_CLAIM` | WARN | Social proof or performance claim that is easy to fabricate. Use a real, sourced figure, or cut it. |
| `WORDY_PHRASE` | WARN | Wordy filler phrase. Cut it or use the short form ("to", "because", "now"). |
| `PLACEHOLDER_COPY` | ERROR | Placeholder copy left in. Write the real text (or ask the user for it). |
| `EMOJI_BULLETS` | WARN | Emoji-led bullets and headings read as generated. Use plain bullets; keep emoji for tone, not structure. |
| `ID_AI_TELL_PHRASE` | ERROR | Frasa AI klise (bahasa Indonesia). Tulis hal spesifik: apa fungsinya, untuk siapa, hasilnya apa. |

Copy is extracted from markdown, HTML, JSX/TSX text and copy-like props (`title`, `description`, `label`, `alt`, ...) and i18n JSON. Readability uses Flesch/Flesch-Kincaid for English and switches to sentence-level metrics when it detects Indonesian.

Rules marked **ERROR** make the audit return `status: "FAIL"`; **WARN** is reported but does not fail.

## Quick start

### 1. Add the MCP server

```bash
# Claude Code
claude mcp add copy-unslop -s user -- npx -y copy-unslop-mcp

# Codex
codex mcp add copy-unslop -- npx -y copy-unslop-mcp
```

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`) and **Antigravity** (`~/.gemini/config/mcp_config.json`):

```json
{
  "mcpServers": {
    "copy-unslop": {
      "command": "npx",
      "args": ["-y", "copy-unslop-mcp"]
    }
  }
}
```

Restart the app afterwards.

### 2. Install the bundled skill

```bash
npx -y copy-unslop-mcp install-skills        # clients that are installed
npx -y copy-unslop-mcp install-skills --all  # every location
```

| Client | Location |
| --- | --- |
| Claude Code | `~/.claude/skills/` |
| Codex | `~/.codex/skills/` |
| Antigravity | `~/.gemini/config/skills/` (and `~/.gemini/antigravity/skills/` if present) |

Claude Desktop has no skills folder, so it receives the rules through the MCP prompt and the `load_*_rules` tool.

## MCP surface

| Kind | Name | Purpose |
| --- | --- | --- |
| Prompt | `copy-unslop` | The full skill text, for GUI clients |
| Tool | `load_copy_unslop_rules` | Returns the full copy-unslop ruleset. Call before writing code if the copy-unslop skill is not already loaded. |
| Tool | `audit_copy_slop` | Deterministically scans markdown, markup, components and i18n JSON for copy slop: stock AI phrases (delve, unlock the power, seamless, in today's fast-paced world), empty marketing adjectives, 'not X but Y' framing, em-dash and exclamation overuse, 'click here' links, generic CTAs, unverifiable social proof, wordy filler, placeholder copy, emoji bullets, and Indonesian AI clichés. Accepts files or directories; with no files it audits the git working-tree changes. Suppress a verified false positive with a `unslop-ignore RULE_ID -- reason` comment on or above the line. |
| Tool | `analyze_readability` | Scores prose (raw text, or copy extracted from md/mdx/html/jsx/tsx/i18n JSON): Flesch reading ease, Flesch-Kincaid grade, sentence length, longest sentences, repeated openers, passive voice, adverb density, em dashes. Detects Indonesian and skips English-only formulas. Run on any user-facing copy you wrote. |
| Tool | `check_copy_length` | Checks copy against channel length budgets: title, meta_description, og_title, og_description, headline, button, push_notification, sms, tweet, email_subject, app_store_subtitle, play_short_description. Pass items, and/or files to auto-extract <title>, meta description, OG tags, Next.js metadata and markdown frontmatter. |

File paths resolve against the server's working directory and cannot escape it. Directories honour `.gitignore` and skip `node_modules`, build output and minified files.

## CLI and CI

The same audit runs without an agent. It exits `1` on any ERROR, so it works as a pre-commit hook or CI step:

```bash
npx -y copy-unslop-mcp audit              # git working-tree changes
npx -y copy-unslop-mcp audit src app      # files or directories
npx -y copy-unslop-mcp audit src --json   # machine-readable
npx -y copy-unslop-mcp rules              # list every rule
```

## Suppressing a false positive

The checks are regex and structure based: fast, offline and predictable, but heuristic. For a verified false positive, add a comment on the line or the line above, **with a reason**:

```js
// unslop-ignore AI_TELL_PHRASE -- why this is safe here
```

Suppressions without a reason are reported as `SUPPRESSION_WITHOUT_REASON` errors, and every honoured suppression is listed in the audit output so reviewers can see it.

## How it works

1. The agent loads the skill and writes code under its constraints.
2. Before finishing, the skill requires the audit and verification tools.
3. On `FAIL`, the agent fixes every finding and re-runs until `PASS`. Missing toolchains are reported as `SKIPPED`, never as passing.

## The unslop family

- [`backend-unslop-mcp`](https://github.com/fikrifirmanf/backend-unslop-mcp)
- [`frontend-unslop-mcp`](https://github.com/fikrifirmanf/frontend-unslop-mcp)
- [`ui-unslop-mcp`](https://github.com/fikrifirmanf/ui-unslop-mcp)
- [`mobile-unslop-mcp`](https://github.com/fikrifirmanf/mobile-unslop-mcp)
- [`test-unslop-mcp`](https://github.com/fikrifirmanf/test-unslop-mcp)

All share the engine in [`unslop-core`](https://github.com/fikrifirmanf/unslop-core).

## Development

```bash
git clone https://github.com/fikrifirmanf/copy-unslop-mcp
cd copy-unslop-mcp && npm install
npm test                   # every rule is checked against its good/bad examples
node src/server.mjs        # speaks MCP over stdio
```

## License

MIT © Fikri Firman Fadilah
