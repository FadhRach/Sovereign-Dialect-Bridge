# Backend — Sovereign Dialect-Bridge

Django REST API untuk platform pengaduan publik berbasis AI.

## Prasyarat

| Tool | Versi Minimum | Cek |
|------|--------------|-----|
| Python | 3.10+ | `python --version` |

Database sudah di-host di Supabase — tidak perlu install Postgres lokal.

---

## Setup Lokal

### 1. Buat Virtual Environment

**macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**Windows (Command Prompt):**
```cmd
python -m venv venv
venv\Scripts\activate
```

**Windows (PowerShell):**
```powershell
python -m venv venv
venv\Scripts\Activate.ps1
```

> Tanda berhasil: prompt terminal berubah menjadi `(venv) ...`

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Konfigurasi Environment

```bash
cp .env.example .env
```

Buka `.env` dan isi:

| Variable | Cara Mendapatkan |
|----------|-----------------|
| `SECRET_KEY` | `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DATABASE_URL` | Supabase Dashboard → Project Settings → Database → Session Pooler URI |

### 4. Migrasi & Jalankan

```bash
python manage.py migrate
python manage.py runserver   # http://localhost:8000
```

---

## Perintah Umum

```bash
python manage.py createsuperuser   # buat akun admin untuk /admin/
python manage.py makemigrations    # setelah ubah model
pytest                             # semua test
pytest accounts/tests.py -v        # test spesifik
```

---

## Troubleshooting

| Gejala | Fix |
|--------|-----|
| `migrate` gagal — tidak bisa konek | Cek Supabase project aktif (free tier pause otomatis setelah 1 minggu) |
| `psycopg2` gagal install di macOS | `brew install libpq` lalu install ulang |
| `SECRET_KEY` error | Isi `SECRET_KEY` di `.env` dengan string acak 50+ karakter |
| Port 8000 sudah dipakai | `python manage.py runserver 8001` |
