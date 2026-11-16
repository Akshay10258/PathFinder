# Unified LLM Client

## Why this exists

Every LLM call in this project — query expansion and multi-hop retrieval
(`retrieval/retriever.py`), answer generation and self-verification
(`generation/generator.py`), the practice loop
(`generation/question_generator.py`, `evaluation/answer_evaluator.py`), and
the evaluation judge (`evaluation/eval_comprehensive.py`) — used to call
**GitHub Models** (`https://models.github.ai/inference`) directly through
the OpenAI SDK. GitHub permanently retired that service on **2026-07-30**
([changelog](https://github.blog/changelog/2026-07-30-github-models-is-now-retired/)):
the playground, model catalog, inference API, and BYOK option are all gone,
for existing customers too, with no successor endpoint at that URL.

`llm/client.py` replaces every one of those direct SDK instantiations with a
single, provider-agnostic client so:
- switching providers, or their priority order, is a `.env` edit, never a
  code change
- a provider outage doesn't take the whole system down with it — the client
  fails over to the next configured provider automatically

## Configuration

All of this lives in `.env` (loaded via `python-dotenv`, same as the rest of
the project):

```env
# Order to try providers in — first = primary, rest = fallback chain.
LLM_PROVIDER_ORDER=azure,gemini,claude

# Azure OpenAI / Microsoft Foundry
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_DEPLOYMENT=
AZURE_OPENAI_API_VERSION=2026-01-01-preview   # has this default if unset

# Google Gemini
GEMINI_API_KEY=
GEMINI_MODEL=

# Anthropic Claude
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
```

A provider is only instantiated if **all** of its required variables are
set; otherwise `LLMClient` logs that it's skipping it and moves on — an
unconfigured provider never crashes the process. `LLM_PROVIDER_ORDER` can
name any subset or ordering of `azure`, `gemini`, `claude` — set just one
for a single-provider setup, or list several to build the priority chain
described below. Model IDs (`AZURE_OPENAI_DEPLOYMENT`, `GEMINI_MODEL`,
`ANTHROPIC_MODEL`) are deliberately **not** hardcoded anywhere in this
codebase — model names are retired and replaced far more often than this
code should need editing, so pick whatever current model you have access to
per provider and put its exact ID in `.env`.

## How the fallback chain works

```
LLMClient.call(prompt, ...)
  -> try providers[0] (e.g. azure)
       -> its own MAX_RETRIES=2 retries, 2s/4s backoff, only on rate-limit-shaped errors
       -> raises ProviderCallFailed if still failing
  -> try providers[1] (e.g. gemini)
       -> same retry budget
  -> try providers[2] (e.g. claude)
  -> if all configured providers fail: returns "" and logs it
```

Every call site already treats an empty string as "the LLM call failed" and
degrades gracefully (rule-based-only query expansion, a fallback answer
built from raw retrieved chunks, etc.) — that behavior predates this module
and is unchanged; `LLMClient` just changes *how many chances* a request gets
before reaching that fallback path.

**Why each provider only retries twice, briefly** (contrast with the
original GitHub-Models-only code, which retried up to 6 times with backoff
as long as 128 seconds): back then there was nothing else to fall over to,
so a dead endpoint was worth waiting out. Now, spending two minutes retrying
a genuinely-down provider before trying the *next configured one* would be
strictly worse than failing over in a few seconds — this is exactly the
failure mode that caused the GitHub Models outage to be caught by a plain
smoke test rather than silently retried into a multi-minute hang.

`LLMClient.last_provider_used` records which provider actually served the
most recent `call()` (or `None` if every provider failed) — `generator.py`
surfaces this in its response metadata (`metadata.model`) so it's visible
which backend actually answered a given request, useful once cost/quality
differs across providers.

## Adding a provider

Each provider in `llm/providers.py` is independent: a class with
`name`, `__init__` (raise `ProviderNotConfigured` if required env vars are
missing), and `call(prompt, temperature, max_tokens) -> str` (raise
`ProviderCallFailed` after exhausting its own short retry budget). Register
it in `PROVIDER_REGISTRY` and it's immediately selectable via
`LLM_PROVIDER_ORDER` — no changes needed anywhere else in the codebase.
