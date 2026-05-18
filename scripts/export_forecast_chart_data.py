"""
Agregasi konsumsi harian dari CSV training → JSON untuk grafik prediksi.

Usage:
  python scripts/export_forecast_chart_data.py
  python scripts/export_forecast_chart_data.py "src/water_dataset_57L_90days_v2(2).csv"
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = ROOT / "src" / "water_dataset_57L_90days_v2(2).csv"
OUT = ROOT / "public" / "data" / "water-57L-daily.json"
HISTORY_DAYS = 7
FORECAST_DAYS = 7


def daily_liters_from_csv(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["date"] = df["timestamp"].dt.normalize()

    end_of_day = df.groupby("date", as_index=False)["total_used_liter"].max()
    end_of_day = end_of_day.sort_values("date").reset_index(drop=True)
    end_of_day["liters"] = end_of_day["total_used_liter"].diff().fillna(
        end_of_day["total_used_liter"].iloc[0]
    )
    end_of_day["liters"] = end_of_day["liters"].clip(lower=0)
    end_of_day["date"] = end_of_day["date"].dt.strftime("%Y-%m-%dT00:00:00.000Z")
    return end_of_day[["date", "liters"]]


def main() -> None:
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV
    if not csv_path.is_file():
        raise SystemExit(f"CSV tidak ditemukan: {csv_path}")

    df = pd.read_csv(csv_path)
    if "total_used_liter" not in df.columns:
        raise SystemExit("Kolom total_used_liter tidak ada di CSV")

    daily = daily_liters_from_csv(df)
    days = daily.to_dict(orient="records")

    if len(days) < HISTORY_DAYS + 1:
        raise SystemExit(f"Data harian kurang dari {HISTORY_DAYS + 1} hari")

    history = days[-(HISTORY_DAYS + FORECAST_DAYS) : -FORECAST_DAYS]
    forecast = days[-FORECAST_DAYS:]

    payload = {
        "sourceCsv": csv_path.name,
        "totalDays": len(days),
        "historyDays": HISTORY_DAYS,
        "forecastDays": FORECAST_DAYS,
        "rangeStart": days[0]["date"],
        "rangeEnd": days[-1]["date"],
        "days": days,
        "chartHistory": history,
        "chartForecast": forecast,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} ({len(days)} hari, chart: {len(history)} aktual + {len(forecast)} prediksi CSV)")


if __name__ == "__main__":
    main()
