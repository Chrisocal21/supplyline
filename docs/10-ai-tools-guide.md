# Supplyline — Which AI for what

Written October 25, 2026. This is a reference for choosing a tool, not a ranking. What is marked "known" comes from how this project has actually been built. What is marked "not verified" is a pointer to check, not a claim.

---

## The short version

| Job | Use |
|---|---|
| Building features, fixing bugs, many files at once, running tests, looking at screenshots, releasing | Claude Code (what the project is built with) |
| A quick question while reading code, a rename, a one-file edit | Copilot, a small fast model (Haiku, Flash, Luna) |
| Writing a test or a small refactor in the editor | Copilot, Claude Sonnet |
| A second opinion on a risky change (saves, money, town growth) | Copilot, Claude Opus or GPT-6.1 Sol |
| Trivial things where it does not matter which answers | Copilot Auto |
| Icons, UI marks, simple flat art | Claude writes SVG or code-drawn art |
| Models (buildings, trucks, trees) | Built in code by Claude for now; real models come from an artist or a 3D tool later |
| Pictures, concept art, textures with painted detail | A separate image generator (see Art) |

Rule of thumb: the bigger the change and the more files it touches, the more it belongs in Claude Code. The smaller and more self-contained, the cheaper the model can be.

---

## Claude models

Known, from this project and the model list Copilot shows.

| Model | Strength | Use it for |
|---|---|---|
| Claude Haiku 5.5 | Fast and cheap | Explaining code, small edits, renames, quick lookups |
| Claude Sonnet 5.5 | Balanced; the daily driver | Multi-file edits, tests, bug fixes, refactors |
| Claude Opus 5.5 | Careful and thorough | Hard bugs, code review, design decisions with real cost if wrong |
| Claude Fable 5.1 | Most capable | The hardest problems; overkill for small tasks |

Claude Code runs these in a loop with tools: it reads the code, edits files, runs the tests, drives the game for screenshots, commits and tags releases. This is why it fits the big work.

## Copilot's model picker

Names seen in the picker. Only the Claude rows are known to me; the rest follow GitHub's own task guidance and a third-party guide, and are not tested here.

| Model | What it is said to be for | Status |
|---|---|---|
| Auto | Copilot picks for you and takes 10% off the cost. It picks by availability, not by how hard the task is | Documented |
| GPT-6 Luna | Fast and cheap, small tasks | Not verified |
| GPT-6.1 Sol | Deep reasoning and debugging across big codebases | Not verified |
| GPT-6 Astra | Unknown | Not verified |
| Gemini 3.8 Flash | Fast and cheap | Not verified |
| Gemini 4 Argon, Grok 4.7, Kimi K3, MAI-Code-1.1-Flash, HydraFusion | Could not be confirmed from any source | Not verified |

Cost: Copilot counts "premium requests", and each model has a multiplier. Small models cost under 1, big ones cost several. Check the multipliers on GitHub's supported models page before leaving a big model selected.

---

## Art

What Claude can and cannot do here.

Can do (known, this is how Supplyline's art is made):
- **SVG and code-drawn art:** icons, logos' simple marks, UI shapes, charts. Cheap to change and sharp at any size.
- **Procedural 3D models in code (Three.js):** every building, truck, tree and landmark in the game today. Easy to adjust, reads as low-poly, grounded art.
- **Canvas and shader art:** ground colours, water, sky, weather looks.
- **Looking at screenshots** of the game and saying what is wrong with the look.
- **Writing briefs:** `docs/09-model-and-art-brief.md` is the brief for an artist or a 3D tool, with scale and footprint rules.

Cannot do:
- Make photographs, painted concept art, or textured pictures from a prompt. Claude does not generate images.
- Make finished game-ready 3D models with sculpted detail and baked textures.

For those, use a separate image generator or 3D-from-image tool, or hire an artist. Names and prices change quickly and I have not verified any, so check before paying. Give them the brief in `docs/09`, the scale chart in `docs/scale.md`, and the model pictures in `docs/model-previews`.

Plan already in the project: the current in-code models are temporary and will be replaced later by artist or AI-made models, so do not polish the current ones. Fix terrain, culling and level of detail instead.

---

## Habits that save money and time

- Start small questions in Copilot's cheap model; escalate only if the answer is wrong or shallow.
- Put anything that edits many files, runs the game or ships a release in Claude Code.
- Ask for a second opinion from a different model on changes that touch saves, money or town growth.
- Whatever you use, run the tests (`npm test`) and look at the result on screen before calling it done.
- A model that sounds sure can still be wrong. Check names, numbers and versions against the live source.

## Keep this guide honest

When a model's strengths are confirmed (by use or by the vendor's docs), move it from "Not verified" to known, with the date. When a model disappears from the picker, delete its row.
