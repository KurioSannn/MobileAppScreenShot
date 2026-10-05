# TASK.md — Snaply Screenshot Assistant

**Project:** Snaply  
**Platform awal:** Android  
**Framework:** Expo + React Native  
**Status:** Development Plan  
**Jumlah Task:** 20  
**Catatan:** Setup Expo / create-expo-app tidak termasuk karena project Expo sudah tersedia.

---

# Task 01 — Buat Struktur Folder & Navigation

## Goal
Menyiapkan struktur project agar fitur tidak bercampur dan mudah dikembangkan.

## Pekerjaan
- Buat struktur folder utama:
  - `app/`
  - `components/`
  - `features/`
  - `lib/`
  - `db/`
  - `hooks/`
  - `types/`
  - `utils/`
- Setup Expo Router.
- Buat route dasar:
  - Home
  - Analyze
  - Manga
  - Library
  - Search
  - Settings
- Buat bottom navigation:
  - Home
  - Library
  - Search
  - Settings

## Acceptance Criteria
- [x] Semua route dapat dibuka.
- [x] Bottom navigation berfungsi.
- [x] Manga Mode tidak menjadi bottom tab.
- [x] Struktur folder mengikuti separation of concerns.

---

# Task 02 — Implement Design System

## Goal
Menerapkan visual dasar sesuai `design.md`.

## Pekerjaan
- Buat color tokens.
- Buat spacing tokens.
- Buat radius tokens.
- Buat typography scale.
- Implement icon system menggunakan Lucide.
- Buat reusable components:
  - `PrimaryButton`
  - `SecondaryButton`
  - `IconButton`
  - `Card`
  - `ActionChip`
  - `StatusBadge`
  - `SegmentedControl`

## Acceptance Criteria
- [x] Warna utama sesuai warm minimal visual direction.
- [x] Component memiliki style konsisten.
- [x] Dark/neon AI style tidak digunakan.
- [x] Touch target minimum 44×44 px.

---

# Task 03 — Build Home Screen

## Goal
Membuat halaman utama yang langsung menjelaskan value Snaply.

## Pekerjaan
- Buat headline:
  - `Your screenshots, made useful.`
- Tambahkan tombol:
  - Analyze Screenshot
- Tambahkan quick actions:
  - Translate
  - Manga
  - Extract
  - Reminder
- Tambahkan Recent section.
- Tambahkan empty state jika belum ada history.

## Acceptance Criteria
- [x] Home tampil tanpa login.
- [x] Analyze Screenshot dapat diklik.
- [x] Empty state tampil ketika database kosong.
- [x] UI sesuai design direction.

---

# Task 04 — Implement Local SQLite Database

## Goal
Menyiapkan local-first storage.

## Pekerjaan
- Setup `expo-sqlite`.
- Buat database migration awal.
- Buat tabel:
  - `screenshots`
  - `ocr_results`
  - `translations`
  - `entities`
  - `reminders`
  - `tags`
  - `manga_pages`
  - `manga_regions`
  - `settings`
- Buat repository/helper CRUD.

## Acceptance Criteria
- [x] Database dibuat otomatis.
- [x] Migration idempotent.
- [x] CRUD screenshot berhasil.
- [x] Data tetap tersedia setelah app restart.

---

# Task 05 — Implement Gallery Screenshot Import

## Goal
User dapat memilih screenshot dari gallery.

## Pekerjaan
- Gunakan Expo Image Picker.
- Support single image.
- Support multiple image selection.
- Simpan image metadata:
  - URI
  - width
  - height
  - created_at
- Preview image segera setelah dipilih.

## Acceptance Criteria
- [x] Single screenshot dapat dipilih.
- [x] Multiple screenshot dapat dipilih.
- [x] Preview tampil tanpa menunggu OCR.
- [x] Cancel tidak menyebabkan crash.

---

# Task 06 — Implement Android Share Intent

## Goal
User dapat Share screenshot langsung dari aplikasi lain ke Snaply.

## Flow
```text
Screenshot
↓
Android Share
↓
Snaply
↓
Analyze
```

## Pekerjaan
- Tambahkan Android share intent handling.
- Terima MIME image.
- Route otomatis menuju Analyze screen.
- Tampilkan screenshot segera.
- Handle invalid input.

## Acceptance Criteria
- [x] Snaply muncul di Android share sheet.
- [x] Screenshot dapat dibuka dari share intent.
- [x] Tidak perlu membuka Home lebih dulu.
- [x] Invalid file memiliki error state.

---

# Task 07 — Build Analyze Screen & Progressive Processing UI

## Goal
Membuat pengalaman analisis screenshot tanpa blank loading screen.

## Pekerjaan
- Tampilkan image segera.
- Buat status processing:
  - Reading image
  - Detecting text
  - Detecting language
  - Finding actions
- Buat progressive result UI.
- Buat cancel/retry state.

## Acceptance Criteria
- [x] Image tampil sebelum processing selesai.
- [x] User melihat progress.
- [x] Tidak ada fullscreen spinner kosong.
- [x] Retry bekerja.

---

# Task 08 — Integrate On-Device OCR

## Goal
Membaca teks screenshot secara lokal.

## Pekerjaan
- Integrasikan native OCR compatible dengan Expo Development Build.
- Prioritas bahasa:
  - Japanese
  - Korean
  - Chinese
  - English
  - Indonesian/Latin
- Ambil:
  - raw text
  - bounding boxes
  - confidence
  - detected language
- Simpan OCR result ke SQLite.

## Acceptance Criteria
- [x] OCR dapat membaca screenshot.
- [x] Bounding boxes tersedia.
- [x] OCR berjalan tanpa membekukan UI.
- [x] Result tersimpan ke database.
- [x] User dapat melihat extracted text.

---

# Task 09 — Build Text Extraction & Copy Experience

## Goal
User dapat mengambil teks dari screenshot dengan nyaman.

## Pekerjaan
- Tampilkan hasil OCR.
- Support select region.
- Support copy full text.
- Support edit OCR result.
- Simpan hasil edit sebagai corrected text.

## Acceptance Criteria
- [x] Full text dapat disalin.
- [x] Individual region dapat dipilih.
- [x] OCR text dapat diedit.
- [x] Perubahan disimpan.

---

# Task 10 — Implement Basic Translation

## Goal
User dapat menerjemahkan hasil OCR.

## Pekerjaan
- Implement language auto-detection.
- Implement target language selection.
- Prioritas target:
  - Indonesian
  - English
- Implement Fast Translation.
- Cache translation di SQLite.
- Tambahkan Translate Again.

## Acceptance Criteria
- [ ] Japanese → Indonesian bekerja.
- [ ] Korean → Indonesian bekerja.
- [ ] Chinese → Indonesian bekerja.
- [ ] English ↔ Indonesian bekerja.
- [ ] Translation result tersimpan.
- [ ] Cached result tidak diproses ulang tanpa alasan.

---

# Task 11 — Implement Entity Detection & Suggested Actions

## Goal
Snaply memahami informasi actionable dalam screenshot.

## Entity awal
- date
- time
- URL
- price
- tracking number
- foreign language
- manga/comic pattern

## Pekerjaan
- Buat parser entity.
- Mapping entity → action.
- Tampilkan suggested actions secara dinamis.

## Contoh
```text
Deadline 12 Oct 23:59
↓
[ Create Reminder ]
```

## Acceptance Criteria
- [ ] Date/time dapat dikenali.
- [ ] URL dapat dikenali.
- [ ] Harga dapat dikenali.
- [ ] Foreign language memunculkan Translate.
- [ ] Suggested actions relevan dengan isi screenshot.

---

# Task 12 — Implement Local Reminder

## Goal
User dapat membuat reminder dari screenshot.

## Pekerjaan
- Gunakan Expo Notifications.
- Buat reminder confirmation bottom sheet.
- Editable:
  - title
  - date
  - time
  - remind before
- Simpan reminder di SQLite.
- Trigger local notification.

## Acceptance Criteria
- [ ] Reminder dapat dibuat.
- [ ] Notification muncul sesuai waktu.
- [ ] Reminder dapat dihapus.
- [ ] Screenshot asal tetap terhubung ke reminder.

---

# Task 13 — Build Screenshot Library

## Goal
Membuat history screenshot yang berguna.

## Pekerjaan
- Buat Library screen.
- Tampilkan:
  - thumbnail
  - category
  - language
  - status
  - date
- Filter:
  - All
  - Manga
  - Assignment
  - Chat
  - Product
  - Receipt
- Support delete.

## Acceptance Criteria
- [ ] History muncul dari SQLite.
- [ ] Filter bekerja.
- [ ] Screenshot dapat dibuka kembali.
- [ ] Delete menghapus data terkait dengan aman.

---

# Task 14 — Implement Full-Text Screenshot Search

## Goal
User dapat mencari screenshot berdasarkan isi teks.

## Pekerjaan
- Search OCR text.
- Search translation.
- Search category.
- Search tags.
- Highlight matched text.
- Optimize query untuk local database.

## Acceptance Criteria
- [ ] Query `deadline` menemukan screenshot yang mengandung deadline.
- [ ] Translation ikut searchable.
- [ ] Search tetap responsif dengan banyak data.
- [ ] Empty result memiliki state yang jelas.

---

# Task 15 — Build Manga Detection Pipeline

## Goal
Mendeteksi text region / speech bubble untuk Manga Mode.

## Pekerjaan
- Deteksi manga/comic layout.
- Identifikasi:
  - speech bubble
  - narration box
  - text region
- Simpan polygon / bounding box.
- Simpan confidence.
- Cocokkan OCR text dengan region.

## Acceptance Criteria
- [ ] Minimal text region dapat ditemukan.
- [ ] OCR text terhubung ke manga region.
- [ ] Confidence tersedia.
- [ ] Low-confidence region dapat dibedakan.

---

# Task 16 — Implement Reading Order & Contextual Manga Translation

## Goal
Menerjemahkan dialog berdasarkan urutan baca dan konteks.

## Pekerjaan
- Support:
  - Right → Left
  - Left → Right
  - Top → Bottom
- Buat auto-ordering region.
- Sediakan manual override.
- Gabungkan dialog page sebagai context.
- Map hasil translation kembali ke bubble masing-masing.

## Acceptance Criteria
- [ ] Japanese manga dapat diurutkan right-to-left.
- [ ] Webtoon dapat diurutkan top-to-bottom.
- [ ] User dapat override direction.
- [ ] Translation kembali ke bubble yang benar.

---

# Task 17 — Build Adaptive Manga Bubble Renderer

## Goal
Menampilkan translation tanpa menutupi artwork secara berlebihan.

## Pekerjaan
- Gunakan React Native Skia.
- Implement:
  - safe area
  - auto font sizing
  - line wrapping
  - bubble padding
- Implement render modes:
  - Replace
  - Glass
  - Floating
- Gunakan confidence untuk memilih fallback.
- Terapkan minimum readable font size.

## Acceptance Criteria
- [ ] Translation mengikuti bubble.
- [ ] Text tidak overflow.
- [ ] Font tidak menjadi terlalu kecil.
- [ ] Low-confidence menggunakan Floating Mode.
- [ ] Artwork tidak tertutup giant rectangle.

---

# Task 18 — Build Manga Reader & Editing UX

## Goal
Membuat Manga Mode terasa seperti reader/editor ringan.

## Pekerjaan
- Manga canvas.
- Original / Translated toggle.
- Previous / Next.
- Swipe antar-page.
- Tap bubble untuk select.
- Floating editor controls:
  - font size
  - alignment
  - opacity
  - edit translation
- Bubble detail bottom sheet:
  - original
  - translation
  - copy
  - edit
  - translate again

## Acceptance Criteria
- [ ] Original/Translated dapat di-toggle tanpa reload.
- [ ] Selected bubble terlihat jelas.
- [ ] Floating toolbar bekerja.
- [ ] Translation dapat diedit.
- [ ] Reader nyaman digunakan full screen.

---

# Task 19 — Implement Batch Manga Processing

## Goal
User dapat menerjemahkan beberapa screenshot manga sekaligus.

## Pekerjaan
- Multi-select screenshot.
- Buat page queue.
- Status:
  - Ready
  - Processing
  - Done
  - Failed
- Process page satu per satu bila device terbatas.
- Cache completed page.
- Buat Start Reading setelah selesai.

## Acceptance Criteria
- [ ] Minimal 2–20 pages dapat dimasukkan.
- [ ] Processing tidak membuat UI freeze.
- [ ] Failed page dapat Retry.
- [ ] Completed page tidak diproses ulang.
- [ ] Batch tidak dikunci premium.

---

# Task 20 — Performance, QA, Privacy & Beta Readiness

## Goal
Membuat MVP stabil untuk real-device testing.

## Performance
- Downscale copy untuk OCR/detection.
- Pertahankan original untuk final render.
- Jalankan OCR dan bubble detection secara parallel bila memungkinkan.
- Cache model/result.
- Hindari heavy work di UI thread.

## Privacy
- Screenshot default local.
- OCR default local.
- Tambahkan:
  - delete screenshot
  - clear history
  - disable history
  - clear local database

## QA
Test:
- low-end Android
- mid-range Android
- screenshot besar
- Japanese manga
- Korean manhwa
- normal screenshot
- invalid image
- offline mode
- app restart
- permission denied

## Product Metrics
Siapkan event ringan:
- screenshot_analyzed
- translate_completed
- manga_mode_opened
- reminder_created
- search_used
- batch_used
- processing_failed
- processing_duration

## Acceptance Criteria
- [ ] UI tidak freeze saat processing normal.
- [ ] App dapat digunakan offline untuk fitur lokal.
- [ ] Core flow tidak membutuhkan login.
- [ ] Tidak ada subscription/paywall pada MVP.
- [ ] Data dapat dihapus oleh user.
- [ ] Error tidak menyebabkan app crash.
- [ ] Build siap masuk internal/closed beta testing.

---

# Recommended Execution Order

```text
01 Structure + Navigation
        ↓
02 Design System
        ↓
03 Home
        ↓
04 SQLite
        ↓
05 Gallery Import
        ↓
06 Share Intent
        ↓
07 Analyze UI
        ↓
08 OCR
        ↓
09 Extract Text
        ↓
10 Translation
        ↓
11 Entity Detection
        ↓
12 Reminder
        ↓
13 Library
        ↓
14 Search
        ↓
15 Manga Detection
        ↓
16 Reading Order + Context
        ↓
17 Adaptive Renderer
        ↓
18 Manga Reader
        ↓
19 Batch Processing
        ↓
20 Performance + QA + Beta
```

---

# Definition of MVP Done

MVP dianggap selesai ketika user dapat melakukan flow berikut tanpa account:

```text
Install
↓
Open
↓
Choose / Share Screenshot
↓
OCR
↓
Translate / Manga Mode / Copy / Reminder
↓
Save
↓
Find it again through Library or Search
```

Untuk Manga Mode:

```text
Screenshot Manga
↓
Detect regions
↓
OCR
↓
Determine reading order
↓
Translate with context
↓
Fit translation into bubbles
↓
Read Original / Translated
```

Produk belum perlu monetisasi.

Fokus release pertama:

> **Cepat, berguna, rapi, dan cukup nyaman sampai user ingin kembali memakai Snaply.**
