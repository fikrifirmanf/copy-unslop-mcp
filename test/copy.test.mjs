import { test } from "node:test";
import assert from "node:assert/strict";
import { checkRuleExamples } from "unslop-core";
import { rules } from "../src/rules.mjs";
import { extractProse, readability, checkCopyLength } from "../src/prose.mjs";

test("every rule catches its bad examples and passes its good ones", () => {
  assert.deepEqual(checkRuleExamples(rules), []);
});

test("prose extraction from components and markdown", () => {
  const tsx = 'export function Hero() {\n  // not copy\n  return <section><h1 className="text-4xl">Close the books in two days</h1><Button aria-label="Start trial">Go</Button></section>;\n}\nconst f = [{ title: "Offline sync", description: "Edits made on the train upload later." }];';
  const prose = extractProse(tsx, "Hero.tsx");
  assert.match(prose, /Close the books in two days/);
  assert.match(prose, /Edits made on the train/);
  assert.doesNotMatch(prose, /not copy|className/);
  assert.equal(extractProse("---\ntitle: x\n---\n# Hello world\n\n```js\nconst a = 1\n```\nSee [the guide](/g).", "a.md").trim().replace(/\s+/g, " "), "Hello world See the guide.");
});

test("readability metrics", () => {
  const simple = readability("We send the invoice. You pay it online. The money lands in two days. Nothing else to do. Your accountant gets a copy too.");
  assert.equal(simple.language, "en");
  assert.ok(simple.fleschKincaidGrade < 6);
  const id = readability("Kami membantu UMKM mengirim faktur dengan cepat. Anda bisa membayar secara online dan dana akan masuk dalam dua hari untuk semua pelanggan yang terdaftar di sistem ini.");
  assert.equal(id.language, "id");
  assert.equal(id.fleschKincaidGrade, undefined);
});

test("copy length budgets", async () => {
  const r = await checkCopyLength({ items: [{ kind: "title", text: "x".repeat(70) }, { kind: "button", text: "Start free trial" }] }, process.cwd());
  assert.equal(r.status, "FAIL");
  assert.equal(r.results[0].ok, false);
  assert.equal(r.results[1].ok, true);
});
