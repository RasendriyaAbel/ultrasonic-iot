"""Ekspor bobot best_water_model (2).keras (h5py) untuk build TFJS."""
from __future__ import annotations

import json
import os
from pathlib import Path

import h5py
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = Path(
    os.environ.get(
        "KERAS_MODEL_DIR",
        str(ROOT / "src" / "best_water_model (2).keras"),
    )
)
H5_PATH = MODEL_DIR / "model.weights.h5"
OUT_PATH = ROOT / "scripts" / "smart_water_weights.json"


def read_array(f: h5py.File, path: str) -> list:
    return np.array(f[path], dtype=np.float32).tolist()


def main() -> None:
    if not H5_PATH.is_file():
        raise SystemExit(f"Missing weights: {H5_PATH}")

    with h5py.File(H5_PATH, "r") as f:
        weights = {
            "bilstm_1_forward_kernel": read_array(
                f, "layers/bidirectional/forward_layer/cell/vars/0"
            ),
            "bilstm_1_forward_recurrent": read_array(
                f, "layers/bidirectional/forward_layer/cell/vars/1"
            ),
            "bilstm_1_forward_bias": read_array(
                f, "layers/bidirectional/forward_layer/cell/vars/2"
            ),
            "bilstm_1_backward_kernel": read_array(
                f, "layers/bidirectional/backward_layer/cell/vars/0"
            ),
            "bilstm_1_backward_recurrent": read_array(
                f, "layers/bidirectional/backward_layer/cell/vars/1"
            ),
            "bilstm_1_backward_bias": read_array(
                f, "layers/bidirectional/backward_layer/cell/vars/2"
            ),
            "bilstm_2_forward_kernel": read_array(
                f, "layers/bidirectional_1/forward_layer/cell/vars/0"
            ),
            "bilstm_2_forward_recurrent": read_array(
                f, "layers/bidirectional_1/forward_layer/cell/vars/1"
            ),
            "bilstm_2_forward_bias": read_array(
                f, "layers/bidirectional_1/forward_layer/cell/vars/2"
            ),
            "bilstm_2_backward_kernel": read_array(
                f, "layers/bidirectional_1/backward_layer/cell/vars/0"
            ),
            "bilstm_2_backward_recurrent": read_array(
                f, "layers/bidirectional_1/backward_layer/cell/vars/1"
            ),
            "bilstm_2_backward_bias": read_array(
                f, "layers/bidirectional_1/backward_layer/cell/vars/2"
            ),
            "dense_shared_kernel": read_array(f, "layers/dense/vars/0"),
            "dense_shared_bias": read_array(f, "layers/dense/vars/1"),
            "batch_norm_gamma": read_array(f, "layers/batch_normalization/vars/0"),
            "batch_norm_beta": read_array(f, "layers/batch_normalization/vars/1"),
            "batch_norm_moving_mean": read_array(f, "layers/batch_normalization/vars/2"),
            "batch_norm_moving_variance": read_array(
                f, "layers/batch_normalization/vars/3"
            ),
            "output_pump_on_kernel": read_array(f, "layers/dense_1/vars/0"),
            "output_pump_on_bias": read_array(f, "layers/dense_1/vars/1"),
            "output_total_used_kernel": read_array(f, "layers/dense_2/vars/0"),
            "output_total_used_bias": read_array(f, "layers/dense_2/vars/1"),
            "output_activity_kernel": read_array(f, "layers/dense_3/vars/0"),
            "output_activity_bias": read_array(f, "layers/dense_3/vars/1"),
        }

    cfg = json.loads((MODEL_DIR / "config.json").read_text(encoding="utf-8"))
    input_shape = (
        cfg.get("config", {})
        .get("layers", [{}])[0]
        .get("config", {})
        .get("batch_shape", [None, 60, 27])
    )

    meta = {
        "modelDir": str(MODEL_DIR),
        "inputShape": input_shape[-2:] if len(input_shape) >= 2 else [60, 27],
        "kerasName": cfg.get("config", {}).get("name"),
        "outputs": ["output_pump_on", "output_total_used", "output_activity"],
    }

    OUT_PATH.write_text(
        json.dumps({"meta": meta, "weights": weights}),
        encoding="utf-8",
    )
    print(f"Wrote {OUT_PATH} ({OUT_PATH.stat().st_size // 1024} KB) from {MODEL_DIR}")


if __name__ == "__main__":
    main()
