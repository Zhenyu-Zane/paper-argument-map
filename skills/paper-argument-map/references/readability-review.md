# Review the map as a reader

Read this before drafting a new map and use it again before delivery. The goal is an understandable, faithful argument, not the fewest boxes or a predetermined number of nodes.

## Two wording levels, one analysis

Default to **English + Plain language** unless the user chooses otherwise. Supply Chinese as a switchable interface and wording option. Keep source quotations in their original language.

- Plain language: use concrete subjects and actions. Explain what a method is doing, what is unknown, and what the result can establish. Replace “financing-constraint mediation” with “whether easier access to funding helps explain the innovation gains.” Do not replace a qualified association with a causal statement.
- Technical: retain useful domain terms, but identify their role. For example, “mediation tests (the proposed funding pathway)” is more informative than “mechanism analysis.” Expand uncommon acronyms on first use. Avoid strings of abstract nouns or redundant qualifications.
- Use full, independently understandable sentences or questions in nodes. A short display statement can omit secondary implementation detail but must retain material conditions, scope, direction, and author/reader attribution. If shortening makes the claim misleading, allow a larger node.
- Use a short explanation on **each desktop arrow**, such as “defines the unanswered question,” “authors report this pattern,” or “needs another explanation ruled out.” Read source + caption + target aloud. “Supports” or “motivates” alone is usually insufficient when the relationship is not obvious. Captions cannot strengthen the underlying relation.
- Both wording levels share exactly the same node IDs, topology, source spans, statuses and review history. Switching levels is rewriting, not a new analysis. Preserve the original interpretation and record substantive edits.

## Cold-reader pass: required before delivery

Inspect the rendered map without using its inspector to fill gaps in the main story. Answer these questions from the map itself:

1. Why does this problem matter?
2. What exactly remains unknown, and what does this paper ask?
3. What did the authors do to address the question?
4. What do they report, and what do they claim this adds?
5. What condition, unresolved explanation or input-scope limit constrains the interpretation?

If an answer requires guessing what an acronym means, supplying an omitted premise, or treating an unverified finding as established fact, rewrite the relevant node/caption or restore the missing branch. Do not insert a condition or result that the input does not warrant just to fill a template. Record absent evidence with the actual input scope.

Then compare Plain and Technical, in both languages, against the preserved source. Check polarity, qualifiers, population/time scope, uncertainty, and reported versus verified results. Review feedback links and joint premises explicitly. Write a short record in `analysis.readability_review`: `reviewer`, five `answers` (`why`, `unknown`, `how`, `result`, `limits`), `changes`, and `unresolved`. Call assistant self-review what it is; do not describe it as expert validation or evidence that all readers understand the figure. The audit command checks record completeness, not whether the answers are true.

## Visual and interaction pass

Render and inspect actual screenshots of both wording levels and languages, with main and expanded views. Check that:

- all node and caption text fits without truncation;
- arrows remain traceable through branches, do not travel through cards or another relation's caption, and end in visible arrowheads;
- capsules explain their own arrow, not a neighboring one; labels do not overlap each other;
- a condition is visibly attached to the claim it limits; multiple necessary premises are not shown as independently sufficient;
- the selected-node inspector, zoom and narrow-screen layout still permit reading the map;
- the top-left brand returns to the supplied homepage; a portable single report has its own landing view;
- switching language/wording does not discard edits, and exported reports preserve the chosen view.

Use light blue rounded nodes, dark blue readable text, neutral connectors and explicit relationship captions as the default visual language. Preserve useful branching rather than imposing a single linear chain. Let logical complexity determine how much space the figure needs. If expanded layout remains hard to follow, revise placement and routing or provide a clearly named focused path; do not hide a scientific dependency to make a screenshot cleaner.

Fix the issues found and repeat the affected checks. If browser rendering cannot be inspected, disclose that limitation and keep the output labeled as awaiting visual review. Never claim comprehension has been tested on human readers when only a self-review and software checks were performed.
