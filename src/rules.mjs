const MARKUP = /\.(?:[jt]sx|html?|vue|svelte|astro|mdx?)$/;
const PROSE = /\.(?:mdx?|txt)$/;

const words = (list) => new RegExp(`\\b(?:${list.join("|")})\\b`, "i");

function emDashDensity(src) {
  const dashes = [...src.matchAll(/—|\s--\s/g)];
  const wordCount = (src.match(/[A-Za-zÀ-ɏ]{2,}/g) ?? []).length;
  if (dashes.length < 3 || dashes.length / Math.max(wordCount, 1) < 1 / 150) return [];
  return [{ index: dashes[0].index, message: `${dashes.length} em dashes in ~${wordCount} words: the most recognisable AI-writing tic. Use periods, commas or parentheses for most of them.` }];
}

function exclamationOveruse(src) {
  const hits = [...src.matchAll(/[A-Za-z]!(?=[\s<"'`)]|$)/g)];
  return hits.length >= 3 ? [{ index: hits[0].index, message: `${hits.length} exclamation marks. Excitement belongs in the offer, not the punctuation.` }] : [];
}

export const rules = [
  {
    id: "AI_TELL_PHRASE",
    severity: "ERROR",
    regex: new RegExp(
      [
        "\\bdelve[sd]?\\b|\\bdelving\\b",
        "\\btapestry\\b",
        "\\b(?:a|is a|stands as a) testament to\\b",
        "\\bunlock(?:s|ing)? (?:the |your )?(?:full |true )?(?:power|potential)\\b",
        "\\bunleash(?:es|ing)?\\b",
        "\\bsupercharg(?:e|es|ed|ing)\\b",
        "\\bseamless(?:ly)?\\b",
        "\\bgame[- ]chang(?:er|ing)\\b",
        "\\brevolutioni[sz](?:e|es|ing)\\b",
        "\\bharness(?:es|ing)? the power\\b",
        "\\bin today'?s (?:fast[- ]paced|digital|ever[- ]changing|modern) (?:world|age|landscape|era)\\b",
        "\\bever[- ]evolving\\b",
        "\\blook no further\\b",
        "\\b(?:take|takes|taking) (?:\\w+ ){0,3}to the next level\\b",
        "\\bnavigat(?:e|ing) the (?:complexities|intricacies)\\b",
        "\\bembark(?:s|ing)? on (?:a|your) journey\\b",
        "\\bit'?s (?:important|worth) (?:to note|noting)\\b",
        "\\belevate (?:your|the) \\w+",
        "\\bin the realm of\\b",
        "\\bdive (?:deep )?into\\b",
        "\\bwhether you'?re an? [^.,]{1,40},? or an? \\b",
      ].join("|"),
      "i"
    ),
    message: "Stock AI-writing phrase. Say the specific thing: what it does, for whom, with what result.",
    examples: [
      { file: "a.md", bad: ["Let's delve into pricing.", "Unlock the full potential of your team", "A seamless experience", "In today's fast-paced world, teams need more.", "Whether you're a startup or an enterprise, we scale."], good: ["Invoices go out the day the job closes.", "Seams are double-stitched."] },
      { file: "a.tsx", bad: ["<h1>Supercharge your workflow</h1>"], good: ["<h1>Close the books in two days</h1>"] },
    ],
  },
  {
    id: "MARKETING_FILLER",
    severity: "WARN",
    regex: words(["cutting[- ]edge", "best[- ]in[- ]class", "world[- ]class", "state[- ]of[- ]the[- ]art", "next[- ]gen(?:eration)?", "empower(?:s|ing)?", "leverag(?:e|es|ing)", "robust", "holistic", "synerg(?:y|ies)", "transformative", "innovative", "streamline[sd]?", "effortless(?:ly)?", "all[- ]in[- ]one", "one[- ]stop[- ]shop", "plethora", "myriad", "bustling", "vibrant", "beacon", "paradigm"]),
    message: "Empty marketing adjective. Replace it with a concrete fact or number.",
    examples: [{ file: "a.md", bad: ["Our cutting-edge platform", "We empower teams", "A robust, holistic solution"], good: ["Search returns in under 50 ms."] }],
  },
  {
    id: "NOT_X_BUT_Y",
    severity: "WARN",
    regex: /\bnot (?:just|only|merely) (?:a |an |about )?[^.;!?\n]{1,60}?(?:[,;—–]|\s-)\s*(?:but|it'?s|we'?re)\b|\bit'?s not (?:just )?(?:about )?[^.\n]{1,50}\.\s+it'?s\b|\bmore than just an? \w+/i,
    message: "\"It's not X, it's Y\" contrast framing is a signature AI cadence. State Y directly.",
    examples: [{ file: "a.md", bad: ["It's not just a tool, it's a movement.", "It's not about speed. It's about trust.", "More than just a bank"], good: ["Not available in the EU yet."] }],
  },
  {
    id: "EM_DASH_DENSITY",
    severity: "WARN",
    check: emDashDensity,
    message: "Too many em dashes.",
    examples: [{ file: "a.md", bad: ["Fast — really fast — and simple — very simple. Built for teams."], good: ["Fast and simple. Built for teams — finally."] }],
  },
  {
    id: "EXCLAMATION_OVERUSE",
    severity: "WARN",
    files: /\.(?:mdx?|txt|html?|[jt]sx|vue|svelte|astro|json)$/,
    check: exclamationOveruse,
    message: "Too many exclamation marks.",
    examples: [{ file: "a.md", bad: ["Welcome! Sign up today! It's free!"], good: ["Welcome. Sign up today; it's free!"] }],
  },
  {
    id: "CLICK_HERE_LINK",
    severity: "ERROR",
    files: MARKUP,
    regex: />\s*(?:click here|here|read more|more|link)\s*<\/a>|\[(?:click here|here|read more|link)\]\(/i,
    message: "Link text that means nothing out of context (screen readers list links by text). Name the destination: \"Read the pricing FAQ\".",
    examples: [{ file: "a.tsx", bad: ['<a href="/docs">click here</a>'], good: ['<a href="/docs">Read the setup guide</a>'] }, { file: "a.md", bad: ["See [here](/docs)."], good: ["See the [setup guide](/docs)."] }],
  },
  {
    id: "GENERIC_CTA",
    severity: "WARN",
    files: MARKUP,
    regex: />\s*(?:Learn More|Get Started|Submit|Sign Up Now|Discover More|Explore Now|Start Your Journey|Join Now)\s*</i,
    message: "Generic button label. Say what happens: \"Start free trial\", \"Download the report\", \"Book a 15-min demo\".",
    examples: [{ file: "a.tsx", bad: ["<Button>Get Started</Button>", "<button>Submit</button>"], good: ["<Button>Create your first invoice</Button>"] }],
  },
  {
    id: "UNVERIFIED_CLAIM",
    severity: "WARN",
    regex: /\btrusted by (?:over )?(?:\d[\d,.]*k?\+?|thousands|millions|hundreds)\b|\bjoin (?:over )?(?:\d[\d,.]*k?\+?|thousands|millions) (?:of )?\w+|\b(?:the )?#1\b|\bnumber one\b|\b\d{2,3}% (?:faster|more|better|increase|growth|fewer)\b|\b10x\b|\b\d(?:\.\d)?\/5 (?:stars|rating)\b/i,
    message: "Social proof or performance claim that is easy to fabricate. Use a real, sourced figure, or cut it.",
    examples: [{ file: "a.tsx", bad: ["<p>Trusted by 10,000+ teams</p>", "Join thousands of creators", "Ship 10x faster", "The #1 CRM"], good: ["<p>Used by the finance team at Ruangguru</p>"] }],
  },
  {
    id: "WORDY_PHRASE",
    severity: "WARN",
    regex: words(["in order to", "due to the fact that", "at the end of the day", "needless to say", "it goes without saying", "for all intents and purposes", "at this point in time", "in terms of", "a wide (?:range|variety) of", "each and every"]),
    message: "Wordy filler phrase. Cut it or use the short form (\"to\", \"because\", \"now\").",
    examples: [{ file: "a.md", bad: ["We built it in order to help.", "A wide range of features"], good: ["We built it to help."] }],
  },
  {
    id: "PLACEHOLDER_COPY",
    severity: "ERROR",
    scope: "raw",
    regex: /Lorem ipsum|\[(?:Your|Company|Product|Insert)[^\]]{0,30}\]|\b(?:Feature|Benefit|Testimonial|Title|Heading) [1-6]\b|\b(?:John|Jane) Doe\b|\bAcme(?: Inc| Corp)?\b|\b(?:Insert|Add) (?:\w+ ){0,3}here\b|\bTBD\b|Your (?:tagline|headline|description) here/i,
    message: "Placeholder copy left in. Write the real text (or ask the user for it).",
    examples: [{ file: "a.tsx", bad: ["<h3>Feature 1</h3>", "<p>Lorem ipsum dolor</p>", "<p>[Your Company] helps you</p>", "Insert testimonial here"], good: ["<h3>Offline sync</h3>"] }],
  },
  {
    id: "EMOJI_BULLETS",
    severity: "WARN",
    files: PROSE,
    regex: /^[ \t]*(?:[-*+]|\d+\.|#{1,6})?[ \t]*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}][ \t]*\S/mu,
    message: "Emoji-led bullets and headings read as generated. Use plain bullets; keep emoji for tone, not structure.",
    examples: [{ file: "README.md", bad: ["- 🚀 Fast setup", "## ✨ Features"], good: ["- Fast setup", "Ships fast 🚀"] }],
  },
  // Indonesian: the same stock phrasing shows up in generated Bahasa Indonesia copy.
  {
    id: "ID_AI_TELL_PHRASE",
    severity: "ERROR",
    regex: /\bdi era (?:digital|modern|serba \w+)(?: (?:saat ini|seperti sekarang|ini))?\b|\bmari (?:kita )?(?:jelajahi|selami|menyelami)\b|\bmenyelami (?:dunia|lebih dalam)\b|\bmembuka (?:potensi|kekuatan) (?:penuh|sejati)?\b|\bke level berikutnya\b|\bbukan sekadar \w+[^.\n]{0,40}(?:,|—)\s*(?:melainkan|tetapi|tapi)\b|\btidak hanya [^.\n]{1,50}(?:,\s*)?(?:tetapi|tapi|namun) juga\b|\bdalam lanskap\b|\bsolusi (?:terbaik|terpercaya|inovatif|tepat) (?:untuk|bagi)\b|\brevolusioner\b|\bmulai perjalanan(?:mu| anda)\b/i,
    message: "Frasa AI klise (bahasa Indonesia). Tulis hal spesifik: apa fungsinya, untuk siapa, hasilnya apa.",
    examples: [{ file: "a.md", bad: ["Di era digital saat ini, bisnis harus cepat.", "Mari kita selami fitur baru.", "Tingkatkan bisnis Anda ke level berikutnya", "Solusi terbaik untuk UMKM", "Bukan sekadar aplikasi, melainkan gaya hidup."], good: ["Laporan pajak jadi dalam 5 menit."] }],
  },
];
