---
name: paper-argument-map
description: Reconstruct a research paper's motivation, claims, assumptions, and evidence as a source-linked argument map with an offline interactive reader. Use for understanding a paper's introduction, contribution logic, or evidential dependencies; not for citation-network discovery or causal identification from text alone.
---

# Paper Argument Map

Turn the supplied paper into an inspectable interpretation of its argument. The output is a reading aid, not a verdict on scientific truth. Default to the user's language. Provide Chinese and English display text when feasible; always keep evidence quotations in the source language.

## Inputs and scope

Work with the user's text, accessible paper, or supplied file. Prefer Introduction plus Abstract and Related Work for a motivation map. Add Methods, Results, or appendices only when available and relevant. Record exactly which sections were read. Use an available PDF reader when necessary; retain page/paragraph locators and flag uncertain extraction. Do not turn unavailable sections into assertions that the paper has no evidence.

Read [the graph contract](references/graph-contract.md) before constructing a map. For empirical finance/economics, also read [domain guidance](references/empirical-finance.md). These define interpretation choices rather than requiring every paper to fit one template.

## Construct the map

1. Preserve input passages with stable IDs and useful source locators. For plain UTF-8 text, `python scripts/paper_map.py prepare input.txt --title "Paper title" --out passages.json` creates a starting document. It splits paragraphs but does not analyze them.
2. Identify atomic statements and their roles: problem, prior knowledge, gap, research question, method, finding, contribution, assumption, limitation, or joint inference. Preserve qualifiers, population, period, and attribution to prior work. An introduction's announced result is an author-reported finding, not independently checked evidence.
3. Add relations only where the supplied text warrants them. A quotation at each endpoint is not by itself evidence for the arrow. Label every node and edge `explicit`, `inferred`, or `not_in_input`; explain inferred relations. Unavailable evidence becomes a scope-qualified unresolved item. Include parallel explanations and limitations when present.
4. Distinguish motivation (`motivates`, `addresses`) from evidential support (`supports`, `qualifies`, `contradicts`) and dependency (`requires`). This tool does not infer variable-level causal DAGs. For joint premises, use a `joint` node with incoming `requires` edges as described in the contract. Never turn several necessary premises into independently sufficient support.
5. Choose a small readable overview, usually 5–7 core nodes. Start from the central reading question; keep only the claims necessary to understand the main argument. Keep secondary details accessible. Add a concise `summary` for each node and retain the full statement in `label`. Never remove material qualifications merely to shorten a label. Provide `label_en`, `summary_en`, and `rationale_en` when the primary language is Chinese (use `_zh` for the reverse); translations must preserve meaning and attribution. Add `analysis.reading_title` and its translation as the plain-language reading question. There is no node quota: omit nonexistent roles. Preserve genuine cycles and disconnected fragments; flag them rather than silently deleting arrows to force a DAG.
6. Ground claims and relations in exact substrings of preserved passages. Distinguish verbatim text from translated/paraphrased labels. References inside the paper remain author-attributed citations unless the cited source was actually examined.

## Verify and deliver

Save the graph as JSON, then run:

```text
python scripts/paper_map.py validate paper.argument.json
python scripts/paper_map.py render paper.argument.json --out paper.argument.html
```

Resolve structural errors and nonexistent quotations. Warnings about cycles, inferred connections, or absent input evidence require inspection, not automatic removal. Open the rendered report in a browser and inspect both language views at desktop and phone widths: no truncated statements, overlapping cards, arrows through unrelated cards, or unreadably scaled text. Then audit the central path semantically: does every arrow follow from the cited text, do the conclusions retain their conditions, and are reported findings distinguished from verified results? Passing validation checks references and structure, not entailment or truth.

Deliver the HTML and JSON with a short account of input scope and unresolved interpretation issues. The HTML bundles its assets and works offline. Its map/outline views use the same extracted content. Readers can follow sources, edit labels and notes, accept or exclude items, and export their revised JSON or HTML, or save the visible figure as SVG. The default view is graph-first with evidence revealed on selection; UI language can be switched between Chinese and English. Editing changes the current language only; review the other translation after substantive edits. Exclusions are recorded rather than erasing source data. Reanalysis of a revision must preserve the original file and the user's review history.

For a new paper, generate the structured map using the current assistant's analysis. The bundled scripts do not contain a model or call an API. Do not suggest that file parsing or successful rendering means an automatic scientific analysis has been verified.
