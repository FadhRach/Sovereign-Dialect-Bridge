#!/usr/bin/env python
"""
Upload mT5-base custom (fine-tuned NusaSum) ke Hugging Face Hub.

Cara pakai:

    1. Generate HF token: https://huggingface.co/settings/tokens (Write access)
    2. Login: `huggingface-cli login` (paste token)
    3. Jalankan:
       cd backend
       python scripts/upload_mt5_to_hf.py <hf-username> <repo-name>

    Contoh:
       python scripts/upload_mt5_to_hf.py oinovenv sovereign-mt5-nusasum

Setelah upload sukses:
    - Set di HF Space Secret: MT5_MODEL_PATH=<username>/<repo-name>
    - Pipeline auto-pull model dari HF Hub (cached di /data/huggingface)

Repo akan dibuat sebagai PUBLIC. Untuk private, edit `private=True` di kode.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
MT5_LOCAL = BACKEND_ROOT / "models" / "mt5base"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("username", help="HF username (atau org name)")
    parser.add_argument("repo_name", help="Nama repo, mis. sovereign-mt5-nusasum")
    parser.add_argument("--private", action="store_true", help="Buat repo private (default public)")
    parser.add_argument("--commit-msg", default="upload mT5-base fine-tuned NusaSum",
                        help="Commit message saat push")
    args = parser.parse_args()

    if not MT5_LOCAL.exists():
        print(f"ERROR: Folder model tidak ada di {MT5_LOCAL}", file=sys.stderr)
        return 1

    required_files = ["config.json", "model.safetensors", "tokenizer.json", "spiece.model"]
    missing = [f for f in required_files if not (MT5_LOCAL / f).exists()]
    if missing:
        print(f"ERROR: Missing file di {MT5_LOCAL}: {missing}", file=sys.stderr)
        return 1

    repo_id = f"{args.username}/{args.repo_name}"

    try:
        from huggingface_hub import HfApi, create_repo
    except ImportError:
        print("ERROR: huggingface_hub belum terinstal. Run: pip install huggingface_hub", file=sys.stderr)
        return 1

    api = HfApi()

    print(f"→ Creating repo: {repo_id} (private={args.private})")
    create_repo(
        repo_id=repo_id,
        repo_type="model",
        private=args.private,
        exist_ok=True,
    )

    print(f"→ Uploading folder {MT5_LOCAL} ke {repo_id}")
    print(f"  Total size: ~2.2 GB. Estimasi waktu: 5-15 menit tergantung koneksi.")
    api.upload_folder(
        folder_path=str(MT5_LOCAL),
        repo_id=repo_id,
        repo_type="model",
        commit_message=args.commit_msg,
    )

    print()
    print(f"✓ DONE. Model live di: https://huggingface.co/{repo_id}")
    print()
    print("Langkah berikutnya:")
    print(f"  1. HF Space → Settings → Secrets → tambah:")
    print(f"     MT5_MODEL_PATH={repo_id}")
    print(f"  2. Restart Space → pipeline auto-pull model dari HF Hub")
    return 0


if __name__ == "__main__":
    sys.exit(main())
