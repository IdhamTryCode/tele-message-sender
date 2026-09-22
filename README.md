# Tele Message Sender

Aplikasi web internal untuk mengirim laporan terstruktur (judul, tanggal,
deskripsi, mitigasi, dan lampiran gambar opsional) ke grup Telegram tertentu.
Dibangun dengan keamanan sebagai prioritas utama: autentikasi tanpa password,
whitelist target di server, validasi berlapis, dan audit trail penuh.

## Daftar Isi

- [Fitur](#fitur)
- [Tech Stack](#tech-stack)
- [Arsitektur Keamanan](#arsitektur-keamanan)
- [Struktur Proyek](#struktur-proyek)
- [Setup Lokal](#setup-lokal)
- [Deploy ke Vercel](#deploy-ke-vercel)
- [Keputusan Desain & Alasannya](#keputusan-desain--alasannya)
- [Known Limitations](#known-limitations)

## Fitur

- **Login tanpa password** — autentikasi berbasis TOTP (Time-based One-Time
  Password), setiap user punya identitas sendiri untuk keperluan audit.
- **Form laporan terstruktur** — judul, tanggal, deskripsi, mitigasi, dan
  lampiran gambar opsional, dengan validasi di client maupun server.
- **Target Telegram lewat dropdown** — daftar target (grup/channel) di-resolve
  ke chat ID asli hanya di server; client tidak pernah menyentuh chat ID.
- **Preview sebelum kirim** — konfirmasi wajib sebelum pesan benar-benar
  dikirim, karena pesan Telegram tidak bisa ditarik kembali.
- **Sanitisasi gambar otomatis** — deteksi tipe file lewat magic bytes,
  metadata EXIF (termasuk lokasi GPS) dihapus sebelum dikirim.
- **Riwayat pengiriman** — setiap user dapat melihat riwayat laporan yang
  pernah dikirimnya sendiri.
- **Rate limiting** — dibatasi di level login maupun submit, disimpan di
  database agar tetap efektif pada deployment serverless.

## Tech Stack

| Kategori | Teknologi |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) + TypeScript |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Database | [Neon](https://neon.tech) (Postgres serverless) + [Drizzle ORM](https://orm.drizzle.team) |
| Validasi | [Zod](https://zod.dev) (shared schema client & server) |
| Form | [React Hook Form](https://react-hook-form.com) |
| Autentikasi | [otplib](https://github.com/yeojz/otplib) (TOTP) + [jose](https://github.com/panva/jose) (session JWT) |
| Keamanan file | [file-type](https://github.com/sindresorhus/file-type) (magic bytes) + [sharp](https://sharp.pixelplumbing.com) (strip EXIF) |
| Integrasi | Telegram Bot API (native `fetch`, tanpa SDK pihak ketiga) |
| Hosting | [Vercel](https://vercel.com) |

Seluruh stack dapat dijalankan pada tingkat gratis (Neon free tier, Vercel
Hobby plan) — tidak ada biaya berlangganan untuk skala tim kecil.

## Arsitektur Keamanan

```
Browser (form)
      │  validasi client-side (UX saja, bukan security boundary)
      ▼
proxy.ts ──► redirect ke /login jika tidak ada session valid
      │
      ▼
Route Handler (/api/reports)
      │
      ├─► getSession()              → derive ulang identitas dari cookie, tidak percaya proxy
      ├─► checkRateLimit()          → sliding window di Postgres
      ├─► reportSchema.safeParse()  → validasi server-side (source of truth)
      ├─► resolveTargetChatId()     → whitelist target, client hanya kirim key
      ├─► validateAndSanitizeImage()→ magic bytes + strip EXIF, tanpa simpan ke disk
      └─► sendTelegramMessage/Photo()→ plain text, tanpa parse_mode
      │
      ▼
Telegram Bot API + audit trail (tabel reports)
```

Lapisan pertahanan utama:

1. **Bot token & seluruh logic Telegram hanya berjalan di server** — tidak
   pernah masuk ke bundle client.
2. **Validasi input selalu diulang di server** menggunakan skema Zod yang
   sama dengan client, karena validasi client dapat dilewati dengan mudah.
3. **Pesan dikirim sebagai plain text** (tanpa `parse_mode`) untuk
   menghindari seluruh kelas bug escaping MarkdownV2/HTML.
4. **Upload gambar divalidasi lewat magic bytes**, bukan MIME type atau
   ekstensi dari client (keduanya trivial dipalsukan), dan di-re-encode untuk
   menghapus metadata EXIF sebelum dikirim.
5. **Rate limiting berbasis Postgres**, bukan in-memory — penting karena
   instance serverless di Vercel tidak berbagi memori antar request.
6. **TOTP dengan proteksi replay**: setiap time-step yang sudah dipakai
   dicatat per user sehingga kode yang sama tidak bisa dipakai dua kali.
7. **Session cookie** signed JWT (HS256), `httpOnly` + `secure` +
   `sameSite=strict`.
8. **Security headers** (`X-Content-Type-Options`, `X-Frame-Options`,
   `Content-Security-Policy`, dll) diterapkan lewat `next.config.ts`.
9. **Error handling terpusat** — kegagalan tak terduga (mis. koneksi DB
   putus) selalu dikembalikan sebagai pesan generik ke client; detail
   lengkap hanya tercatat di log server.

## Struktur Proyek

```
src/
├── app/
│   ├── login/              # Halaman login (username + kode TOTP)
│   ├── form/                # Form laporan utama (protected)
│   ├── history/              # Riwayat pengiriman milik user (protected)
│   └── api/
│       ├── auth/            # Login & logout
│       └── reports/          # Submit laporan & daftar target
├── components/
│   ├── ui/                  # Button, Input, Textarea, Card — primitif UI
│   ├── report-form.tsx
│   ├── report-preview-dialog.tsx
│   └── history-table.tsx
├── lib/
│   ├── db/                   # Schema Drizzle & koneksi Neon
│   ├── auth/                 # Session (JWT) & TOTP
│   ├── telegram.ts           # Wrapper Bot API (sendMessage/sendPhoto)
│   ├── rate-limit.ts         # Sliding window rate limit (Postgres)
│   ├── targets.ts            # Whitelist target Telegram
│   ├── image.ts               # Validasi & sanitisasi gambar
│   ├── crypto.ts              # AES-256-GCM untuk TOTP secret at rest
│   └── validation/            # Skema Zod
└── proxy.ts                  # Proteksi route (pengganti middleware.ts di Next.js 16)
scripts/
└── seed-user.ts               # CLI untuk mendaftarkan user baru
```

## Setup Lokal

### Prasyarat

- Node.js 20+
- Akun [Neon](https://console.neon.tech) (gratis)
- Bot Telegram (dibuat lewat [@BotFather](https://t.me/BotFather))

### 1. Clone & install

```bash
git clone https://github.com/IdhamTryCode/tele-message-sender.git
cd tele-message-sender
npm install
```

### 2. Buat Bot Telegram

1. Chat `@BotFather` di Telegram, kirim `/newbot`, ikuti instruksinya.
2. Simpan token yang diberikan.
3. Tambahkan bot ke grup/channel target dan jadikan admin (agar bisa kirim
   pesan/foto).
4. Dapatkan chat ID grup: kirim pesan apa saja ke grup, lalu buka
   `https://api.telegram.org/bot<TOKEN>/getUpdates` dan cari `"chat":{"id":...}`.
   Chat ID grup biasanya berupa angka negatif (misal `-1001234567890`).

### 3. Buat Database (Neon)

Buat database Postgres gratis di [console.neon.tech](https://console.neon.tech)
dan salin connection string-nya.

### 4. Konfigurasi environment variables

```bash
cp .env.example .env.local
```

Isi seluruh nilai di `.env.local`:

| Variable | Keterangan |
|---|---|
| `DATABASE_URL` | Connection string dari Neon |
| `TELEGRAM_BOT_TOKEN` | Token dari @BotFather |
| `TG_CHAT_<KEY>` | Satu env var per target dropdown (mis. `TG_CHAT_SOC`). Tambahkan entri yang sesuai di `src/lib/targets.ts` |
| `SESSION_SECRET` | 64 karakter hex acak — lihat perintah di bawah |
| `TOTP_ENCRYPTION_KEY` | 64 karakter hex acak — lihat perintah di bawah |

Generate secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Migrasi database

```bash
npm run db:push
```

### 6. Tambah user pertama

Tidak ada halaman admin — user didaftarkan lewat script sekali jalan:

```bash
npm run seed:user -- <username>
```

Script mencetak QR code di terminal. Scan dengan Google Authenticator, Authy,
atau aplikasi TOTP lain. Tidak ada password — kode 6 digit dari aplikasi
authenticator adalah satu-satunya kredensial.

### 7. Jalankan

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Deploy ke Vercel

Lihat panduan detail langkah demi langkah di bawah, atau ringkasnya:

1. Push repo ke GitHub (sudah dilakukan jika kamu clone dari sini).
2. Import project di [vercel.com/new](https://vercel.com/new).
3. Set seluruh environment variable dari `.env.local` di Vercel Dashboard →
   Settings → Environment Variables.
4. Deploy.
5. Jalankan `npm run seed:user -- <username>` dari lokal (dengan
   `DATABASE_URL` production yang sama) untuk menambah user setelah deploy.

## Keputusan Desain & Alasannya

Beberapa keputusan berikut mungkin terlihat tidak konvensional dibanding
tutorial pada umumnya — didokumentasikan di sini supaya tidak "diperbaiki"
tanpa memahami konsekuensinya:

- **Login TOTP tanpa password.** Tidak ada SSO korporat (Google/Microsoft
  Workspace) yang tersedia saat ini. TOTP saja tetap memberi identitas
  per-user untuk audit trail, tanpa beban maintenance password (reset flow,
  kebijakan hashing, dll). Kode dilindungi dari replay dan dibatasi rate.
- **Rate limit disimpan di Postgres, bukan in-memory.** Vercel serverless
  functions tidak berbagi memori antar invocation — `Map()` di memori akan
  reset terus-menerus dan tidak pernah benar-benar membatasi apa pun.
- **Pesan Telegram dikirim sebagai plain text, tanpa `parse_mode`.**
  MarkdownV2 membutuhkan escape untuk sekitar 18 karakter khusus; kesalahan
  kecil membuat Telegram menolak pesan (400) atau merusak format akibat
  input user. Plain text menghindari seluruh kelas bug ini.
- **Gambar divalidasi lewat magic bytes, bukan MIME/ekstensi dari client** —
  keduanya trivial dipalsukan (rename `evil.exe` jadi `evil.jpg`). Gambar
  juga di-re-encode untuk menghapus EXIF (termasuk koordinat GPS) sebelum
  dikirim, dan tidak pernah ditulis ke disk.
- **Isi laporan tidak dienkripsi di level aplikasi.** Neon sudah menerapkan
  encryption at rest secara default (melindungi dari pencurian disk fisik),
  dan untuk tingkat sensitivitas data operasional saat ini dinilai
  proporsional. TOTP secret tetap dienkripsi (AES-256-GCM) karena itu
  kredensial akses — kelas risiko yang berbeda dari isi laporan.
- **Preview/konfirmasi wajib sebelum kirim.** Pesan Telegram tidak bisa
  ditarik setelah dibaca — ini kontrol keamanan untuk mencegah salah
  target/salah isi menjadi insiden tersendiri, bukan sekadar UX.

> **Catatan untuk tim/atasan:** Telegram bukan medium terenkripsi
> end-to-end untuk grup — isi pesan tersimpan di server Telegram, di luar
> kendali organisasi. Untuk laporan tingkat operasional saat ini dinilai
> dapat diterima. Jika ke depannya isi laporan memuat detail kerentanan
> yang belum ditambal atau data yang lebih sensitif, keputusan ini perlu
> ditinjau ulang.

## Known Limitations

- `drizzle-kit` (dev-only, tidak ikut ter-deploy) menarik versi `esbuild`
  lama lewat dependency transitif `@esbuild-kit/*`, dengan satu moderate
  vulnerability (dev server esbuild dapat menerima request dari origin
  manapun). Ini hanya berdampak saat menjalankan `drizzle-kit`/`tsx` secara
  lokal, tidak pernah ikut ke production build atau runtime Vercel. Versi
  `drizzle-kit` yang memperbaikinya masih berstatus release candidate
  (belum stable) per saat ini.
- Tidak ada halaman admin untuk manajemen user — sesuai skala tim kecil
  yang ditarget. Menambah/menghapus user dilakukan lewat script atau query
  database langsung.

## Lisensi

Proyek internal — tidak dipublikasikan dengan lisensi open-source.
