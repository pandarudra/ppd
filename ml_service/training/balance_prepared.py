"""Balance an already-prepared CSV to N rows per class.

Usage (from ml_service/):
    python training/balance_prepared.py --n 100000
    python training/balance_prepared.py --input data/prepared.csv --n 100000 --out data/prepared_balanced.csv
"""
import argparse
from pathlib import Path
import pandas as pd

DEFAULT_IN  = Path(__file__).resolve().parents[1] / "data" / "prepared.csv"
DEFAULT_OUT = Path(__file__).resolve().parents[1] / "data" / "prepared_balanced.csv"

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--input",  type=Path, default=DEFAULT_IN)
    ap.add_argument("--out",    type=Path, default=DEFAULT_OUT)
    ap.add_argument("--n",      type=int,  default=100000, help="rows per class (default 100000)")
    args = ap.parse_args()

    df = pd.read_csv(args.input)
    benign  = df[df["label"] == 0]
    attacks = df[df["label"] == 1]

    print(f"Input  : {len(df):,} rows — {len(benign):,} benign, {len(attacks):,} attack ({df['label'].mean():.1%} attack)")

    n = min(args.n, len(benign), len(attacks))
    if n < args.n:
        print(f"[warn] minority class only has {min(len(benign), len(attacks)):,} rows; capping at {n:,} per class")

    balanced = pd.concat([
        benign.sample(n,  random_state=42),
        attacks.sample(n, random_state=42),
    ]).sample(frac=1, random_state=42).reset_index(drop=True)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    balanced.to_csv(args.out, index=False)
    print(f"Output : {len(balanced):,} rows — {n:,} benign + {n:,} attack (50.0% attack) → {args.out}")

if __name__ == "__main__":
    main()
