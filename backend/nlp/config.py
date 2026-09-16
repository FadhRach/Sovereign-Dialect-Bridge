"""
Konstanta untuk NLP pipeline lokal — mapping dialek, stopword, keyword urgency/kategori.

Model neural (NLLB/mT5/IndoT5/NER) tidak lagi jalan di proses ini — lihat
../../nlp-service/. File ini hanya menyimpan konfigurasi untuk stage ringan
yang tetap jalan lokal: dialect detector, translate fallback, TextRank, regex
NER, keyword classify/urgency.
"""

from __future__ import annotations
import os
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = BACKEND_ROOT / "models"

# Dialect detector — priority: file lokal > HF Hub (env DIALECT_MODEL_HF) > gagal.
DIALECT_MODEL_PATH = MODELS_DIR / "dialect_detector" / "dialect_detector.joblib"
DIALECT_MODEL_HF = os.environ.get("DIALECT_MODEL_HF", "").strip()

MIN_DIALECT_CONF = 0.35        # ambang minimum confidence dialect detector
MIN_WORDS_TEXTRANK = 40        # di bawah ini summarize pakai 2 kalimat pertama langsung
EXTERNAL_TRANSLATION_CHUNK_CHARS = int(os.environ.get("EXTERNAL_TRANSLATION_CHUNK_CHARS", "4000"))
ALLOW_EXTERNAL_TRANSLATION = os.environ.get("ALLOW_EXTERNAL_TRANSLATION", "true").lower() in (
    "1", "true", "yes"
)


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

# Mapping dialek -> kode Google Translate (dipakai deep_translator fallback).
DIALECT_TO_GOOGLE: dict[str, str] = {
    "jv": "jw", "su": "su", "min": "auto", "ace": "auto",
    "ban": "auto", "bjn": "auto", "bug": "auto", "mad": "auto",
    "nij": "auto", "bbc": "auto", "en": "en",
}

STOPWORDS_ID: set[str] = {
    "yang", "dan", "di", "ke", "dari", "untuk", "dengan", "pada", "adalah",
    "ini", "itu", "tidak", "ada", "juga", "bisa", "akan", "sudah", "telah",
    "atau", "oleh", "dalam", "karena", "agar", "bila", "maka", "saat",
    "jika", "saya", "kami", "kita", "mereka", "dia", "anda", "pun", "lagi",
    "saja", "bagi", "para", "namun", "hanya", "lebih", "masih", "belum",
    "sangat", "sekali", "serta", "tersebut", "yaitu", "seperti",
}

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

# Skor lebih tinggi = lebih urgent. Total >= ambang -> level.
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


def dialect_name(code: str) -> str:
    return DIALECT_NAMES.get(code, f"Dialek {code.upper()}")
