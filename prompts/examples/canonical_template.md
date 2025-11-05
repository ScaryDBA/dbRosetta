Title: "<Short descriptive title>" Version: "MAJOR.MINOR.PATCH" Author: "@githubHandle" Date: "YYYY-MM-DD" ModelSettings: { temperature: 0.0, max_tokens: 512, top_p: 1.0, seed: <optional> }

Intent One short sentence describing the goal of this prompt (what observable outcome it must produce).

Context 1–3 short paragraphs describing where this prompt fits, assumptions, and constraints relevant to the model.

Input Contract

name: <input_name>; type: <file|string|json>; required: <true|false>; description: <short>

name: <...>

Output Contract

name: <output_name>; type: <file|string|json>; format: <sql|json|text>; validation: <schema path or rule>

list all expected output artifacts and their exact shapes

Acceptance Criteria

Short, testable sentence 1 (maps to a CI test)

Short, testable sentence 2

Short, testable sentence 3 (Include 3–6 criteria; each becomes an automated or human-checkable assertion)

Guardrails

Hard rule 1 the model must never violate (e.g., "Do not fabricate authoritative URLs")

Ambiguity handling rule (e.g., "If uncertain, set preferred=null and populate mapping_report")

Output containment rule (e.g., "Return only the Output Contract; no extra commentary")

Template Prompt (literal to send to model) SYSTEM: <one-sentence system role> USER: <literal prompt text with named placeholders, e.g.:> Translate the term "{{term}}" from "{{from_dialect}}" to "{{to_dialect}}". Options: {{options}}. Produce exactly the JSON described in the Output Contract. Follow Acceptance Criteria and Guardrails. Use model settings from frontmatter.

Examples (minimum required)

fixtures/minimal/input.json -> expected/minimal/output.json (happy path)

fixtures/edge/input.json -> expected/edge/output.json (edge case or ambiguous)

Post Processing

Command or check 1 (e.g., validate JSON schema at schemas/<file>.json)

Command or check 2 (e.g., run linter or apply to ephemeral DB)

Artifact persistence (e.g., write artifacts/<run_id>/)

Telemetry keys to record

prompt_version, model_settings, fixtures_hash, run_id, timestamp

Notes

Implementation notes, caveats, or links to related templates (optional).

Location for fixtures: prompts/examples/<slug>/