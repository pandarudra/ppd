"""Generate a synthetic labeled network-event dataset for local model training.

No real datasets (CICIDS2017/NSL-KDD) are downloaded here (plan/AI_ML_DESIGN.md
names them as the real-world training strategy) -- this keeps the MVP build
self-contained and offline-runnable. Attack rows are drawn from
statistically-shifted distributions across several features so the trained
models have real (if synthetic) signal to learn from.
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "synthetic_events.csv"
N_ROWS = 5000
ATTACK_RATE = 0.10
SEED = 42

FEATURE_NAMES = [
    "duration",
    "src_port",
    "dst_port",
    "protocol_enc",
    "packet_size_avg",
    "bytes_sent",
    "bytes_recv",
    "packet_count",
    "failed_auth_ratio",
    "port_entropy",
    "syn_count",
    "unique_dst_ports",
    "conn_rate",
    "ttl_avg",
    "is_private_src",
    "is_private_dst",
]

COMMON_PORTS = [80, 443, 22, 53, 3306, 8080, 25, 110]


def generate(n_rows: int = N_ROWS, attack_rate: float = ATTACK_RATE, seed: int = SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    n_attack = int(n_rows * attack_rate)
    n_benign = n_rows - n_attack
    labels = np.array([0] * n_benign + [1] * n_attack)
    rng.shuffle(labels)

    is_attack = labels == 1
    n = n_rows

    duration = np.where(
        is_attack, rng.lognormal(mean=0.5, sigma=1.0, size=n), rng.lognormal(mean=2.0, sigma=1.0, size=n)
    )
    src_port = rng.integers(1024, 65535, size=n)
    dst_port = np.where(
        is_attack,
        rng.integers(1, 65535, size=n),
        rng.choice(COMMON_PORTS, size=n),
    )
    protocol_enc = rng.choice([0, 1, 2], size=n, p=[0.8, 0.15, 0.05])
    packet_size_avg = np.where(
        is_attack, rng.normal(80, 25, size=n), rng.normal(500, 150, size=n)
    ).clip(20, None)
    packet_count = np.where(
        is_attack, rng.poisson(300, size=n), rng.poisson(40, size=n)
    )
    bytes_sent = packet_count * packet_size_avg * rng.uniform(0.8, 1.2, size=n)
    bytes_recv = np.where(
        is_attack, bytes_sent * rng.uniform(0.0, 0.1, size=n), bytes_sent * rng.uniform(0.5, 1.5, size=n)
    )
    failed_auth_ratio = np.where(
        is_attack, rng.beta(15, 3, size=n), rng.beta(1, 25, size=n)
    )
    port_entropy = np.where(
        is_attack, rng.beta(8, 2, size=n), rng.beta(1, 12, size=n)
    )
    syn_count = np.where(
        is_attack, rng.poisson(120, size=n), rng.poisson(3, size=n)
    )
    unique_dst_ports = np.where(
        is_attack, rng.poisson(25, size=n), rng.poisson(1, size=n)
    )
    conn_rate = np.where(
        is_attack, rng.normal(40, 12, size=n), rng.normal(1.0, 0.5, size=n)
    ).clip(0, None)
    ttl_avg = np.where(
        is_attack, rng.normal(50, 12, size=n), rng.normal(64, 4, size=n)
    ).clip(1, 255)
    is_private_src = rng.binomial(1, np.where(is_attack, 0.2, 0.8))
    is_private_dst = rng.binomial(1, 0.9, size=n)

    df = pd.DataFrame(
        {
            "duration": duration,
            "src_port": src_port,
            "dst_port": dst_port,
            "protocol_enc": protocol_enc,
            "packet_size_avg": packet_size_avg,
            "bytes_sent": bytes_sent,
            "bytes_recv": bytes_recv,
            "packet_count": packet_count,
            "failed_auth_ratio": failed_auth_ratio,
            "port_entropy": port_entropy,
            "syn_count": syn_count,
            "unique_dst_ports": unique_dst_ports,
            "conn_rate": conn_rate,
            "ttl_avg": ttl_avg,
            "is_private_src": is_private_src,
            "is_private_dst": is_private_dst,
            "label": labels,
        }
    )
    return df


if __name__ == "__main__":
    df = generate()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"Wrote {len(df)} rows ({df['label'].sum()} attack) to {OUTPUT_PATH}", file=sys.stderr)
