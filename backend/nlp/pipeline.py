from dataclasses import dataclass, field
from typing import Optional

# Model instances — di-load sekali via ComplaintsConfig.ready()
_summarizer = None
_ner_pipeline = None


@dataclass
class NLPResult:
    dialect: str = "xx"
    translated_text: str = ""
    summary: str = ""
    named_entities: list = field(default_factory=list)
    keywords: list = field(default_factory=list)
    urgency_level: str = "medium"
    category_name: str = "Umum"
    confidence: float = 0.0


def load_models():
    """Load NLP models ke memory. Dipanggil sekali saat startup Django."""
    global _summarizer, _ner_pipeline
    try:
        from transformers import pipeline
        _summarizer = pipeline("summarization", model="google/mt5-base")
    except Exception:
        _summarizer = None

    try:
        from transformers import pipeline
        _ner_pipeline = pipeline("ner", model="cahya/bert-base-indonesian-NER", aggregation_strategy="simple")
    except Exception:
        _ner_pipeline = None


def run_pipeline(raw_text: str) -> NLPResult:
    """Jalankan full NLP pipeline dari teks mentah ke NLPResult terstruktur."""
    dialect = detect_dialect(raw_text)
    translated = translate_to_indonesian(raw_text)
    summary = summarize(translated)
    entities = extract_entities(translated)
    category = classify_category(translated)
    urgency = score_urgency(raw_text)
    keywords = extract_keywords(summary)

    return NLPResult(
        dialect=dialect,
        translated_text=translated,
        summary=summary,
        named_entities=entities,
        keywords=keywords,
        urgency_level=urgency,
        category_name=category,
        confidence=0.8 if _summarizer else 0.5,
    )


def detect_dialect(text: str) -> str:
    """Deteksi bahasa/dialek teks. Return kode bahasa ISO 639-1 atau 'xx' jika gagal."""
    try:
        from langdetect import detect
        return detect(text)
    except Exception:
        return "xx"


def translate_to_indonesian(text: str) -> str:
    """Terjemahkan teks ke Bahasa Indonesia. Fallback ke deep-translator jika googletrans gagal."""
    try:
        from googletrans import Translator
        result = Translator().translate(text, dest="id")
        return result.text
    except Exception:
        pass
    try:
        from deep_translator import GoogleTranslator
        return GoogleTranslator(source="auto", target="id").translate(text)
    except Exception:
        return text


def summarize(text: str) -> str:
    """Ringkas teks menggunakan mT5-base. Fallback ke TextRank jika model gagal."""
    if _summarizer:
        try:
            result = _summarizer(text, max_length=130, min_length=30, do_sample=False)
            return result[0]["summary_text"]
        except Exception:
            pass
    return _summarize_with_textrank(text)


def extract_entities(text: str) -> list:
    """Ekstrak named entities menggunakan IndoBERT. Fallback ke regex jika model gagal."""
    if _ner_pipeline:
        try:
            entities = _ner_pipeline(text)
            return [{"text": e["word"], "label": e["entity_group"], "score": round(e["score"], 3)} for e in entities]
        except Exception:
            pass
    return _extract_entities_with_regex(text)


def classify_category(text: str) -> str:
    """Klasifikasi kategori aduan berdasarkan keyword matching."""
    text_lower = text.lower()
    category_keywords = {
        "Infrastruktur": ["jalan", "jembatan", "drainase", "rusak", "berlubang", "bocor", "gorong"],
        "Kesehatan": ["puskesmas", "rsud", "rumah sakit", "dokter", "obat", "sanitasi", "stunting"],
        "Pendidikan": ["sekolah", "guru", "buku", "beasiswa", "siswa", "murid", "ruang kelas"],
        "Keamanan": ["kriminal", "pencurian", "tawuran", "narkoba", "kekerasan", "begal"],
        "Lingkungan": ["sampah", "banjir", "polusi", "limbah", "sungai", "longsor"],
        "Sosial": ["bantuan", "kemiskinan", "lansia", "disabilitas", "pkl", "gelandangan"],
        "Administrasi": ["ktp", "akta", "sertifikat", "izin", "pungli", "birokrasi"],
    }
    for category, keywords in category_keywords.items():
        if any(kw in text_lower for kw in keywords):
            return category
    return "Umum"


def score_urgency(text: str) -> str:
    """Tentukan tingkat urgensi aduan berdasarkan keyword matching."""
    text_lower = text.lower()
    critical_keywords = ["darurat", "kebakaran", "banjir besar", "nyawa", "kematian", "meninggal", "ledakan"]
    high_keywords = ["rusak parah", "mendesak", "sudah lama", "berbulan", "bertahun", "tidak kunjung"]
    low_keywords = ["saran", "usul", "mohon", "harap", "semoga", "kalau bisa"]

    if any(kw in text_lower for kw in critical_keywords):
        return "critical"
    if any(kw in text_lower for kw in high_keywords):
        return "high"
    if any(kw in text_lower for kw in low_keywords):
        return "low"
    return "medium"


def extract_keywords(text: str) -> list:
    """Ekstrak kata kunci penting dari teks ringkasan."""
    import re
    stop_words = {"yang", "dan", "di", "ke", "dari", "untuk", "dengan", "pada", "adalah", "ini", "itu", "tidak", "ada"}
    words = re.findall(r"\b[a-zA-Z]{4,}\b", text.lower())
    return list({w for w in words if w not in stop_words})[:10]


def _summarize_with_textrank(text: str) -> str:
    """Fallback summarization menggunakan TextRank (sumy library)."""
    try:
        from sumy.parsers.plaintext import PlaintextParser
        from sumy.nlp.tokenizers import Tokenizer
        from sumy.summarizers.text_rank import TextRankSummarizer

        parser = PlaintextParser.from_string(text, Tokenizer("indonesian"))
        summarizer = TextRankSummarizer()
        sentences = summarizer(parser.document, 2)
        return " ".join(str(s) for s in sentences)
    except Exception:
        # Ambil 2 kalimat pertama sebagai last-resort fallback
        sentences = text.split(".")
        return ". ".join(s.strip() for s in sentences[:2] if s.strip()) + "."


def _extract_entities_with_regex(text: str) -> list:
    """Fallback NER menggunakan regex untuk pola umum dalam teks Indonesia."""
    import re
    entities = []
    loc_patterns = [r"Jalan\s+\w+", r"Jl\.\s*\w+", r"Desa\s+\w+", r"Kelurahan\s+\w+", r"Kecamatan\s+\w+"]
    org_patterns = [r"Dinas\s+\w+", r"BPBD", r"PLN", r"PDAM", r"Polri", r"Puskesmas\s+\w*"]

    for pattern in loc_patterns:
        for match in re.findall(pattern, text):
            entities.append({"text": match, "label": "LOC", "score": 0.7})
    for pattern in org_patterns:
        for match in re.findall(pattern, text):
            entities.append({"text": match, "label": "ORG", "score": 0.7})

    return entities
