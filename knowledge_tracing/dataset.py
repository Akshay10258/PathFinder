"""
Loads pykt-toolkit-format XES3G5M kc_level interaction CSVs
(`concepts`, `responses` as comma-joined strings per student, chunked into
fixed-length windows for SAKT) and produces fixed-length training tensors.

Two pykt-specific columns are used to avoid corrupting the loss:
  - selectmasks: -1 marks a padded slot in pykt's own fixed-width export -> dropped.
  - is_repeat:    1 marks an interaction already seen in a previous overlapping
                   window of the same student -> dropped, so overlap-duplicated
                   interactions aren't counted twice in the loss.
"""

import pandas as pd
import torch
from torch.utils.data import Dataset


def _parse_list(cell) -> list:
    if pd.isna(cell):
        return []
    return [int(x) for x in str(cell).split(",")]


class SAKTSequenceDataset(Dataset):
    def __init__(self, csv_path: str, seq_len: int = 100, folds=None, max_rows=None):
        self.seq_len = seq_len

        df = pd.read_csv(csv_path, nrows=max_rows)
        if folds is not None:
            df = df[df["fold"].isin(folds)]

        has_selectmask = "selectmasks" in df.columns
        has_is_repeat = "is_repeat" in df.columns
        chunk_size = seq_len + 1

        self.windows = []
        for _, row in df.iterrows():
            concepts = _parse_list(row["concepts"])
            responses = _parse_list(row["responses"])
            n = min(len(concepts), len(responses))
            concepts, responses = concepts[:n], responses[:n]

            keep = [True] * n
            if has_selectmask:
                sel = _parse_list(row["selectmasks"])[:n]
                keep = [k and sel[i] != -1 for i, k in enumerate(keep)]
            if has_is_repeat:
                rep = _parse_list(row["is_repeat"])[:n]
                keep = [k and rep[i] == 0 for i, k in enumerate(keep)]

            filtered_c = [c for c, k in zip(concepts, keep) if k]
            filtered_r = [r for r, k in zip(responses, keep) if k]

            for start in range(0, len(filtered_c), chunk_size):
                c_chunk = filtered_c[start:start + chunk_size]
                r_chunk = filtered_r[start:start + chunk_size]
                if len(c_chunk) >= 2:
                    self.windows.append((c_chunk, r_chunk))

    def __len__(self):
        return len(self.windows)

    def __getitem__(self, idx):
        concepts, responses = self.windows[idx]
        n = len(concepts)

        past_c = concepts[:n - 1]
        past_r = responses[:n - 1]
        query_c = concepts[1:n]
        targets = responses[1:n]

        pad = self.seq_len - len(past_c)
        past_c = [0] * pad + [c + 1 for c in past_c]
        past_r = [0] * pad + list(past_r)
        query_c = [0] * pad + [c + 1 for c in query_c]
        targets = [-1] * pad + list(targets)  # -1 = padded position, excluded from loss

        return (
            torch.tensor(past_c, dtype=torch.long),
            torch.tensor(past_r, dtype=torch.long),
            torch.tensor(query_c, dtype=torch.long),
            torch.tensor(targets, dtype=torch.float),
        )
