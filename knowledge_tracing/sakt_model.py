"""
Self-Attentive Knowledge Tracing (SAKT) — Pandey & Karypis, 2019.

Given a student's past (concept, correct/incorrect) interactions, predicts the
probability of answering the *next* queried concept correctly. That probability
IS the mastery score for the queried concept.

Architecture (single-block SAKT, matching the paper):
  - interaction embedding: concept_t combined with response_t (correct/incorrect)
    forms the "past" sequence fed as attention keys/values.
  - query embedding: the concept being asked about (no response) is the query.
  - one multi-head self-attention block (query attends over past interactions),
    followed by a position-wise feed-forward layer and a sigmoid output head.
  - causal masking prevents a position from attending to future interactions.
"""

import math
import torch
import torch.nn as nn


class SAKT(nn.Module):
    def __init__(self, num_concepts: int, seq_len: int = 100,
                 embed_dim: int = 64, num_heads: int = 4, dropout: float = 0.2):
        super().__init__()
        self.num_concepts = num_concepts
        self.seq_len = seq_len
        self.embed_dim = embed_dim

        # +1 padding index at 0; concepts are re-indexed to [1, num_concepts]
        self.concept_embed = nn.Embedding(num_concepts + 1, embed_dim, padding_idx=0)
        # interaction = concept shown together with whether it was answered correctly,
        # encoded as two disjoint embedding ranges (concept_id) and (concept_id + num_concepts)
        self.interaction_embed = nn.Embedding(2 * (num_concepts + 1), embed_dim, padding_idx=0)
        self.position_embed = nn.Embedding(seq_len, embed_dim)

        self.attention = nn.MultiheadAttention(embed_dim, num_heads, dropout=dropout, batch_first=True)
        self.attn_norm = nn.LayerNorm(embed_dim)

        self.ffn = nn.Sequential(
            nn.Linear(embed_dim, embed_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(embed_dim, embed_dim),
        )
        self.ffn_norm = nn.LayerNorm(embed_dim)

        self.output_head = nn.Linear(embed_dim, 1)
        self.dropout = nn.Dropout(dropout)

    def forward(self, past_concepts, past_responses, query_concepts):
        """
        past_concepts:  (B, L) concept ids in [0, num_concepts], 0 = padding
        past_responses: (B, L) 0/1, meaningless where past_concepts == 0
        query_concepts: (B, L) concept ids being queried at each position (shifted by one)

        Returns: (B, L) predicted P(correct) for each query position.
        """
        B, L = past_concepts.shape
        device = past_concepts.device

        interaction_ids = past_concepts + past_responses.long() * (self.num_concepts + 1)
        x = self.interaction_embed(interaction_ids)
        positions = torch.arange(L, device=device).unsqueeze(0).expand(B, L)
        x = x + self.position_embed(positions)
        x = self.dropout(x)

        query = self.concept_embed(query_concepts) + self.position_embed(positions)

        causal_mask = torch.triu(torch.ones(L, L, device=device, dtype=torch.bool), diagonal=1)
        attn_out, _ = self.attention(query, x, x, attn_mask=causal_mask, need_weights=False)
        attn_out = self.attn_norm(attn_out + query)

        ffn_out = self.ffn(attn_out)
        ffn_out = self.ffn_norm(ffn_out + attn_out)

        logits = self.output_head(ffn_out).squeeze(-1)
        return logits

    @torch.no_grad()
    def predict_next(self, concept_history, response_history, target_concept):
        """
        Inference convenience: given a plain python list of past (concept, response)
        pairs (most recent last) and a target concept id, returns P(correct) in [0, 1].
        Pads/truncates to seq_len internally.
        """
        self.eval()
        device = next(self.parameters()).device

        hist = list(zip(concept_history, response_history))[-self.seq_len:]
        pad = self.seq_len - len(hist)

        past_c = [0] * pad + [c + 1 for c, _ in hist]
        past_r = [0] * pad + [r for _, r in hist]
        query_c = [0] * pad + [c + 1 for c, _ in hist[1:]] + [target_concept + 1]

        past_c_t = torch.tensor([past_c], dtype=torch.long, device=device)
        past_r_t = torch.tensor([past_r], dtype=torch.long, device=device)
        query_c_t = torch.tensor([query_c], dtype=torch.long, device=device)

        logits = self.forward(past_c_t, past_r_t, query_c_t)
        prob = torch.sigmoid(logits[0, -1]).item()
        return prob
