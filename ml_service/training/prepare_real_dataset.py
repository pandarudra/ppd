"""Convert UNSW-NB15 or CICIDS2017 CSVs into the 16-feature training CSV.

Run from ml_service/:
    python training/prepare_real_dataset.py unsw   data/raw/UNSW_NB15_training-set.csv data/raw/UNSW_NB15_testing-set.csv
    python training/prepare_real_dataset.py cicids data/raw/cicids/            # dir of *.csv or file paths
    python training/prepare_real_dataset.py cicids data/raw/cicids/ --sample 300000
    python training/prepare_real_dataset.py cicids data/raw/cicids/ --balance 100000  # 100k benign + 100k attack

Writes data/prepared.csv, then: python training/train.py --data data/prepared.csv

Features a dataset cannot supply fall back to the live extractor's benign
DEFAULTS (pipeline/feature_extractor.py), so they are constant in training and
the models ignore them. Mappings marked "approx" are the closest flow
statistic, not an exact equivalent.

--balance N  Under-samples the majority class so each class has exactly N rows
             (or the natural minority-class count if fewer than N rows exist).
             Removes class-imbalance bias. Mutually exclusive with --sample.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np
import pandas as pd

from pipeline.feature_extractor import DEFAULTS, FEATURE_ORDER

OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "prepared.csv"
PROTO = {"tcp": 0, "udp": 1, "icmp": 2}  # anything else -> 3


def _col(df: pd.DataFrame, name: str, default):
    return df[name] if name in df.columns else default


def map_unsw(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = df.columns.str.strip().str.lower()
    pkts = (df["spkts"] + df["dpkts"]).clip(lower=1)
    out = pd.DataFrame({
        "duration": df["dur"],
        "src_port": _col(df, "sport", DEFAULTS["src_port"]),  # split sets have no ports
        "dst_port": _col(df, "dsport", DEFAULTS["dst_port"]),
        "protocol_enc": df["proto"].astype(str).str.lower().map(PROTO).fillna(3),
        "packet_size_avg": (df["sbytes"] + df["dbytes"]) / pkts,
        "bytes_sent": df["sbytes"],
        "bytes_recv": df["dbytes"],
        "packet_count": df["spkts"] + df["dpkts"],
        "syn_count": _col(df, "ct_srv_src", DEFAULTS["syn_count"]),  # approx
        "unique_dst_ports": _col(df, "ct_src_dport_ltm", DEFAULTS["unique_dst_ports"]),  # approx
        "conn_rate": _col(df, "rate", DEFAULTS["conn_rate"]),
        "ttl_avg": (df["sttl"] + df["dttl"]) / 2,
        "label": df["label"].astype(int),
    })
    return out


def map_cicids(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = df.columns.str.strip()
    out = pd.DataFrame({
        "duration": df["Flow Duration"] / 1e6,  # microseconds -> seconds
        "src_port": _col(df, "Source Port", DEFAULTS["src_port"]),  # only in TrafficLabelling csvs
        "dst_port": df["Destination Port"],
        "protocol_enc": (
            df["Protocol"].map({6: 0, 17: 1, 1: 2}).fillna(3) if "Protocol" in df.columns else DEFAULTS["protocol_enc"]
        ),
        "packet_size_avg": df["Average Packet Size"],
        "bytes_sent": df["Total Length of Fwd Packets"],
        "bytes_recv": df["Total Length of Bwd Packets"],
        "packet_count": df["Total Fwd Packets"] + df["Total Backward Packets"],
        "syn_count": df["SYN Flag Count"],
        "conn_rate": df["Flow Packets/s"],
        "label": (df["Label"].astype(str).str.strip().str.upper() != "BENIGN").astype(int),
    })
    return out


MAPPERS = {"unsw": map_unsw, "cicids": map_cicids}


def _csv_files(paths: list[str]) -> list[Path]:
    files = []
    for p in map(Path, paths):
        files += sorted(p.glob("*.csv")) if p.is_dir() else [p]
    if not files:
        sys.exit("no CSV files found")
    return files


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dataset", choices=MAPPERS)
    ap.add_argument("paths", nargs="+", help="CSV files or directories")
    ap.add_argument("--sample", type=int, help="randomly keep at most N rows (CICIDS2017 is ~2.8M)")
    ap.add_argument("--balance", type=int, metavar="N",
                    help="balance classes: sample N rows per class (benign + attack). "
                         "Removes majority-class bias. Mutually exclusive with --sample.")
    ap.add_argument("--out", type=Path, default=OUTPUT_PATH)
    args = ap.parse_args()

    if args.sample and args.balance:
        sys.exit("--sample and --balance are mutually exclusive")

    # latin1: CICIDS2017 csvs contain non-UTF8 bytes
    frames = [MAPPERS[args.dataset](pd.read_csv(f, encoding="latin1", low_memory=False)) for f in _csv_files(args.paths)]
    df = pd.concat(frames, ignore_index=True)

    for name in FEATURE_ORDER:  # unsupplied features -> constant benign default
        if name not in df.columns:
            df[name] = DEFAULTS[name]
    df = df[FEATURE_ORDER + ["label"]].replace([np.inf, -np.inf], np.nan).dropna()

    if args.sample and len(df) > args.sample:
        df = df.sample(args.sample, random_state=42)

    if args.balance:
        benign  = df[df["label"] == 0]
        attacks = df[df["label"] == 1]
        n = min(args.balance, len(benign), len(attacks))
        if n < args.balance:
            print(f"[balance] minority class has only {min(len(benign), len(attacks))} rows; "
                  f"capping at {n} per class instead of {args.balance}")
        benign_s  = benign.sample(n,  random_state=42)
        attacks_s = attacks.sample(n, random_state=42)
        df = pd.concat([benign_s, attacks_s]).sample(frac=1, random_state=42).reset_index(drop=True)
        print(f"[balance] {n} benign + {n} attack = {len(df)} rows (50.0% attack)")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.out, index=False)
    print(f"wrote {len(df)} rows ({df['label'].mean():.1%} attack) to {args.out}")
    const = [c for c in FEATURE_ORDER if df[c].nunique() == 1]
    if const:
        print(f"constant (unmapped) features, ignored by the models: {', '.join(const)}")


if __name__ == "__main__":
    main()
