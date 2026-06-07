"""
Konstanta untuk NLP pipeline — mapping dialek, stopword, keyword urgency/kategori.

File ini SENGAJA tidak import torch/transformers. Boleh di-import dari mana saja
(serializer, view) tanpa memicu load model.
"""

from __future__ import annotations
import os
from pathlib import Path

# ─────────────────────────────────────────────────────────────────────────────
# Path konfigurasi
# ─────────────────────────────────────────────────────────────────────────────
BACKEND_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = BACKEND_ROOT / "models"

# ── Dialect detector path ────────────────────────────────────────────────────
# Priority: env var DIALECT_MODEL_HF (HF Hub) > local file > None (skip)
_DIALECT_LOCAL = MODELS_DIR / "dialect_detector" / "dialect_detector.joblib"
DIALECT_MODEL_PATH = _DIALECT_LOCAL   # dipakai oleh models.py

# Kalau di production dan ada env var, models.py akan pull dari HF Hub
DIALECT_MODEL_HF = os.environ.get("DIALECT_MODEL_HF", "").strip()

# ── mT5 path ─────────────────────────────────────────────────────────────────
# Priority: env var MT5_MODEL_PATH (HF Hub repo id) > local folder > google/mt5-base
def _resolve_mt5_path() -> str:
    env = os.environ.get("MT5_MODEL_PATH", "").strip()
    if env:
        return env
    local = MODELS_DIR / "mt5base"
    if local.exists():
        return str(local)
    return "google/mt5-base"


MT5_MODEL_PATH = _resolve_mt5_path()

# Translator NLLB — dari HF Hub, di-cache otomatis ke HF_HOME.
NLLB_MODEL_ID = os.environ.get("NLLB_MODEL_ID", "facebook/nllb-200-distilled-600M")

# NER IndoBERT — Cahya, dari HF Hub.
NER_MODEL_ID = os.environ.get("NER_MODEL_ID", "cahya/bert-base-indonesian-NER")


# ─────────────────────────────────────────────────────────────────────────────
# Inference hyperparameter
# ─────────────────────────────────────────────────────────────────────────────
MIN_DIALECT_CONF = 0.35       # ambang minimum confidence dialect detector
MIN_WORDS_NEURAL = 40          # di bawah ini summarize pakai TextRank
MT5_MAX_INPUT = 1024            # max kata dipotong sebelum mT5
MT5_MAX_OUTPUT = 150            # max_new_tokens untuk summary
MT5_NUM_BEAMS = 2                # beam search; 2 cukup baik & cepat di CPU


# ─────────────────────────────────────────────────────────────────────────────
# Mapping dialek nama display
# ─────────────────────────────────────────────────────────────────────────────
DIALECT_NAMES: dict[str, str] = {
    "id":  "Bahasa Indonesia",
    "jv":  "Bahasa Jawa",
    "su":  "Bahasa Sunda",
    "min": "Bahasa Minangkabau",
    "ace": "Bahasa Aceh",
    "ban": "Bahasa Bali",
    "bjn": "Bahasa Banjar",
    "bug": "Bahasa Bugis",
    "mad": "Bahasa Madura",
    "nij": "Bahasa Ngaju Dayak",
    "bbc": "Bahasa Batak Toba",
    "en":  "Bahasa Inggris",
    "xx":  "Tidak Terdeteksi",
}


# ─────────────────────────────────────────────────────────────────────────────
# Mapping dialek -> kode NLLB (Flores-200).
# Untuk dialek nusantara yang tidak ada di NLLB, fallback ke "auto" (deep_translator).
# ─────────────────────────────────────────────────────────────────────────────
DIALECT_TO_NLLB: dict[str, str] = {
    "id":  "ind_Latn",  # Indonesian
    "jv":  "jav_Latn",  # Javanese
    "su":  "sun_Latn",  # Sundanese
    "min": "min_Latn",  # Minangkabau
    "ace": "ace_Latn",  # Aceh
    "ban": "ban_Latn",  # Bali
    "bjn": "bjn_Latn",  # Banjar
    "bug": "bug_Latn",  # Bugis
    "mad": None,         # Madura — tidak ada di NLLB, fallback
    "nij": None,         # Ngaju Dayak — tidak ada di NLLB, fallback
    "bbc": None,         # Batak Toba — tidak ada di NLLB, fallback
    "en":  "eng_Latn",
}

NLLB_TARGET_INDONESIAN = "ind_Latn"


# ─────────────────────────────────────────────────────────────────────────────
# Mapping dialek -> kode Google Translate (deep_translator fallback)
# ─────────────────────────────────────────────────────────────────────────────
DIALECT_TO_GOOGLE: dict[str, str] = {
    "jv": "jw", "su": "su", "min": "auto", "ace": "auto",
    "ban": "auto", "bjn": "auto", "bug": "auto", "mad": "auto",
    "nij": "auto", "bbc": "auto", "en": "en",
}


# ─────────────────────────────────────────────────────────────────────────────
# Stopwords Bahasa Indonesia untuk keyword extraction
# ─────────────────────────────────────────────────────────────────────────────
STOPWORDS_ID: set[str] = {
    "yang", "dan", "di", "ke", "dari", "untuk", "dengan", "pada", "adalah",
    "ini", "itu", "tidak", "ada", "juga", "bisa", "akan", "sudah", "telah",
    "atau", "oleh", "dalam", "karena", "agar", "bila", "maka", "saat",
    "jika", "saya", "kami", "kita", "mereka", "dia", "anda", "pun", "lagi",
    "saja", "bagi", "para", "namun", "hanya", "lebih", "masih", "belum",
    "sangat", "sekali", "serta", "tersebut", "yaitu", "seperti",
}


# ─────────────────────────────────────────────────────────────────────────────
# Keyword untuk klasifikasi kategori (8 kategori final)
# ─────────────────────────────────────────────────────────────────────────────
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "Infrastruktur": [
        "jalan", "jembatan", "drainase", "saluran", "trotoar",
        "rusak", "berlubang", "bocor", "ambruk", "gorong", "aspal", "beton",
    ],
    "Kesehatan": [
        "puskesmas", "rsud", "rumah sakit", "dokter", "perawat", "obat",
        "sanitasi", "air bersih", "stunting", "imunisasi", "posyandu",
    ],
    "Pendidikan": [
        "sekolah", "guru", "siswa", "murid", "buku", "belajar",
        "beasiswa", "universitas", "kampus", "ruang kelas", "pendidikan",
    ],
    "Keamanan": [
        "kriminal", "pencurian", "maling", "tawuran", "narkoba",
        "kekerasan", "perampokan", "geng", "begal", "curanmor",
    ],
    "Lingkungan": [
        "sampah", "banjir", "polusi", "limbah", "sungai", "got",
        "bau", "kotor", "pencemaran", "longsor", "abrasi",
    ],
    "Sosial": [
        "bantuan", "kemiskinan", "pengangguran", "miskin", "lansia",
        "disabilitas", "yatim", "pkh", "pkl", "gelandangan",
    ],
    "Administrasi": [
        "ktp", "kk", "akta", "sertifikat", "izin", "surat",
        "pungli", "pelayanan", "birokrasi", "administrasi",
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# Keyword scoring untuk urgency level
# Skor lebih tinggi = lebih urgent. Total >= ambang -> level.
# ─────────────────────────────────────────────────────────────────────────────
URGENCY_KEYWORDS: dict[int, list[str]] = {
    100: [
        "kebakaran", "banjir besar", "longsor", "darurat", "nyawa",
        "kematian", "meninggal", "ledakan", "tenggelam", "korban", "evakuasi",
    ],
    60: [
        "rusak parah", "sudah bertahun", "berbulan-bulan", "tidak bisa digunakan",
        "ambruk", "mendesak", "segera", "tolong cepat", "bertahun-tahun",
    ],
    30: [
        "rusak", "bocor", "kotor", "tidak berfungsi", "terganggu",
        "masalah", "keluhan", "mati", "buntu",
    ],
    10: [
        "saran", "usul", "mohon dipertimbangkan", "semoga", "harap",
        "minta tolong", "kalau bisa", "sekiranya",
    ],
}

URGENCY_THRESHOLDS = {"critical": 100, "high": 60, "medium": 30}  # else "low"


# ─────────────────────────────────────────────────────────────────────────────
# Util — get pretty dialect name
# ─────────────────────────────────────────────────────────────────────────────
def dialect_name(code: str) -> str:
    return DIALECT_NAMES.get(code, f"Dialek {code.upper()}")
