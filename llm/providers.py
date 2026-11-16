"""
Per-provider adapters for LLMClient (see client.py). Each provider:

  - raises ProviderNotConfigured at construction if its required env vars are
    missing, so LLMClient can silently skip it instead of crashing the whole
    process over one unset key.
  - retries its own transient/rate-limit errors a SHORT, bounded number of
    times (2 attempts, 2s/4s backoff) before raising ProviderCallFailed.
    This is deliberately shorter than the single-provider GitHub Models code
    it replaces (which retried up to 6 times, backing off as far as 128s)
    because there was nothing to fall over TO back then. Now, a dead
    provider should hand off to the next one in seconds, not minutes.

All three expose the same call(prompt, temperature, max_tokens) -> str
signature regardless of the underlying SDK.
"""

import os
import time


class ProviderNotConfigured(Exception):
    """Raised at construction when a provider's required env vars are missing."""


class ProviderCallFailed(Exception):
    """Raised after a provider exhausts its own retries — triggers LLMClient failover."""


MAX_RETRIES = 2
RETRY_BASE_DELAY = 2  # seconds


def _is_rate_limited(error: Exception) -> bool:
    text = str(error).lower()
    return "429" in text or "rate limit" in text or "resource_exhausted" in text or "quota" in text


class AzureOpenAIProvider:
    name = "azure"

    def __init__(self):
        api_key = os.environ.get("AZURE_OPENAI_API_KEY")
        endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
        deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT")
        if not (api_key and endpoint and deployment):
            raise ProviderNotConfigured(
                "requires AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT"
            )
        from openai import AzureOpenAI
        self.deployment = deployment
        self.client = AzureOpenAI(
            api_key=api_key,
            azure_endpoint=endpoint,
            api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2026-01-01-preview"),
        )

    def call(self, prompt: str, temperature: float, max_tokens: int) -> str:
        last_error = None
        for attempt in range(MAX_RETRIES + 1):
            try:
                response = self.client.chat.completions.create(
                    model=self.deployment,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                    max_completion_tokens=max_tokens,
                )
                if response.choices:
                    return (response.choices[0].message.content or "").strip()
                return ""
            except Exception as e:
                last_error = e
                if _is_rate_limited(e) and attempt < MAX_RETRIES:
                    time.sleep(RETRY_BASE_DELAY * (2 ** attempt))
                    continue
                raise ProviderCallFailed(str(e)) from e
        raise ProviderCallFailed(str(last_error))


class GeminiProvider:
    name = "gemini"

    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY")
        model = os.environ.get("GEMINI_MODEL")
        if not (api_key and model):
            raise ProviderNotConfigured("requires GEMINI_API_KEY, GEMINI_MODEL")
        from google import genai
        from google.genai import types
        self.model = model
        self.types = types
        self.client = genai.Client(api_key=api_key)

    def call(self, prompt: str, temperature: float, max_tokens: int) -> str:
        last_error = None
        for attempt in range(MAX_RETRIES + 1):
            try:
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=self.types.GenerateContentConfig(
                        temperature=temperature, max_output_tokens=max_tokens,
                    ),
                )
                return (response.text or "").strip()
            except Exception as e:
                last_error = e
                if _is_rate_limited(e) and attempt < MAX_RETRIES:
                    time.sleep(RETRY_BASE_DELAY * (2 ** attempt))
                    continue
                raise ProviderCallFailed(str(e)) from e
        raise ProviderCallFailed(str(last_error))


class AnthropicProvider:
    name = "claude"

    def __init__(self):
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise ProviderNotConfigured("requires ANTHROPIC_API_KEY")
        from anthropic import Anthropic
        self.client = Anthropic(api_key=api_key)

    def call(self, prompt: str, temperature: float, max_tokens: int) -> str:
        last_error = None
        for attempt in range(MAX_RETRIES + 1):
            try:
                response = self.client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=max_tokens,
                    temperature=temperature,
                    messages=[{"role": "user", "content": prompt}],
                )
                if response.content:
                    return response.content[0].text.strip()
                return ""
            except Exception as e:
                last_error = e
                if _is_rate_limited(e) and attempt < MAX_RETRIES:
                    time.sleep(RETRY_BASE_DELAY * (2 ** attempt))
                    continue
                raise ProviderCallFailed(str(e))
        raise ProviderCallFailed(str(last_error))


class NemotronProvider:
    name = "nemotron"

    def __init__(self):
        api_key = os.environ.get("NVIDIA_API_KEY")
        if not api_key:
            raise ProviderNotConfigured("requires NVIDIA_API_KEY")
        from openai import OpenAI
        self.client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=api_key,
        )

    def call(self, prompt: str, temperature: float, max_tokens: int) -> str:
        last_error = None
        for attempt in range(MAX_RETRIES + 1):
            try:
                response = self.client.chat.completions.create(
                    model="nvidia/nemotron-3.5-lightning-30b-a3b",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                    top_p=0.95,
                    max_tokens=max_tokens,
                    extra_body={"chat_template_kwargs": {"enable_thinking": True}, "reasoning_budget": min(max_tokens, 16384)},
                )
                if response.choices:
                    # Append reasoning if present (though typically we just want the answer, we can include it or discard)
                    reasoning = getattr(response.choices[0].message, "reasoning_content", None)
                    content = response.choices[0].message.content or ""
                    # Return just content so it doesn't break JSON parsing when evaluating etc.
                    return content.strip()
                return ""
            except Exception as e:
                last_error = e
                if _is_rate_limited(e) and attempt < MAX_RETRIES:
                    time.sleep(RETRY_BASE_DELAY * (2 ** attempt))
                    continue
                raise ProviderCallFailed(str(e))
        raise ProviderCallFailed(str(last_error))


PROVIDER_REGISTRY = {
    "azure": AzureOpenAIProvider,
    "gemini": GeminiProvider,
    "claude": AnthropicProvider,
    "nemotron": NemotronProvider,
}
