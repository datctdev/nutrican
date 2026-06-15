# Limitations — NutriCan RBL Research

Ghi trong báo cáo §6 (KE_HOACH §12).

---

| Limitation | Impact | Mitigation in report |
|------------|--------|-------------------|
| Ground truth = PT opinion | Subjective bias | Ghi kinh nghiệm PT labeler; blind mode ~30% |
| Food DB ~60 món (v2-60) | Weak hybrid for out-of-catalog dishes | Báo `db_match_score` distribution; explain low ΔA |
| VLM local (Ollama **llava**) | Hardware-dependent, ~30–60 s/ảnh | G0 pass 2026-06-14; ghi `model_version=llava` |
| Image max 500KB | Detail loss for portion | Acknowledge in Methods |
| No model training | Zero-shot prompt only | Align with Improve 2.2 scope |
| Small sample (n<30) | `insufficientSample=true` | Report as preliminary; state confidence limits |
| VLM self-reported confidence | Calibration may be miscalibrated | Use calibration buckets empirically |
| Vietnamese-only domain | No cross-cuisine generalization | Scope statement in Introduction |
| Recipe1M not used | Cannot compare absolute numbers | Use Paper 1 as magnitude reference only |

---

## If ΔA ≤ 0 (Apply fallback)

Explain honestly:
1. Catalog coverage too small for restaurant diversity
2. Name normalization mismatch (VLM English vs DB Vietnamese)
3. Portion estimation from VLM still noisy even after DB scale
4. Sample size / cohort imbalance

Same dataset still valid for **benchmarking A1.0 on Vietnamese meals**.

---

*Document Version: 1.0.0*
