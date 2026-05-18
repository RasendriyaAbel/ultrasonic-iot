"""
Buat public/models/best-water/scaler.json dari CSV training.

Usage:
  python scripts/export_scaler_from_csv.py
  python scripts/export_scaler_from_csv.py "src/water_dataset_57L_90days (1).csv"
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "models" / "best-water" / "scaler.json"
DEFAULT_CSV = ROOT / "src" / "water_dataset_57L_90days_v2(2).csv"

# Urutan fitur = 27 kolom numerik (selaras best_water_model (2).keras, tanpa kolom string/label)
FEATURE_COLUMNS = [
    "is_weekend",
    "minute_of_day",
    "hour",
    "hour_sin",
    "hour_cos",
    "day_sin",
    "day_cos",
    "pump_on",
    "jarak_cm",
    "level_cm",
    "tank_pct",
    "level_percent",
    "fill_ratio",
    "tank_volume_liter",
    "flow_sensor_1_lpm",
    "flow_out_lpm",
    "flow_out_pump",
    "flow_sensor_2_lpm",
    "flow_in_lpm",
    "flow_diff_lpm",
    "diff_lpm",
    "loss_percent",
    "leak_detected",
    "leak_flag",
    "error_count",
    "total_consumed_liter",
    "total_used_liter",
]

TARGET_COLUMN = "total_used_liter"


def main() -> None:
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV
    if not csv_path.is_file():
        raise SystemExit(f"CSV tidak ditemukan: {csv_path}")

    df = pd.read_csv(csv_path)

    missing = [c for c in FEATURE_COLUMNS if c not in df.columns]
    if missing:
        print("Kolom tidak ada di CSV:", missing)
        print("Kolom tersedia:", list(df.columns))
        raise SystemExit(1)

    if TARGET_COLUMN not in df.columns:
        raise SystemExit(f"Target column '{TARGET_COLUMN}' tidak ada di CSV")

    feat = df[FEATURE_COLUMNS].astype(float)
    target = df[TARGET_COLUMN].astype(float)

    payload = {
        "seqLen": 60,
        "featureDim": len(FEATURE_COLUMNS),
        "featureColumns": FEATURE_COLUMNS,
        "targetColumn": TARGET_COLUMN,
        "targetMode": "cumulative_total_used",
        "featureMin": feat.min().tolist(),
        "featureMax": feat.max().tolist(),
        "targetMin": float(target.min()),
        "targetMax": float(target.max()),
        "sourceCsv": str(csv_path.name),
        "modelVersion": "best_water_model (2)",
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} ({len(FEATURE_COLUMNS)} fitur)")


if __name__ == "__main__":
    main()
