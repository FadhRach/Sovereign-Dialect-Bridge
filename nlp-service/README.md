# nlp-service

Inference model neural (NLLB translate, mT5/IndoT5 summarize, IndoBERT NER) untuk Sovereign Dialect-Bridge, di-deploy sebagai Modal App. Dipisah dari `backend/` karena dependency-nya (torch, transformers, ~3.8GB model) tidak muat di serverless Vercel.

Backend Django memanggil endpoint `/start` untuk memicu proses async; hasilnya dikirim balik ke Django lewat callback HTTP saat selesai. Lihat `backend/nlp/modal_client.py` untuk sisi pemanggil.

## Setup

```bash
pip install modal fastapi
modal token new                    # login sekali
modal secret create nlp-service-secret MODAL_SHARED_SECRET=<random-string-panjang>
```

`MODAL_SHARED_SECRET` harus sama persis dengan yang di-set di environment variable backend Django (`MODAL_SHARED_SECRET`).

## Deploy

```bash
modal deploy app.py
```

Setelah deploy, Modal mencetak dua URL — catat untuk env var backend Django:
- `.../start` → `MODAL_START_URL`
- `.../health` → `MODAL_HEALTH_URL`

## Konfigurasi model

Override lewat environment variable saat deploy (`modal deploy` membaca env proses lokal untuk `os.environ.get(...)` di `app.py`, atau set langsung di `nlp-service-secret`):

| Variable | Default |
|----------|---------|
| `SUMMARIZER_MODEL` | `mt5` (`indot5` untuk pakai checkpoint alternatif) |
| `MT5_MODEL_PATH` | `OinoVenv/sovereign-mt5-nusasum` |
| `INDOT5_MODEL_PATH` | `OinoVenv/sovereign-indot5-nusasum` |
| `NLLB_MODEL_ID` | `facebook/nllb-200-distilled-600M` |
| `NER_MODEL_ID` | `cahya/bert-base-indonesian-NER` |

Model didownload dari HF Hub saat container pertama kali cold-start, lalu di-cache di Modal Volume (`sovereign-nlp-model-cache`) supaya container berikutnya tidak perlu download ulang.

## Test manual

```bash
curl -X POST https://<start-url> \
  -H "Authorization: Bearer <MODAL_SHARED_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"complaint_id": 1, "text": "dalane rusak parah tolong dibenahi", "dialect": "jv", "callback_url": "https://webhook.site/<id>"}'
```

Cek payload yang sampai di `callback_url` sebelum diarahkan ke endpoint Django asli.
