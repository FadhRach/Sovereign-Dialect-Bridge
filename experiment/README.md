# Experiment — Sovereign Dialect-Bridge

Folder ini berisi notebook eksperimen, dataset NusaX, dan model NLP yang dipakai backend Django.

## Struktur

```
experiment/
├── dataset/
│   └── nusax/                          NusaX parallel corpus (12 dialek Indonesia)
│       └── datasets/
│           ├── mt/                     Machine translation (526 train + 100 valid + 420 test)
│           │   ├── train.csv           wide format: 1 baris × 12 kolom bahasa
│           │   ├── valid.csv
│           │   └── test.csv
│           ├── sentiment/              Sentiment dataset (12 sub-folder per bahasa)
│           └── lexicon/                Bilingual lexicon
│
├── notebook/                           Notebook eksperimen
│   ├── SE complaint classifier.ipynb   Dialect classifier (training + EDA + eval)
│   ├── inference.ipynb                 Pipeline end-to-end demo
│   ├── training_sum.ipynb              Training summarizer mT5 (legacy)
│   └── training_sum_NER.ipynb          Training summarizer + NER (legacy)
│
├── model/
│   └── mt5base/                        mT5-base fine-tuned untuk summarization
│
└── dialect_detector/
    ├── train_dialect_detector.py       Standalone training script (dipakai `python` langsung)
    ├── dialect_detector.joblib         Output: trained classifier (5 MB)
    └── metadata.json                   Output: model metrics + labels
```

## Cara Pakai

### 1. Train dialect detector (sekali saja)

**Via notebook (rekomendasi untuk analisis)**:
```bash
jupyter notebook "notebook/SE complaint classifier.ipynb"
```
Run semua cell. Output: `dialect_detector/dialect_detector.joblib` (5 MB, 99% test acc).

**Via script**:
```bash
cd dialect_detector
python train_dialect_detector.py
```

### 2. Demo full pipeline

```bash
jupyter notebook "notebook/inference.ipynb"
```
Load semua model (dialect + mT5 + NER) → run pipeline pada multiple input → tampilkan output + timing.

### 3. Deploy model ke backend

```bash
cp dialect_detector/dialect_detector.joblib ../backend/models/dialect_detector/
cp dialect_detector/metadata.json ../backend/models/dialect_detector/
# mT5 sudah ada di backend/models/mt5base/
```

## Notebook Overview

### `SE complaint classifier.ipynb` (43 cells, 24 markdown + 19 code)

Lengkap mulai dari nol sampai save model:
1. **Setup** — imports
2. **Load NusaX** — flatten wide CSV → long (text, label)
3. **EDA** — distribusi kelas, panjang teks, sampel paralel 12 bahasa
4. **Preprocessing** — filosofi minimal cleaning (char-level signal penting)
5. **Feature Extraction** — TF-IDF char n-gram (2-5), insight: top n-gram per dialek
6. **Modelling** — LogReg vs LinearSVC vs MultinomialNB (komparasi)
7. **Cross-Validation** — 5-fold StratifiedKFold
8. **Evaluation** — classification report, confusion matrix, per-dialek F1
9. **Demo prediksi** — input nyata dari user
10. **Confidence threshold calibration** — coverage vs accuracy trade-off
11. **Save model** — joblib + metadata.json
12. **Penjelasan integrasi backend** — cara `backend/nlp/pipeline.py` pakai model ini

### `inference.ipynb` (33 cells, 13 markdown + 20 code)

Demo pipeline production:
1. **Setup device** (CUDA / MPS / CPU)
2. **Stage 1: Dialect detection** — load + predict
3. **Stage 2: Translation** — deep_translator
4. **Stage 3: Summarization** — mT5-base (+ TextRank fallback)
5. **Stage 4: NER** — cahya/bert-base-indonesian-NER
6. **Stage 5-7: Category + Urgency + Keywords** — rule-based
7. **Full pipeline orchestrator** dengan timing per stage
8. **Demo** — Jawa, Sunda, Minang, BI, kritis
9. **Custom input** — slot untuk eksplorasi
10. **Benchmark** — total latency CPU vs MPS

## Dataset Source

NusaX (Wilie et al., 2022) — Indonesian local language benchmark.
- Paper: https://arxiv.org/abs/2205.15960
- Repo: https://github.com/IndoNLP/nusax

Lisensi: CC-BY-SA 4.0 (lihat `dataset/nusax/LICENSE`).
