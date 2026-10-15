# Argument graph contract (v0.1)

The JSON document has these required fields:

```json
{
  "schema_version": "0.1",
  "paper": {"title": "Example", "authors": "Author", "year": 2026,
    "url": "https://example.org/paper", "source_kind": "user_supplied",
    "license": "User supplied; do not redistribute without permission"},
  "analysis": {"language": "zh", "input_scope": "Introduction only",
    "notice": "Author claims reconstructed from the supplied text; not independently verified.",
    "generator": "Assistant-assisted reconstruction", "created_at": "2026-10-15"},
  "passages": [{"id": "P1", "section": "Introduction", "locator": "Paragraph 1",
    "text": "Existing studies cannot distinguish the two explanations."}],
  "nodes": [{"id": "N1", "role": "gap", "label": "Two explanations remain unresolved",
    "status": "explicit", "core": true,
    "basis": [{"passage_id": "P1", "quote": "cannot distinguish the two explanations"}],
    "rationale": "", "review": "unreviewed", "note": ""}],
  "edges": [],
  "revisions": []
}
```

Required paper fields: `title`, `source_kind`. Other bibliographic fields are optional. Source kinds: `user_supplied`, `open_access`, `synthetic`. Redistributed passages need appropriate permission and attribution; synthetic text must be clearly marked.

Required analysis fields: `language`, `input_scope`, `notice`. Optional `generator` and `created_at` make the reconstruction's provenance visible. Avoid calling an assistant-produced map expert-validated.

Passage `id`, `section`, `locator`, `text` must be nonempty. IDs are unique. Preserve paragraph text and citation markers; do not manufacture PDF page numbers from HTML sections. Quote matching is exact against the saved normalized passage text, not against a remote page's byte representation.

Node fields: `id`, `role`, `label`, `status`, `core`, `basis`, `rationale`, `review`, `note`. Roles: `problem`, `prior`, `gap`, `question`, `method`, `finding`, `contribution`, `assumption`, `limitation`, `joint`. `core` is Boolean. Labels are short statements, not topic keywords; each stands alone outside paragraph context.

Edge fields: `id`, `source`, `target`, `relation`, `status`, `basis`, `rationale`, `review`, `note`. IDs must be globally distinct from node IDs. Endpoints must exist. Relations and directions:

| Relation | Direction / meaning |
|---|---|
| `motivates` | problem or gap → research question/design |
| `addresses` | proposed question/method/contribution → issue it addresses |
| `supports` | evidence/premise → claim it supports, without asserting sufficiency |
| `reports` | study design → author-reported finding (a reporting link, not independent validation) |
| `qualifies` | condition/limitation → statement whose scope it restricts |
| `contradicts` | counterclaim/evidence → challenged claim |
| `requires` | necessary premise → joint inference (the premise is needed for that inference) |

For A AND B jointly supporting C, use A → J and B → J with `requires`, followed by J → C with `supports`. J is a `joint` node with `status: inferred` and a rationale explaining the reconstruction. This avoids treating A and B as independently sufficient. Require at least two `requires` inputs. Ordinary `supports` edges do not assert logical sufficiency or causality.

Each basis entry contains `passage_id` and a nonempty `quote` that is an exact substring of that passage. Multiple quotations are allowed. `explicit` items require at least one basis. `inferred` items require a basis and a nonempty rationale. `not_in_input` items require a rationale naming the missing evidence and the input boundary; they can have an empty basis. Mark inferred edges even when both endpoints are explicit. A question formulated by the reader can be inferred, rather than falsely presented as a verbatim author statement.

Review states: `unreviewed`, `accepted`, `excluded`. They record a reader's assessment of the reconstruction, not scientific validity. Excluding a node hides its incident edges, while retaining the original edge review states and data. UI edits append `{timestamp, item_id, before, after}` to `revisions`; export is explicit, and no server receives the report. Imported JSON is validated before rendering.

Structural checks: IDs, required fields, types, endpoint validity, quote existence, allowed labels, and joint-premise structure. Warnings: no nodes, cycles (including motivation/response cycles), unsupported input items, inferred items, isolated nodes, and core-view omissions. Cycles are preserved. Neither cycle warnings nor a clean validator result establish a scientific reasoning flaw or correctness.

## Optional display fields (reader v0.2, schema still 0.1)

- Nodes may include `summary` for the short statement shown on the map. `label` retains the complete statement. Summaries must preserve attribution and material qualifications.
- Nodes may include `label_en`, `label_zh`, `summary_en`, `summary_zh`; nodes and edges may include `rationale_en` and `rationale_zh`. These are human/assistant translations, never new evidence. Every present display field must be a string.
- Analysis may include `reading_title`, `reading_title_en`, `reading_title_zh`, and translated `input_scope` / `notice` fields with `_en` or `_zh` suffixes.
- Unsuffixed fields use `analysis.language`. Missing translations fall back to existing text; the reader does not invent translations. Review both languages after an edit. Quotations and source passages remain unchanged.
- `reader_preferences` optionally stores `language` (`zh` or `en`) and `mode` (`core` or `full`) for export/reopen. It carries no scientific meaning.
- A core view typically contains 5–7 nodes. Hide secondary context by setting `core: false`; never delete an existing relation or evidence just to simplify the view. Phones stack the same selected nodes in a reading column and preserve actual links, including back-links.
