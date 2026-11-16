"""
Unified, provider-agnostic LLM client.

GitHub Models — this project's original LLM backend, used by every LLM call
site (retriever.py query expansion/multi-hop, generator.py answer generation
and self-verification, question_generator.py, answer_evaluator.py, and
evaluation/eval_comprehensive.py's judge calls) — was permanently retired by
GitHub on 2026-07-30. This module replaces every direct provider SDK
instantiation with one client that:

  - is entirely configured through .env — switching providers or changing
    priority never requires a code change
  - tries providers in the order given by LLM_PROVIDER_ORDER, falling over to
    the next configured provider if one fails after its own short retry
    budget (see providers.py) — a call only returns empty once EVERY
    configured provider has failed
  - exposes one call signature regardless of provider

See LLM_CLIENT.md for the full environment variable reference.
"""

import os
from dotenv import load_dotenv

load_dotenv()

HERE = os.path.dirname(os.path.abspath(__file__))
import sys
sys.path.insert(0, HERE)
from providers import PROVIDER_REGISTRY, ProviderNotConfigured, ProviderCallFailed  # noqa: E402

DEFAULT_PROVIDER_ORDER = ["azure", "nemotron", "gemini", "claude"]


class LLMClient:
    def __init__(self, provider_order=None):
        order = provider_order or os.environ.get("LLM_PROVIDER_ORDER", "")
        if isinstance(order, str):
            order = [p.strip().lower() for p in order.split(",") if p.strip()]
        if not order:
            order = DEFAULT_PROVIDER_ORDER

        self.providers = []
        for name in order:
            factory = PROVIDER_REGISTRY.get(name)
            if factory is None:
                print(f"[LLMClient] Unknown provider '{name}' in LLM_PROVIDER_ORDER — skipping. "
                      f"Valid options: {list(PROVIDER_REGISTRY)}")
                continue
            try:
                self.providers.append(factory())
                print(f"[LLMClient] '{name}' configured.")
            except ProviderNotConfigured as e:
                print(f"[LLMClient] Skipping '{name}': {e}")

        if not self.providers:
            print("[LLMClient] WARNING: no providers configured — every call will return empty. "
                  "Set LLM_PROVIDER_ORDER and the matching credentials in .env (see llm/LLM_CLIENT.md).")

        self.last_provider_used = None  # which provider actually served the most recent call() — useful
        # for evaluation/ to report which model backed a given answer once providers can differ per-request.

    @property
    def available(self) -> bool:
        return len(self.providers) > 0

    def call(self, prompt: str, temperature: float = 0.3, max_tokens: int = 2048) -> str:
        for provider in self.providers:
            try:
                result = provider.call(prompt, temperature, max_tokens)
                self.last_provider_used = provider.name
                return result
            except ProviderCallFailed as e:
                print(f"[LLMClient] Provider '{provider.name}' failed, trying next: {e}")
                continue
        self.last_provider_used = None
        if self.providers:
            print("[LLMClient] All configured providers failed for this call.")
        return ""
