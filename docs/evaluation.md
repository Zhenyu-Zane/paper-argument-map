# Research evaluation plan

## Claim to test

Does a source-grounded argument map improve readers' understanding of a paper's contribution and its conditions, beyond a content-matched structured outline?

The existing three example maps are illustrations, not a benchmark. They have not been independently reviewed for completeness or semantic accuracy. No user study has been run.

## Technical validation snapshot (2026-10-15)

The initial delivery passed 12 Python tests and the headless Microsoft Edge/Playwright interaction suite on Windows. Browser checks covered all three example files, source navigation, editing, exclusion/restoration, imported graph validation, exported JSON validation, exported HTML reopening, script-injection payload handling, and desktop/mobile layout. The generated report made no HTTP(S) requests during those checks. The skill's bundled metadata validator also passed. These checks establish the tested software behavior, not extraction accuracy, scientific validity, or improved comprehension.

## Two separate evaluations

### Reconstruction quality

Recruit domain-competent annotators to independently identify the main question, gap, contribution, key assumptions, and inferential links in a held-out paper set. Record disagreement rather than imposing a single exact graph topology. Evaluate central-claim coverage, source-span fidelity, relation correctness and direction, qualifier preservation, and inferred/explicit attribution errors. Distinguish an author-reported result from independently supported evidence. Split development and evaluation by paper, not paragraph.

Use strong baselines: a direct model-to-graph prompt and a staged extraction with source checks, holding the model and input scope constant. Script validation is a constraint check, not a semantic score. Report input parsing failures separately. Test more than the three illustrative PLOS papers and include multiple journals, designs, and paper-quality levels.

### Reader outcomes

Compare original text, original text plus a structured outline, and original text plus a map. The outline and map must use exactly the same extracted propositions, relations, and source spans; the reader's two display modes help prepare these conditions but are not a complete experiment runner. Disable condition switching during a study and balance assignment by paper, reader expertise, and order. Avoid having the same participant learn the same paper in several conditions.

Measure question-answer accuracy against a blinded rubric, time to locate supporting passages, identification of contribution conditions, and confidence on each answer. Analyze the gap between confidence and correctness. Record necessary corrections and source visits. Graph preference alone is not a learning outcome.

Use a small qualitative pilot to refine tasks and estimate variance; plan a properly powered confirmatory study separately. Do not treat 5–10 convenience users or the three examples as statistical evidence of superiority. Collect usage logs only with participants' informed agreement; the current offline reader has no telemetry.

## Hypotheses worth investigating

- Source-linked maps may help readers identify dependencies and locate evidence.
- Unsupported but fluent edges may increase confidence without increasing understanding.
- Visible uncertainty and source inspection may mitigate that effect.
- Benefits may depend on reader expertise, paper type, and graph density.

These are hypotheses, not established product claims.
