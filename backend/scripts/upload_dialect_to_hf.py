#!/usr/bin/env python
"""
Upload dialect detector (joblib LogReg + metadata) ke Hugging Face Hub.

Cara pakai:
    cd backend
    python scripts/upload_dialect_to_hf.py <hf-username> <repo-name>

Contoh:
    python scripts/upload_dialect_to_hf.py OinoVenv sovereign-dialect-detector

Setelah upload:
    Set di HF Space Secret: DIALECT_MODEL_PATH=<username>/<repo-name>
    (default lokal sudah pakai path models/dialect_detector/ jika ada)
"""

from __future__ import annotations
import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
DETECTOR_LOCAL = BACKEND_ROOT / "models" / "dialect_detector"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("username", help="HF username")
    parser.add_argument("repo_name", help="Nama repo, mis. sovereign-dialect-detector")
    parser.add_argument("--private", action="store_true", help="Buat repo private")
    args = parser.parse_args()

    if not DETECTOR_LOCAL.exists():
        print(f"ERROR: Folder tidak ada di {DETECTOR_LOCAL}", file=sys.stderr)
        return 1

    required = ["dialect_detector.joblib"]
    missing = [f for f in required if not (DETECTOR_LOCAL / f).exists()]
    if missing:
        print(f"ERROR: Missing: {missing}", file=sys.stderr)
        return 1

    repo_id = f"{args.username}/{args.repo_name}"

    try:
        from huggingface_hub import HfApi, create_repo
    except ImportError:
        print("ERROR: pip install huggingface_hub", file=sys.stderr)
        return 1

    api = HfApi()
    print(f"→ Creating repo: {repo_id}")
    create_repo(repo_id=repo_id, repo_type="model", private=args.private, exist_ok=True)

    print(f"→ Uploading {DETECTOR_LOCAL} (~5 MB)...")
    api.upload_folder(
        folder_path=str(DETECTOR_LOCAL),
        repo_id=repo_id,
        repo_type="model",
        commit_message="upload dialect detector (joblib LogReg, 12 dialek nusantara)",
    )

    print(f"\n✓ DONE: https://huggingface.co/{repo_id}")
    print(f"\nSet HF Space Secret:")
    print(f"  DIALECT_MODEL_HF = {repo_id}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
