# Tele Message Sender

Aplikasi internal untuk mengirim laporan (judul, tanggal, deskripsi, mitigasi,
gambar opsional) ke grup Telegram tertentu, dengan login TOTP per-user, audit
trail, dan beberapa lapisan validasi di server.

## Stack

Next.js 16 (App Router) + TypeScript, Tailwind CSS v4, Drizzle ORM + Neon
Postgres, Zod, React Hook Form, otplib (TOTP), jose (session JWT), file-type
(magic byte detection), sharp (EXIF stripping). Tidak ada dependency Telegram
pihak ketiga — hanya `fetch()` langsung ke Bot API. Semua gratis: Neon free
tier, Vercel Hobby.

## Setup

### 1. Bot Telegram

1. Chat `@BotFather` di Telegram, kirim `/newbot`, ikuti instruksinya.
2. Simpan token yang diberikan sebagai `TELEGRAM_BOT_TOKEN`.
3. Tambahkan bot ke grup/channel target, jadikan admin (supaya bisa kirim
   pesan/foto).
4. Dapatkan chat ID grup: kirim pesan apa saja ke grup, lalu buka
   `https://api.telegram.org/bot<TOKEN>/getUpdates` dan cari `"chat":{"id":...}`.
   Chat ID grup biasanya negatif (misal `-1001234567890`).

### 2. Database (Neon)

Buat database Postgres gratis di [console.neon.tech](https://console.neon.tech)
(atau via Vercel Dashboard → Storage → Create Database → Neon Postgres, yang
otomatis mengisi `DATABASE_URL` di Vercel env vars). Salin connection string.

### 3. Environment variables

```bash
cp .env.example .env.local
```

Isi semua nilai di `.env.local`:

- `DATABASE_URL` — dari Neon.
- `TELEGRAM_BOT_TOKEN` — dari @BotFather.
- `TG_CHAT_SOC`, `TG_CHAT_MGMT`, dst — satu env var per target dropdown.
  Client tidak pernah mengirim chat ID asli; hanya key (`"soc"`, `"mgmt"`)
  yang dipetakan ke chat ID ini di server (lihat `src/lib/targets.ts`). Untuk
  menambah target baru: tambahkan env var + entri di `src/lib/targets.ts`.
- `SESSION_SECRET` dan `TOTP_ENCRYPTION_KEY` — generate masing-masing dengan:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### 4. Migrasi database

```bash
npm run db:push
```

### 5. Tambah user

Tidak ada halaman admin — user ditambahkan lewat script sekali jalan:

```bash
npm run seed:user -- <username>
```

Script mencetak QR code di terminal. Scan dengan Google Authenticator, Authy,
atau aplikasi TOTP lain. Tidak ada password — kode 6 digit dari aplikasi
authenticator adalah satu-satunya kredensial.

### 6. Jalankan

```bash
npm install
npm run dev
```

## Deploy ke Vercel

1. Push repo ke GitHub, import project di Vercel.
2. Set semua environment variable dari `.env.local` di Vercel Dashboard →
   Settings → Environment Variables.
3. Deploy. Jalankan `npm run seed:user -- <username>` dari lokal (dengan
   `DATABASE_URL` yang sama) untuk menambah user setelah deploy.

## Keputusan keamanan (dan alasannya)

Beberapa keputusan yang mungkin terlihat tidak konvensional, dijelaskan
supaya tidak "diperbaiki" tanpa sadar konsekuensinya:

- **Login TOTP tanpa password.** Tidak ada SSO korporat yang tersedia; TOTP
  saja memberi identitas per-user (untuk audit trail) tanpa beban maintenance
  password (reset flow, hashing policy, dll). Kode replay-protected dan
  rate-limited.
- **Rate limit disimpan di Postgres, bukan in-memory.** Vercel serverless
  functions tidak berbagi memori antar invocation — `Map()` di memori akan
  reset terus-menerus dan tidak pernah benar-benar membatasi apa pun.
- **Pesan Telegram dikirim sebagai plain text, tanpa `parse_mode`.**
  MarkdownV2 butuh escape ~18 karakter khusus; salah sedikit, Telegram
  menolak pesan (400) atau formatting rusak akibat input user. Plain text
  menghindari seluruh kelas bug ini.
- **Gambar divalidasi lewat magic bytes (`file-type`), bukan MIME/ekstensi
  dari client** — keduanya trivial dipalsukan. Gambar juga di-re-encode lewat
  `sharp` untuk menghapus EXIF (termasuk koordinat GPS) sebelum dikirim, dan
  tidak pernah ditulis ke disk.
- **Isi laporan tidak dienkripsi di level aplikasi.** Neon sudah encrypt at
  rest secara default (melindungi dari pencurian disk fisik), dan untuk
  tingkat sensitivitas data operasional ini dinilai proporsional. TOTP
  secret tetap dienkripsi (AES-256-GCM) karena itu kredensial akses, bukan
  isi laporan — kelas risiko yang berbeda.
- **Preview/konfirmasi sebelum kirim.** Pesan Telegram tidak bisa ditarik
  setelah dibaca — ini kontrol keamanan (mencegah salah target/salah isi
  jadi insiden sendiri), bukan sekadar UX.

## Catatan untuk didokumentasikan ke atasan

Telegram bukan medium terenkripsi end-to-end untuk grup — isi pesan
tersimpan di server Telegram, di luar kendali organisasi. Untuk laporan
tingkat operasional ini dinilai dapat diterima. Kalau ke depannya isi
laporan memuat detail kerentanan yang belum ditambal atau data yang lebih
sensitif, keputusan ini perlu ditinjau ulang (misalnya menimbang medium lain
atau enkripsi tambahan).

## Known limitation

`drizzle-kit` (dev-only, tidak ikut deploy) menarik versi `esbuild` lama
lewat dependency `@esbuild-kit/*` yang sudah terintegrasi ke `tsx`, dengan
satu moderate vulnerability (dev server esbuild bisa menerima request dari
origin manapun). Ini hanya berdampak saat menjalankan `drizzle-kit`/`tsx`
secara lokal, tidak pernah ikut ke production build atau runtime Vercel.
Versi `drizzle-kit` yang memperbaikinya masih rilis candidate (belum stable)
per September 2026, jadi belum di-upgrade paksa.
