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
- **Aktivasi akun dengan kode sekali pakai** — admin daftarkan username +
  kode aktivasi (`seed:user`); user mengaktivasi akunnya sendiri di
  `/aktivasi` dengan username + kode itu, lalu scan QR dan konfirmasi TOTP.
  Tanpa kode yang benar, siapa pun yang sekadar tahu/menebak username tidak
  bisa memicu atau mengklaim setup TOTP orang lain.
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
   Status setup (`totpConfirmedAt`) terpisah dari keberadaan secret.
7. **Aktivasi akun butuh kode sekali pakai** (`activationCode`), bukan
   cuma username — QR TOTP hanya pernah diterbitkan lewat `/aktivasi`
   setelah kode itu diverifikasi, dan langsung dikonsumsi (di-null-kan)
   begitu terpakai. Endpoint pengecekan status login (`/login`) tidak
   pernah menerbitkan QR untuk username mana pun.
8. **Session cookie** signed JWT (HS256), `httpOnly` + `secure` +
   `sameSite=strict`.
9. **Security headers** (`X-Content-Type-Options`, `X-Frame-Options`,
   `Content-Security-Policy`, dll) diterapkan lewat `next.config.ts`.
10. **Error handling terpusat** — kegagalan tak terduga (mis. koneksi DB
   putus) selalu dikembalikan sebagai pesan generik ke client; detail
   lengkap hanya tercatat di log server.

## Struktur Proyek

```
src/
├── app/
│   ├── login/              # Halaman login (username + kode TOTP)
│   ├── aktivasi/            # Aktivasi akun baru (username + kode aktivasi → QR)
│   ├── form/                # Form laporan utama (protected)
│   ├── history/              # Riwayat pengiriman milik user (protected)
│   └── api/
│       ├── auth/            # Login, aktivasi & logout
│       └── reports/          # Submit laporan & daftar target
├── components/
│   ├── ui/                  # Button, Input, Textarea, Card — primitif UI
│   ├── totp-setup-step.tsx  # UI scan-QR-&-konfirmasi, dipakai oleh /aktivasi
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
│   ├── crypto.ts              # AES-256-GCM untuk TOTP secret + generator kode aktivasi
│   └── validation/            # Skema Zod
└── proxy.ts                  # Proteksi route (pengganti middleware.ts di Next.js 16)
scripts/
├── seed-user.ts               # CLI untuk mendaftarkan user baru + kode aktivasi
└── reissue-activation.ts      # CLI untuk menerbitkan ulang kode aktivasi yang hilang/kedaluwarsa
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

Tidak ada halaman admin — username didaftarkan lewat script sekali jalan,
yang sekaligus menerbitkan kode aktivasi:

```bash
npm run seed:user -- <username>
```

Script mencetak kode aktivasi (8 karakter, berlaku 48 jam). Sampaikan
username dan kode itu ke user lewat kanal terpercaya (WA/lisan). User lalu
mengaktivasi akunnya sendiri: buka `/aktivasi`, masukkan username + kode
aktivasi, lalu scan QR code yang muncul dengan Google Authenticator/Authy/
aplikasi TOTP lain, dan masukkan kode pertama untuk konfirmasi sekaligus
login. Tanpa kode aktivasi yang benar, tidak ada QR yang diterbitkan —
sekadar tahu/menebak username tidak cukup. Tidak ada password — kode 6
digit dari aplikasi authenticator adalah satu-satunya kredensial setelah
aktivasi.

Kalau kode aktivasi hilang atau kedaluwarsa sebelum sempat dipakai:

```bash
npm run reissue:activation -- <username>
```

(Menolak dijalankan untuk user yang sudah aktif — tidak ada yang perlu
diterbitkan ulang untuk akun yang sudah confirmed.)

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
- **[RESOLVED] Setup TOTP tanpa token undangan terpisah.** Sebelumnya
  siapa pun yang tahu/menebak sebuah username terdaftar bisa
  memicu/mengklaim setup TOTP-nya lewat `/login`, selama setup itu belum
  pernah dikonfirmasi — celah "unclaimed account takeover" klasik yang
  diidentifikasi lewat review keamanan eksternal. Diperbaiki dengan
  memisahkan aktivasi akun sepenuhnya ke `/aktivasi`, yang mewajibkan kode
  aktivasi sekali pakai (`activationCode`, digenerate saat `seed:user`,
  dikirim admin ke user secara out-of-band) di samping username sebelum
  QR TOTP diterbitkan sama sekali. `/login` sendiri tidak pernah lagi
  menerbitkan QR untuk username mana pun — lihat
  `src/app/api/auth/activate/route.ts`. Kode langsung dikonsumsi
  (di-null-kan) begitu terpakai sekali, dan kedaluwarsa 48 jam jika tidak
  dipakai.
- **[RISIKO DITERIMA — RENDAH] Pesan "Akun sudah aktif" di `/aktivasi`
  membocorkan status akun untuk username yang diketahui.** Kalau username
  yang sudah confirmed dicoba diaktivasi ulang, responnya spesifik ("Akun
  sudah aktif, silakan login") — bukan pesan generik yang sama seperti
  kasus username salah/kode salah. Ini secara sadar membocorkan "username
  ini terdaftar dan aktif" (tidak ada kredensial yang bocor) demi UX yang
  jauh lebih baik untuk user yang salah nyasar ke halaman aktivasi
  (misalnya lupa sudah pernah aktivasi). **Kapan wajib direvisit:** kalau
  daftar username jadi predictable/mudah ditebak dan kebocoran status
  "aktif/tidak" dinilai berisiko (mis. dipakai untuk social engineering
  bertarget) — perbaikannya cukup mengganti pesan ini jadi generik juga,
  tanpa perubahan arsitektur.
- **[RISIKO DITERIMA — RENDAH] Kode aktivasi disampaikan lewat kanal
  manusia (WA/lisan), bukan sistem otomatis.** Ini titik lemah manusia,
  bukan teknis (diangkat lewat red-team exercise internal): kalau akun
  WhatsApp admin yang mengirim kode itu ter-compromise, atau kode
  ter-intersep saat disampaikan lisan, penyerang dapat kode aktivasi yang
  sama validnya dengan yang diterima user asli. **Kenapa diterima:** tidak
  ada infrastruktur email/SMS resmi yang bisa diaudit untuk aplikasi
  internal skala ini — menambahkannya cuma memindahkan titik lemah yang
  sama ke sistem lain (email admin ter-compromise = celah yang sama).
  Kode tetap satu kali pakai dan kedaluwarsa 48 jam, jadi jendela
  eksposur kalau kanal WA/lisan itu bocor tetap terbatas waktu, tidak
  permanen. **Mitigasi operasional:** admin memverifikasi identitas
  penerima sebelum mengirim kode (bukan broadcast ke grup), dan idealnya
  username & kode disampaikan lewat dua pesan/momen terpisah, bukan
  digabung jadi satu. **Kapan wajib direvisit:** kalau organisasi
  menyediakan SSO/identity provider resmi — di titik itu migrasi ke SSO
  jadi prioritas yang menghilangkan seluruh kelas risiko ini, bukan cuma
  activation code.
- **[RISIKO DITERIMA — RENDAH] CSP `script-src` memakai `'unsafe-inline'`.**
  Next.js App Router menyuntikkan inline script untuk data hydration RSC
  di setiap halaman, termasuk yang di-prerender statis (`/login` adalah
  static route — cek `next build` output) — tanpa `'unsafe-inline'`,
  React gagal hydrate total dan halaman jadi tidak interaktif sama sekali
  (pernah terjadi persis begini di sesi pengembangan awal). Alternatif
  yang lebih ketat, CSP berbasis nonce, mengharuskan **semua** halaman
  dirender secara dinamis (kehilangan static optimization) — untuk
  `/login`, yang paling sering diakses (tiap percobaan login), ini
  trade-off performa nyata, bukan cuma teori. **Mitigasi yang menggantikan
  proteksi CSP ini:** tidak ada satu pun `dangerouslySetInnerHTML` di
  codebase; seluruh input user (judul, deskripsi, mitigasi, dll) dirender
  sebagai plain text lewat JSX (auto-escaped React), tidak pernah
  diinterpolasi ke markup mentah — ini yang jadi lapisan utama proteksi
  XSS, CSP hanya lapisan tambahan (defense in depth), bukan satu-satunya
  garis pertahanan. **Kapan wajib direvisit:** kalau ada fitur baru yang
  butuh render HTML dari input user (rich text, dll) — di titik itu nonce
  atau sanitisasi HTML eksplisit (mis. DOMPurify) wajib dipertimbangkan.

- **[RISIKO DITERIMA — RENDAH] Kunci manual TOTP ditampilkan sebagai teks
  di layar setup.** Untuk user yang tidak bisa scan QR, secret TOTP mentah
  (`manualKey`) ditampilkan apa adanya sebagai fallback — pola standar di
  hampir semua aplikasi authenticator (Google Authenticator, Authy, dll
  semua punya fallback serupa). Risikonya terbatas pada device/jaringan
  lokal user saat momen setup itu saja (shoulder-surfing, shared device);
  tidak tersimpan di log atau tempat lain setelah request selesai. Cukup
  diterima selama asumsi "user pakai device pribadi saat setup" berlaku.

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
- Request ke path dengan encoded slash (mis. `/form%2f`) menghasilkan HTTP
  500 di production (Vercel), tapi 404 yang benar saat dijalankan lokal
  (`next start`) — diverifikasi lewat reproduksi langsung, bukan dugaan.
  Ini karakteristik layer Edge/CDN Vercel dalam menangani path yang belum
  ter-decode sebelum request mencapai runtime Next.js, di luar kendali
  kode aplikasi (bukan bug di `proxy.ts` atau route manapun — keduanya
  terbukti tidak pernah menerima request ini). Respons 500 itu generic
  Next.js error page, tidak ada stack trace atau info internal yang bocor
  — ditemukan lewat red-team exercise internal, dinilai info-only/kosmetik,
  tidak ada perbaikan yang bisa dilakukan dari sisi kode aplikasi ini.

## Lisensi

Proyek internal — tidak dipublikasikan dengan lisensi open-source.
