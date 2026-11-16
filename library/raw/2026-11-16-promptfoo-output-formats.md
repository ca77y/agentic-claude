---
title: promptfoo output formats (HTML report)
type: raw
summary: promptfoo docs on output formats; `promptfoo eval --output report.html` writes a self-contained, shareable HTML report, and JSON, CSV and JUnit XML outputs exist too.
tags: []
aliases: [promptfoo configuration outputs, promptfoo HTML report]
source: https://www.promptfoo.dev/docs/configuration/outputs
accessed: 2026-11-16
published: unknown
provider: context7 (/promptfoo/promptfoo, v0.125.1 listed)
up: "[[library/_meta/index|Library Index]]"
related: ["[[library/raw/2026-11-16-promptfoo-github-repo]]", "[[library/raw/2026-11-16-promptfoo-test-cases-repeat]]"]
created: 2026-11-16
updated: 2026-11-16
---

# promptfoo output formats (HTML report)

> [!quote] Source
> **URL**: https://www.promptfoo.dev/docs/configuration/outputs
> **Accessed**: 2026-11-16
> **Method/Context**: promptfoo documentation page `configuration/outputs`, read through context7 while researching SMR-361 (benchmarking the slopify workflows against a bare model). The page itself was not fetched from the website. Publication date and page version unknown; the indexed library version listed by context7 is v0.125.1.

## Key evidence

- promptfoo writes a self-contained HTML report with `--output`. Quote: "promptfoo eval --output report.html ... Shareable standalone file ... Interactive table with sorting and filtering; side-by-side output comparison; pass/fail statistics". The quote joins excerpts; the ellipses mark elisions. ^e1
- The same `--output` option also writes JSON, CSV and JUnit XML. Paraphrase of the docs as retrieved; the exact flag syntax per format was not recorded. ^e2

## Limitations

- Read through context7 excerpts only; the full page and any later changes were not checked.
- The retrieved text lists "pass/fail statistics" in the report, but not whether it includes confidence intervals or paired comparisons between two configurations. That is not found, not confirmed absent.
- Publication date unknown; version is as listed by context7 (v0.125.1).

## Relevance

- Bears on how the results of a slopify-plugin arm against a bare-model arm could be shared: a standalone HTML file with a side-by-side view of outputs, plus machine-readable JSON, CSV and JUnit XML for further analysis.

## Update 2026-11-16

> [!quote] Source
> **URL**: https://www.promptfoo.dev/docs/configuration/outputs/ (the same page as above, now fetched from the website)
> **Accessed**: 2026-11-16
> **Method/Context**: Second reading for SMR-361, this time of the live page. The page footer says "last updated Nov 16, 2026"; no tool version is stated on the page. Entries marked "quote" give the page's own wording; entries marked "paraphrase" or "inference" are the researcher's wording.

### Key evidence

- A single HTML report is written to the path given to `--output`. Quote: "Save as HTML report: promptfoo eval --output results.html" and "HTML outputs are self-contained ... No external dependencies required". ^e3
- The HTML report contains an interactive table with sorting and filtering, side-by-side output comparison, and pass/fail statistics (paraphrase). The page lists latency, token usage and estimated cost among the "detailed metrics" in outputs. Quote: "Latency: Response time in milliseconds; Token Usage; Cost: Estimated API costs". The page does not say whether the HTML view itself shows these metrics, only that JSON/CSV output includes them when available. ^e4
- Supported output formats are csv, txt, json, jsonl, yaml, yml, html, xml and junit.xml, and several can be requested in one run. Quote: "Generate multiple formats simultaneously". ^e5
- The output path is set per invocation, so a calling script can choose the directory. The page shows `--output` with a path, an `outputPath:` setting in the config file, and several `--output` flags in one run (for example html plus json). Inference: a script could compute `<version>-<date>[-N]/report.html` and pass it in. ^e6
- The docs give a date-in-name pattern and a `.gitignore` example for output files. Quote of the command: `promptfoo eval --output "results/$(date +%Y%m%d)-gpt4-temperature-test.html"`. The example `.gitignore` excludes `evaluations/*.html` and `*.json` while keeping the summary csv (paraphrase). The page describes no `-N` repeat suffix and no version in the name, so the directory name would be script glue (inference). ^e7
- `promptfoo view` is a separate local web viewer with live updates, and `promptfoo share` creates a hosted shareable link. Neither is a static file (paraphrase). ^e8
- HTML and JSON exports include the eval config, with sensitive fields redacted on a best-effort basis. Quote: "Sensitive fields are redacted using Promptfoo's sanitizer rules on a best-effort basis (not comprehensive)". Inference: a report committed to a repository could leak non-sensitive `config.env` values. ^e9

### Limitations

- This update rests on the one docs page. It says nothing on where promptfoo stores eval history, whether `--output` files are a complete record of a run, or how the HTML report behaves for large result sets.
- The page states no tool version, so which promptfoo release the behaviour belongs to is unknown. The earlier section's v0.125.1 comes from context7, not from this page.
- Whether the HTML report shows latency, tokens or cost was not established; only the JSON/CSV claim is on the page.

### Relevance

- Bears on SMR-361's per-run report requirement: promptfoo can write a self-contained HTML file and a JSON file to a caller-chosen directory, with date-in-name and gitignore guidance on the page, but the `<version>-<date>[-N]` naming would need a wrapper.
- The config-redaction caveat matters if reports are committed to the repository.
