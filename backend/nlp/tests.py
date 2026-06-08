from unittest import TestCase
from unittest.mock import patch

from nlp import pipeline


class TranslationPipelineTests(TestCase):
    def test_split_translation_chunks_preserves_long_text_tail(self):
        text = (
            "Sugeng siang. Kula minangka perwakilan warga badhe ngaturaken keluhan. "
            * 18
        ).strip()

        chunks = pipeline._split_translation_chunks(text, max_chars=120)

        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(len(chunk) <= 120 for chunk in chunks))
        self.assertIn("keluhan", " ".join(chunks))

    def test_translate_to_indonesian_retries_external_when_nllb_output_too_short(self):
        long_text = (
            "Sugeng siang. Kula minangka perwakilan warga badhe ngaturaken uneg-uneg. "
            * 12
        ).strip()

        with patch.object(pipeline.loader, "get", return_value=object()), \
             patch.object(pipeline.loader, "get_tokenizer", return_value=object()), \
             patch.object(pipeline, "_translate_nllb", return_value="Selamat siang."), \
             patch.object(
                 pipeline,
                 "_translate_external",
                 return_value="Selamat siang. Saya sebagai perwakilan warga menyampaikan keluhan lengkap.",
             ) as mocked_external, \
             patch.object(pipeline.config, "ALLOW_EXTERNAL_TRANSLATION", True):
            translated = pipeline.translate_to_indonesian(long_text, "jv")

        self.assertEqual(
            translated,
            "Selamat siang. Saya sebagai perwakilan warga menyampaikan keluhan lengkap.",
        )
        mocked_external.assert_called_once_with(long_text, "jv")

    def test_translate_to_indonesian_uses_external_for_unsupported_dialect(self):
        madura_text = "Asangkep sareng seret paneka, kaula badha ngadhuwani pelayanan aeng."

        with patch.object(
            pipeline,
            "_translate_external",
            return_value="Sehubungan dengan itu, saya ingin mengadukan pelayanan air.",
        ) as mocked_external, \
             patch.object(pipeline.config, "ALLOW_EXTERNAL_TRANSLATION", True):
            translated = pipeline.translate_to_indonesian(madura_text, "mad")

        self.assertEqual(
            translated,
            "Sehubungan dengan itu, saya ingin mengadukan pelayanan air.",
        )
        mocked_external.assert_called_once_with(madura_text, "mad")

    def test_is_translation_usable_rejects_nearly_identical_long_output(self):
        source = (
            "nahanya di paskal loba parkir liar kumaha nya mun parkir liar ieu di tindak "
            "ku pemerintah soalna eta jalan nu lega dipake parkir liar nepi ka macet "
        ) * 4

        self.assertFalse(pipeline._is_translation_usable(source, source, "su"))
