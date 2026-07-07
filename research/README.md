# NutriCan Research — AI training, evaluation, RBL

ResNet50 **199-class unified** pipeline: FastAPI service, offline scripts, NutriHome data, RBL cohort.

**Tổng hợp hiện trạng (2026-06):** [TONG_HOP_HIEN_TAI.md](./TONG_HOP_HIEN_TAI.md)

## Quick start (Windows)

| Action | Command |
|--------|---------|
| Setup venv + deps | `research\run-setup.bat` |
| Menu | `research\run-ai.bat` |
| AI service (199 class) | `research\run-ai-service.bat` |
| Train overnight | `research\run-train-unified-overnight.bat` |
| Export deploy model | `research\scripts\export_resnet_unified.py` |

Requires **Python 3.10–3.12** + TensorFlow in `ai-service/.venv`.

## Production model

| File | Profile | Classes |
|------|---------|---------|
| `best_resnet50_unified.h5` | `resnet_unified` | **199** (VTN-10 + 100 dishes + Food-101) |

VTN-10 core dishes are **indices 0–9** inside the unified model — no separate 10-class model needed.

```bat
research\run-ai.bat   →  [2] Chay AI Service
```

Backend (`nutrican-be`) defaults to `ai.resnet.class-profile=resnet_unified`.

## Folder layout

```
research/
├── ai-service/              # FastAPI :8000
├── data/
│   ├── class_manifests/     # resnet_unified.json (+ resnet10 for RBL eval subset)
│   └── nutrihome_*.json     # Macro catalog (synced to Java)
├── scripts/                 # train, eval, export, RBL
├── seed/resnet10/           # RBL cohort images (30+3) — eval only, not a separate model
├── output/                  # logs, checkpoints, eval, rbl, reports (gitignored)
└── best_resnet50_unified.h5 # Deploy weights (gitignored — share via Drive)
```

## Key scripts

| Script | Purpose |
|--------|---------|
| `train_resnet50_phase2.py` | Train unified model (Bohlol head + fine-tune) |
| `export_resnet_unified.py` | `best.weights.h5` → `best_resnet50_unified.h5` |
| `eval_resnet50.py` | Offline accuracy / F1 (`--profile resnet10` for VTN-10 subset) |
| `rbl_analyze.py` | A1.0 vs A1.1 ΔA analysis |
| `build_class_manifests.py` | Regenerate manifests → sync to Java |

## Datasets (outside git)

Large image folders in `project_team/research/` — see `scripts/repo_paths.py`.

## Docs

`docs/research/` — thesis plan, RBL workflow, Bohlol reference.
