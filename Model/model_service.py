import numpy as np
import torch
import torch.nn as nn
from pathlib import Path

MODEL_SAVE_PATH = "AF_MODEL.pth"
DEFAULT_THRESHOLD = 0.5
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class ECG_CNN(nn.Module):
    def __init__(self, dropout: float = 0.5):
        super().__init__()

        def conv_block(in_ch, out_ch, k, pool):
            return nn.Sequential(
                nn.Conv1d(in_ch, out_ch, kernel_size=k,
                          padding=k // 2, bias=False),
                nn.BatchNorm1d(out_ch),
                nn.ReLU(inplace=True),
                nn.MaxPool1d(pool),
            )

        self.features = nn.Sequential(
            conv_block(1, 32, k=31, pool=4),
            conv_block(32, 64, k=15, pool=3),
            conv_block(64, 128, k=9, pool=3),
            conv_block(128, 256, k=5, pool=2),
        )
        self.gap = nn.AdaptiveAvgPool1d(1)
        self.head = nn.Sequential(
            nn.Flatten(),
            nn.Linear(256, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
            nn.Linear(256, 1),
        )

    def forward(self, x):
        return self.head(self.gap(self.features(x))).squeeze(1)


def load_model(path: str = MODEL_SAVE_PATH):
    model = ECG_CNN().to(DEVICE)

    if not Path(path).exists():
        raise RuntimeError(f"Model not found at {path}")

    model.load_state_dict(torch.load(path, map_location=DEVICE))
    model.eval()
    return model


model = load_model()


def run_inference(raw_windows: np.ndarray, threshold: float = DEFAULT_THRESHOLD):
    x = raw_windows.astype(np.float32)

    if x.ndim == 3 and x.shape[-1] == 1:
        x = x.squeeze(-1)

    if x.ndim == 1:
        x = x[np.newaxis, :]

    if x.ndim != 2:
        raise ValueError(f"Expected (N, L), got {x.shape}")

    x = (x - x.mean(axis=1, keepdims=True)) / (x.std(axis=1, keepdims=True) + 1e-8)

    tensor = torch.tensor(x).unsqueeze(1).to(DEVICE)

    with torch.no_grad():
        probs = torch.sigmoid(model(tensor)).cpu().numpy()

    labels = (probs >= threshold).astype(int)

    return {
        "segments": [
            {
                "label": "AF" if labels[i] else "Normal",
                "prob_af": float(probs[i]),
            }
            for i in range(len(labels))
        ]
    }