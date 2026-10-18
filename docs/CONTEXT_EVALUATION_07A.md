# Task 07A offline evaluation manifest and A/B table

Fixture version: `grounding-fixtures-v1`. Context: `source-context-v1`. Behavior: `source-grounding-v1`.
Committed definitions and expected answers/evidence: [synthetic fixtures](../tests/context/fixtures.ts).
All PDF and caption material is fictional and authored for these tests. No private source snapshots.

A serializes the entire plain fullText with identity, expiry and separator metadata. B serializes every ordered section with its original text, stable ID, page number or fractional timing and the explicit join separator. B does not duplicate fullText. The identical behavior array is outside source data in both envelopes. Plain A has no section labels in its source data; citations should use only references available in that variant. The expected evidence IDs below are the evaluator's reference in both arms.

Each source has 12 questions: six facts (two each beginning/middle/end), two synthesis/comparison, two follow-ups, one absent answer and one malicious embedded instruction case. `follows` in the definitions identifies the earlier question to ask before each follow-up. Empty evidence on the absent case means absence across the **entire source**, not a missing annotation. End-marker/serialization tests establish complete inclusion, not model grounding or injection resistance. No superiority claim for B; section labels and escaping can increase size.

Actual model, tokenizer, provider, transport, build, device, history policy, capacity verification, provider acknowledgement, run time and experiment cost: **NOT_RUN**. No model answers have been generated. The test measurement is UTF-8 byte length, labeled `synthetic-units`, never a tokenizer or production capacity. Model binding and live evaluation require a later PM brief; do not enable keys or routes to fill this table under 07A.

For a future reviewed run, hold instructions/model/settings/output reserve constant between A/B. Start a fresh conversation for each independent question; for follow-ups replay only the declared precursor and its actual answer. Record actual answers and cited evidence separately, correctness against the authored expected answer, and question-send to first response plus complete response latency. Voice must additionally measure first audible response and real interruption. Mark absent/malicious success only from observed model behavior; serialization alone earns no accuracy point. Keep voice/text results distinct while using the same source/prompt versions.

| Question | Expected evidence IDs | A accuracy | A latency | B accuracy | B latency |
|---|---|---|---|---|---|
| pdf-q1 | page-1 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| pdf-q2 | page-2 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| pdf-q3 | page-4 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| pdf-q4 | page-5 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| pdf-q5 | page-6 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| pdf-q6 | page-8 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| pdf-q7 | page-4, page-5 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| pdf-q8 | page-2 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| pdf-q9 | page-4, page-5; follows pdf-q7 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| pdf-q10 | page-6; follows pdf-q5 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| pdf-q11 | absent across entire source | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| pdf-q12 | page-1, page-7 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| cap-q1 | segment-1 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| cap-q2 | segment-2 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| cap-q3 | segment-3 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| cap-q4 | segment-4 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| cap-q5 | segment-5 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| cap-q6 | segment-7 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| cap-q7 | segment-3, segment-4 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| cap-q8 | segment-5, segment-7 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| cap-q9 | segment-3, segment-4; follows cap-q7 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| cap-q10 | segment-7; follows cap-q6 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| cap-q11 | absent across entire source | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |
| cap-q12 | segment-1, segment-6 | NOT_RUN | NOT_RUN | NOT_RUN | NOT_RUN |

Keep subsequent prompt/context changes as separate versioned iterations. Never replace NOT_RUN with a mocked answer or infer physical phone/audio behavior from these offline fixtures.
