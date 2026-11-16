---
title: pytest-html User Guide
type: raw
summary: The pytest-html guide shows a pytest plugin that writes one HTML report per invocation, with hooks to add summary text, environment rows, extra content and columns.
tags: [operations]
aliases: []
source: https://pytest-html.readthedocs.io/en/latest/user_guide.html
accessed: 2026-11-16
published: unknown
provider: pytest-html documentation (Read the Docs)
up: "[[library/wiki/operations|Operations]]"
related: []
created: 2026-11-16
updated: 2026-11-16
---

# pytest-html User Guide

> [!quote] Source
> **URL**: https://pytest-html.readthedocs.io/en/latest/user_guide.html
> **Accessed**: 2026-11-16
> **Method/Context**: Gathered for SMR-361 (benchmarking the slopify workflows). The findings below were reported by a researcher from the user guide page. The docs were built with Sphinx 7.4.7; the plugin version is not stated. Wording is paraphrase or quotation as marked on each bullet.

## Key evidence

- pytest-html is a general reporting plugin for pytest. It is relevant here only if the benchmark is run as pytest. (inference from the plugin's scope, not a page statement) ^e1
- `pytest --html=report.html --self-contained-html` writes one HTML file, with one report per invocation. (quote and paraphrase) ^e2
- Hooks let a project add summary text, environment table rows, extra raw HTML, JSON, text or image content, and table columns. (paraphrase) ^e3
- Images added as files or links stay external resources even with `--self-contained-html`. (paraphrase) ^e4

## Limitations

- The plugin version is not stated; the docs were built with Sphinx 7.4.7.
- The page is a user guide for pytest, not a benchmark or eval tool. Whether it fits the slopify benchmark depends on running the benchmark as pytest, which this source does not address.

## Relevance

- A candidate way to produce a single-file HTML report per benchmark run, if the benchmark runs as pytest (^e1, ^e2). The hooks in ^e3 could carry run metadata and extra content; ^e4 means images would not be embedded in the single file.
