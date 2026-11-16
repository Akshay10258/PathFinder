"""
Trains SAKT on the XES3G5M knowledge-tracing benchmark (pykt-toolkit kc_level
export) and checkpoints the best model by validation AUC.

    python train_sakt.py --data-dir "D:\\Capstone Data\\KT\\kc_level"

This produces `checkpoints/sakt_xes3g5m.pt` — the pretrained backbone later
transferred to the 34-topic DSA concept space by `concept_bridge.py`. See
KNOWLEDGE_TRACING.md for why XES3G5M (a general math KT benchmark) is used to
validate the architecture rather than to supply DSA-specific concepts.
"""

import os
import json
import time
import argparse

import torch
from torch.utils.data import DataLoader
from sklearn.metrics import roc_auc_score

from sakt_model import SAKT
from dataset import SAKTSequenceDataset

HERE = os.path.dirname(os.path.abspath(__file__))
CHECKPOINT_DIR = os.path.join(HERE, "checkpoints")
DEFAULT_DATA_DIR = r"D:\Capstone Data\KT\kc_level"
DEFAULT_METADATA = r"D:\Capstone Data\KT\metadata\kc_routes_map.json"


def num_concepts_from_metadata(path: str) -> int:
    with open(path, "r", encoding="utf-8") as f:
        return len(json.load(f))


def masked_bce_loss(logits, targets):
    mask = targets != -1
    if mask.sum() == 0:
        return None
    return torch.nn.functional.binary_cross_entropy_with_logits(
        logits[mask], targets[mask]
    )


@torch.no_grad()
def evaluate(model, loader, device):
    model.eval()
    all_probs, all_targets = [], []
    total_loss, n_batches = 0.0, 0
    for past_c, past_r, query_c, targets in loader:
        past_c, past_r, query_c, targets = (
            past_c.to(device), past_r.to(device), query_c.to(device), targets.to(device)
        )
        logits = model(past_c, past_r, query_c)
        loss = masked_bce_loss(logits, targets)
        if loss is not None:
            total_loss += loss.item()
            n_batches += 1
        mask = targets != -1
        all_probs.append(torch.sigmoid(logits[mask]).cpu())
        all_targets.append(targets[mask].cpu())

    probs = torch.cat(all_probs).numpy()
    ys = torch.cat(all_targets).numpy()
    auc = roc_auc_score(ys, probs) if len(set(ys.tolist())) > 1 else 0.5
    avg_loss = total_loss / max(n_batches, 1)
    return avg_loss, auc


def train(args):
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    device = torch.device("cuda" if torch.cuda.is_available() and not args.cpu else "cpu")
    print(f"Device: {device}")

    num_concepts = num_concepts_from_metadata(args.metadata)
    print(f"Num concepts (from metadata): {num_concepts}")

    train_csv = os.path.join(args.data_dir, "train_valid_sequences.csv")
    val_folds = [args.val_fold]
    train_folds = [f for f in range(5) if f != args.val_fold]

    print("Loading train windows...")
    t0 = time.time()
    train_ds = SAKTSequenceDataset(train_csv, seq_len=args.seq_len, folds=train_folds, max_rows=args.max_rows)
    print(f"  {len(train_ds)} windows in {time.time() - t0:.1f}s")

    print("Loading validation windows...")
    val_ds = SAKTSequenceDataset(train_csv, seq_len=args.seq_len, folds=val_folds, max_rows=args.max_rows)
    print(f"  {len(val_ds)} windows")

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)

    model = SAKT(num_concepts=num_concepts, seq_len=args.seq_len,
                 embed_dim=args.embed_dim, num_heads=args.heads, dropout=args.dropout).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)

    best_auc = 0.0
    epochs_without_improvement = 0
    history = []

    for epoch in range(1, args.epochs + 1):
        model.train()
        epoch_loss, n_batches, t_epoch = 0.0, 0, time.time()

        for past_c, past_r, query_c, targets in train_loader:
            past_c, past_r, query_c, targets = (
                past_c.to(device), past_r.to(device), query_c.to(device), targets.to(device)
            )
            loss = masked_bce_loss(model(past_c, past_r, query_c), targets)
            if loss is None:
                continue
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
            n_batches += 1

        train_loss = epoch_loss / max(n_batches, 1)
        val_loss, val_auc = evaluate(model, val_loader, device)
        elapsed = time.time() - t_epoch

        print(f"Epoch {epoch:3d}/{args.epochs} | train_loss={train_loss:.4f} "
              f"| val_loss={val_loss:.4f} | val_auc={val_auc:.4f} | {elapsed:.1f}s")
        history.append({"epoch": epoch, "train_loss": train_loss, "val_loss": val_loss,
                        "val_auc": val_auc, "seconds": round(elapsed, 1)})

        if val_auc > best_auc:
            best_auc = val_auc
            epochs_without_improvement = 0
            torch.save({
                "model_state_dict": model.state_dict(),
                "config": {
                    "num_concepts": num_concepts,
                    "seq_len": args.seq_len,
                    "embed_dim": args.embed_dim,
                    "num_heads": args.heads,
                    "dropout": args.dropout,
                },
                "best_val_auc": best_auc,
                "epoch": epoch,
            }, os.path.join(CHECKPOINT_DIR, "sakt_xes3g5m.pt"))
        else:
            epochs_without_improvement += 1
            if epochs_without_improvement >= args.patience:
                print(f"Early stopping at epoch {epoch} (no improvement for {args.patience} epochs).")
                break

    with open(os.path.join(CHECKPOINT_DIR, "train_log.json"), "w", encoding="utf-8") as f:
        json.dump({"history": history, "best_val_auc": best_auc}, f, indent=2)

    print(f"\nBest val AUC: {best_auc:.4f}")
    print(f"Checkpoint: {os.path.join(CHECKPOINT_DIR, 'sakt_xes3g5m.pt')}")


def parse_args():
    p = argparse.ArgumentParser(description="Train SAKT on XES3G5M")
    p.add_argument("--data-dir", default=DEFAULT_DATA_DIR)
    p.add_argument("--metadata", default=DEFAULT_METADATA)
    p.add_argument("--epochs", type=int, default=50)
    p.add_argument("--batch-size", type=int, default=128)
    p.add_argument("--lr", type=float, default=1e-3)
    p.add_argument("--seq-len", type=int, default=100)
    p.add_argument("--embed-dim", type=int, default=64)
    p.add_argument("--heads", type=int, default=4)
    p.add_argument("--dropout", type=float, default=0.2)
    p.add_argument("--val-fold", type=int, default=0)
    p.add_argument("--patience", type=int, default=5)
    p.add_argument("--max-rows", type=int, default=None, help="Limit rows read (smoke testing)")
    p.add_argument("--cpu", action="store_true", help="Force CPU even if CUDA is available")
    return p.parse_args()


if __name__ == "__main__":
    train(parse_args())
