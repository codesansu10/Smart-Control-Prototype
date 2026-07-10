# OEKOBIT Design System

A design system for **OEKOBIT Deutschland** — a German manufacturer of high-precision biogas plants ("Biogasanlagen Made in Germany"). OEKOBIT Deutschland is part of the **OEKOBIT GROUP**, an umbrella that also includes **OEKOBIT BIOGAS**, **GREENTEC INFRA** (kommunale Wasserwirtschaft), and **CONZEPT CONTAINER**. The company designs, plans, builds and services biogas, biomethane and waste-to-energy plants for agricultural, industrial, communal and residential customers.

## Sources

- **Figma file:** "Webseite OEKOBIT.fig" (mounted as a virtual filesystem during build). Two pages — `/Stylesets` (7 frames: Farben, Font-Size, Buttons, Spacing, Designelemente, Imagebox, Navigation) and `/Navigation-Menu` (9 frames including page mocks for Anlagensysteme, Anlagentechnik, Hauptmenü, and Gruppe).
- **Codebase:** none provided.
- **Slide template:** none provided.

## Audience and surfaces

- The Figma is a **website** design (desktop-first, 1900px and 1700px breakpoints). There is no app and no mobile mock in the file.
- Target reader is a German B2B buyer in agriculture, waste / industrial, or municipal energy infrastructure. The tone is technical, expert, and unmistakably German.

## What this folder contains

- `colors_and_type.css` — design tokens (CSS custom properties) for color, type, spacing, radii, shadows and motion. Drop-in for any HTML mockup.
- `assets/` — extracted brand assets: the OEKOBIT Deutschland wordmark, the OEKOBIT GROUP family map, hero photography of biogas plants, the default imagebox photo.
- `preview/` — small HTML cards showing each token group, used by the Design System tab.
- `ui_kits/website/` — high-fidelity recreation of the OEKOBIT website, with a sidebar layout, hero, info-box grid, and click-through pages.
- `SKILL.md` — Agent SKILL packaging so this can be downloaded and used inside Claude Code.
- `README.md` — this file.

## Content fundamentals

**Language.** German. The whole product is in German; English copy ("Design System", "Colors", "Font Size") is only used as labels in the design-system frames. When writing for OEKOBIT, write German.

**Voice.** Authoritative-technical and quietly confident. Sentences are long and precisely scoped — they describe what an installation does, who it is for, and which substrate it accepts. Marketing fluff is rare; numbers and equipment names are common (e.g. "Biomethananlagen", "Trockenfermentation", "Hofbiogasanlage").

**Pronouns.** Corporate **"wir"** (we) — "Wir entwickeln hochpräzise Biogasanlagen". The reader is rarely addressed directly with "Sie/du"; copy is descriptive, not imperative.

**Tone signature — the brand quote** (set as a Zitat between two gradient Trennlinien):
> "Mit Pioniergeist und Expertise entwickeln wir nachhaltige Energielösungen von morgen"

**Casing.** Sentence case for body and headlines. Product names use Title-Case ("Hofbiogasanlage FarMethan", "Kleinstbiogasanlage HoMethan", "Trockenfermentation FeBio"). The wordmark is set in **uppercase** ("OEKOBIT DEUTSCHLAND"). Section labels in the navigation are sentence-case German nouns ("Biogasanlagen", "Anlagentechnik", "Gruppe", "Kontakt", "Sprache", "Anfrage").

**Vocabulary.** German biogas vocabulary is the texture of the brand: *Biogasanlagen, Biomethananlagen, Anlagensysteme, Anlagentechnik, Substrate, Gasnutzung, Trockenfermentation, Hofbiogasanlage, Schlachtabfälle, Gülle, Mist, Nachwachsende Rohstoffe*. Do not anglicise this.

**Examples.**
- Headline (h1, light-weight): "OEKOBIT Deutschland ist Teil der OEKOBIT GROUP"
- Section headline (h2, regular, slight negative tracking): "Industrielle Biogasanlagen: Substratoptimierte Anlagen für Industrieprozesse und Verfahren."
- Body (18px, line-height 1.8): long, comma-spliced, technical, ends decisively. "Industrielle Biogasanlagen sind die perfekte Lösung für Industrieunternehmen und Produktionsbetriebe, die ihre Prozesse und Verfahren optimieren möchten."
- Eyebrow / label inside infoboxes (20px Light): "Typische Substrate:", "Ideal für:", "Mögliche Gasnutzung:" — colon-terminated, paired with a comma-separated noun list underneath.
- CTA / menu copy is one or two German nouns: "Menü", "Biogasanlagen", "Kontakt", "Anfrage", "Sprache".

**No emoji.** None appear in the Figma; do not add them.

## Visual foundations

**Palette.** Two strong text greys (`#576164` strong, `#798183` body), a near-white surface ladder (`#FFFFFF / #FAFAFA / #F4F5F5 / #F0F1F1`) and a single signature accent: the **OEKOBIT brand gradient** — yellow-green → green → emerald → teal → cyan → sky → blue. The gradient lives almost exclusively on the leaf logo and the **Trennlinie** (a 1px, 200px-wide horizontal divider). Solid blue (`#64BBE0` / `#CCE9F5`) appears as a vertical fill gradient on large primary buttons. The system has *no warm tones*, no red, no orange.

**Type.** Single family — **Mulish**, in two weights (Light 300 and Regular 400). Light weight does the display work (h1 35px, h3/Zitat 25px, eyebrow 20px); Regular handles body and h2 (30px). Letter spacing is `-0.01em` on display sizes; otherwise 0. The body line-height is unusually loose (1.8) — that breathing room is a brand cue.

**Spacing.** A 16-base scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128 / 160 / 192 / 256 / 384 / 512 / 640 / 768. Section padding is typically 48–96px; card padding 32 or 48px; gap inside info-boxes is 32px.

**Backgrounds.** Page is white. Hero and section panels are large rounded rectangles (`radius 18`, sometimes 25 for the outer content frame) on `#FAFAFA`. Photographs of green-field biogas plants (warm grass, blue sky, white tanks) sit *inside* rounded image cards (`radius 12 or 16`), never full-bleed against the page edge — the white margin around content is preserved. No textures, no patterns, no noise; gradients are reserved for the brand spectrum and blue button family.

**Animation.** None present in the Figma. The design feels static and technical. When animating, keep it minimal: 120–320ms transitions on hover (background swap, opacity), no bounces, no parallax.

**Hover states.** Buttons darken one shade (`#F4F5F5 → #F0F1F1`), text steps from body grey (`#798183`) to strong grey (`#576164`). Blue large buttons fill with the blue gradient (`#64BBE0 → #CCE9F5`). Image cards likely darken by ~5%. No scaling, no lift on hover.

**Press states.** Not specified explicitly; treat as a slightly deeper surface (`#EAEBEB`) and no scale change.

**Borders.** 1px hairlines in `#DDDFE0` only on small dividers under menu links. The bigger horizontal page-section divider is 1px solid `#576164`. No outlined cards.

**Shadow / elevation.** Almost flat. Depth comes from surface tinting (white → `#FAFAFA` → `#F4F5F5`) rather than blur. Use a soft `0 4px 14px rgba(0,0,0,0.06)` only when an element must lift off photography.

**Transparency / blur.** None used in the source. Avoid backdrop-blur; it is off-brand.

**Corner radii.** 8 (small chips) / 12 (default cards, buttons, infoboxes) / 16 (image cards) / 18 (hero/section panels) / 25 (outer page frame). Buttons are *always rounded*, never pill or square.

**Cards.** Flat tinted rectangle, `#F4F5F5` (default) or `#FAFAFA` (light variant), `radius 12`, padding 32–48px, internal gap 32px. No border, no shadow. Two-column layout: 48×48 circle-icon on the left, eyebrow + paragraph on the right.

**Layout rules.** Desktop layout fixes a 395-px-wide left navigation rail and a 1313-wide content frame on the right. Inside the content frame, sections are vertically stacked, full-width within the frame, with 64–96px vertical rhythm. Imagery and headlines split into 2-up columns at content widths above 1100px.

**Imagery vibe.** Outdoor, daylight, slightly green-cast — green grass, yellow-green corn fields, white storage tanks, occasional aerial drone shots. Cool but not desaturated. No people-portraits in the source. No black-and-white. No grain.

## Iconography

The icon system is a small, **bespoke** SVG set — not a public icon font.

- **Master motif.** A circle (`32×32` or `48×48`, 1px stroke) containing a **right-chevron** (`›`). This appears on every CTA, every navigation arrow, and as the "more" affordance on every imagebox. It is filled in body grey (`#798183`) by default and white on blue gradient buttons.
- **Topical icons.** Each Anlagensystem has its own line icon, also drawn inside the same `48×48` outline circle: **Substrate** (sprouting plant), **Industrie** (factory silhouette), **Landwirtschaft** (tractor/silo), **Gasnutzung** (gas-flame inside a return-arrow). They live exclusively inside the *Infobereich mit Icon* card.
- **Wordmark.** `assets/logo-oekobit.png` — the gradient leaf glyph + the "OEKOBIT DEUTSCHLAND" wordmark in dark grey (`#576164`). Use this; do not redraw.
- **Group map.** `assets/oekobit-group-map.png` — a tree diagram showing OEKOBIT GROUP and its three brands (BIOGAS, GREENTEC INFRA, CONZEPT CONTAINER).
- **No emoji. No unicode-as-icon.** Quote marks (`"…"`) appear in the Zitat block but are typographic, not iconic.

**Substitution.** No public icon font exactly matches OEKOBIT's hand-drawn topical icons. Where this kit needs a generic UI icon (search, language, mail, phone, hamburger menu), it pulls from **Lucide** (CDN — `https://unpkg.com/lucide@latest`) at `1.5px stroke`, sized 24px, in `#798183`. **This is a substitution and is flagged.** A native OEKOBIT icon set would be needed for a production rebuild.

## Substitutions / open questions

- **Mulish:** loaded from Google Fonts. The Figma references the same family, so this should match exactly. (Flagging in case a self-hosted ttf is preferred.)
- **Lucide icons** for any non-OEKOBIT-original glyph (search, hamburger, mail, etc.). The original site likely has its own; we have no codebase to confirm.
- The Figma covers *navigation, headlines, infoboxes and one section template* but does **not** cover footer, forms, blog list, modal dialogs, table layouts, or mobile breakpoints. Anything in those areas in the UI kit is an extrapolation.

## Index

- `colors_and_type.css` — design tokens
- `assets/` — logo, photography, group map
- `preview/` — design-system tab cards (one per token group)
- `ui_kits/website/` — full website recreation (`index.html` + JSX components)
- `SKILL.md` — Agent SKILL packaging
