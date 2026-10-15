---
name: paper-argument-map
description: Reconstruct a research paper's motivation, claims, assumptions, and evidence as a source-linked argument map with an offline interactive reader. Use for understanding a paper's introduction, contribution logic, or evidential dependencies; not for citation-network discovery or causal identification from text alone.
---

# Paper Argument Map

Turn the supplied paper into an inspectable interpretation of its argument. The output is a reading aid, not a verdict on scientific truth. Default the reader to **English + Plain language**, unless the user specifies otherwise. Provide switchable English/Chinese and Plain/Technical wording; always keep evidence quotations in the source language. Reply to the user in their conversational language.

## Inputs and scope

Work with the user's text, accessible paper, or supplied file. Prefer Introduction plus Abstract and Related Work for a motivation map. Add Methods, Results, or appendices only when available and relevant. Record exactly which sections were read. Use an available PDF reader when necessary; retain page/paragraph locators and flag uncertain extraction. Do not turn unavailable sections into assertions that the paper has no evidence.

Read [the graph contract](references/graph-contract.md) and [readability review](references/readability-review.md) before constructing a map. For empirical finance/economics, also read [domain guidance](references/empirical-finance.md). These define interpretation choices rather than requiring every paper to fit one template.

## Construct the map

1. Preserve input passages with stable IDs and useful source locators. For plain UTF-8 text, `python scripts/paper_map.py prepare input.txt --title "Paper title" --out passages.json` creates a starting document. It splits paragraphs but does not analyze them.
2. Identify atomic statements and their roles: problem, prior knowledge, gap, research question, method, finding, contribution, assumption, limitation, or joint inference. Preserve qualifiers, population, period, and attribution to prior work. An introduction's announced result is an author-reported finding, not independently checked evidence.
3. Add relations only where the supplied text warrants them. A quotation at each endpoint is not by itself evidence for the arrow. Label every node and edge `explicit`, `inferred`, or `not_in_input`; explain inferred relations. Unavailable evidence becomes a scope-qualified unresolved item. Include parallel explanations and limitations when present.
4. Distinguish motivation (`motivates`, `addresses`) from evidential support (`supports`, `qualifies`, `contradicts`) and dependency (`requires`). This tool does not infer variable-level causal DAGs. For joint premises, use a `joint` node with incoming `requires` edges as described in the contract. Never turn several necessary premises into independently sufficient support.
5. Choose an overview that tells a complete main story, including a consequential condition or unresolved explanation. Do not optimize for a fixed number of boxes or force a linear chain. Keep secondary detail accessible. Write `summary` and full `label`, with English/Chinese versions, then separately write `plain_summary_en/zh` and `plain_label_en/zh`. Plain wording explains the idea in everyday language; Technical keeps useful terms and clarifies their role. Neither may omit material qualifications. Provide corresponding rationale translations and short, explanatory `caption_en/zh` and `plain_caption_en/zh` on edges. Add a readable `analysis.reading_title` and its translations. Preserve genuine cycles and disconnected fragments; flag them rather than deleting arrows to force a DAG.
6. Ground claims and relations in exact substrings of preserved passages. Distinguish verbatim text from translated/paraphrased labels. References inside the paper remain author-attributed citations unless the cited source was actually examined.

## Verify and deliver

Save the graph as JSON, then run:

```text
python scripts/paper_map.py validate paper.argument.json
python scripts/paper_map.py audit paper.argument.json
python scripts/paper_map.py render paper.argument.json --out paper.argument.html
```

Before final export, perform the cold-reader and visual passes in [readability review](references/readability-review.md). Record answers to why, unknown, how, result and limits in `analysis.readability_review`, along with actual revisions and unresolved issues. Read each source-node + caption + target-node as a statement and verify it against the cited text. Compare both wording levels for equivalent meaning. Inspect actual renders in both languages, main/full views and a narrow viewport; repair overlapping captions, obscured arrowheads and ambiguous branches. Then rerun affected checks. `audit` verifies the presence of wording/captions/review records, not comprehension or semantic correctness. Do not deliver an uninspected figure as visually verified or describe self-review as a human reader study.

Deliver the HTML and JSON with a short account of input scope and unresolved interpretation issues. The HTML bundles its assets and works offline. Its map/outline and Plain/Technical views share the same analysis. Readers can inspect sources, edit wording and notes, accept/exclude items and export JSON, HTML or SVG. Edits affect the selected language and wording level; review other versions after substantive edits. Exclusions preserve the data. Reanalysis must retain the original file and review history. For a report collection, pass `--home index.html` so the top-left brand returns to its homepage. A standalone or downloaded report uses an embedded landing view instead.

For a new paper, generate the structured map using the current assistant's analysis. The bundled scripts do not contain a model or call an API. Do not suggest that file parsing or successful rendering means an automatic scientific analysis has been verified.
