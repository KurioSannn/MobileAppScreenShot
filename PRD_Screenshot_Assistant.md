# PRD — Screenshot Assistant

**Working title:** Snaply  
**Version:** 0.1  
**Status:** Draft MVP  
**Platform awal:** Android  
**Tech direction:** Expo / React Native, local-first

## 1. Product Summary

Screenshot Assistant adalah aplikasi mobile yang mengubah screenshot menjadi sesuatu yang langsung berguna.

Alih-alih screenshot hanya menumpuk di galeri, pengguna dapat membagikan screenshot ke aplikasi dan mendapatkan tindakan yang relevan seperti:
- Translate
- Manga Mode
- Copy / extract text
- Reminder dari tanggal atau waktu yang terdeteksi
- Simpan dan cari screenshot berdasarkan isi teks
- Kelompokkan screenshot secara otomatis berdasarkan konteks

Prinsip produk:

> **Screenshot it. We handle the rest.**

Manga translation menjadi salah satu killer feature awal, tetapi produk tidak dibatasi hanya untuk manga.

## 2. Problem Statement

Pengguna sering melakukan screenshot untuk menyimpan informasi sementara:
- dialog manga
- pengumuman
- deadline
- chat
- harga produk
- tiket
- invoice
- alamat
- nomor resi
- teks bahasa asing

Masalah utamanya:
1. Screenshot mudah menumpuk dan sulit dicari kembali.
2. Screen translator yang ada sering terasa lambat.
3. Hasil translate manga sering menutupi artwork.
4. Ukuran overlay translate sering tidak mengikuti speech bubble.
5. Terjemahan antar-bubble sering tidak memiliki konteks.
6. Banyak aplikasi memberikan limit agresif atau memaksa premium terlalu cepat.
7. Banyak aplikasi mewajibkan login padahal user hanya ingin cepat memakai fitur.
8. Workflow screenshot → buka app → upload → translate terlalu panjang.

## 3. Product Vision

Membuat aplikasi yang menjadi reflex setelah user mengambil screenshot:

> **“Kalau gue screenshot sesuatu, gue share ke aplikasi ini.”**

Aplikasi harus terasa seperti utility bawaan HP:
- cepat
- sederhana
- tidak mengganggu
- tidak memaksa login
- local-first
- tetap berguna walau tanpa subscription

## 4. Product Goals

### Primary Goals
1. User mendapat value pertama dalam waktu kurang dari 1 menit setelah install.
2. User dapat melakukan translate screenshot dengan sesedikit mungkin langkah.
3. Manga translation tidak menutupi artwork secara berlebihan.
4. Screenshot dapat dicari berdasarkan isi OCR.
5. Core feature dapat digunakan tanpa account.
6. Core workflow tetap terasa cepat pada perangkat Android kelas menengah.
7. App tetap berguna walaupun backend/cloud tidak tersedia.

### Secondary Goals
- Membentuk habit penggunaan berulang.
- Menjadi screenshot utility, bukan sekadar translator.
- Menyediakan fondasi untuk fitur AI/cloud di masa depan.
- Menyediakan arsitektur yang mudah dikembangkan ke iOS.

## 5. Non-Goals untuk MVP

Fitur berikut **tidak menjadi prioritas MVP awal**:
- wajib login
- social/community feature
- cloud sync
- payment/subscription
- floating live screen translator
- continuous screen capture
- web version
- desktop version
- editing manga secara profesional
- full document translation
- heavy generative image editing

Monetisasi belum menjadi fokus utama.

## 6. Target Users

### Persona A — Manga / Manhwa Reader
**Need:** menerjemahkan dialog dari screenshot dengan cepat.

Pain points:
- OCR teks Jepang/Korea tidak rapi
- overlay terlalu besar
- artwork tertutup
- terjemahan literal dan tidak natural
- harus bolak-balik antar-app

### Persona B — Student
**Need:** screenshot pengumuman, deadline, materi, chat kelas.

Pain points:
- lupa isi screenshot
- susah cari screenshot lama
- deadline tidak otomatis menjadi reminder

### Persona C — General Mobile User
**Need:** mengambil teks atau memahami screenshot bahasa asing.

Use case:
- screenshot produk
- tiket
- invoice
- nomor resi
- alamat
- chat
- artikel

## 7. Core Product Flow

### Flow A — Share Screenshot

```text
Take Screenshot
      ↓
Share
      ↓
Screenshot Assistant
      ↓
OCR + content detection
      ↓
Suggested Actions
```

Suggested actions:
```text
[ Translate ]
[ Manga Mode ]
[ Copy Text ]
[ Remind Me ]
[ Save ]
```

Tidak ada login wall.

### Flow B — Import dari Gallery

```text
Open App
   ↓
Choose Screenshot
   ↓
Analyze
   ↓
Result
```

### Flow C — Screenshot History

```text
Home
 ↓
History
 ↓
Search "deadline"
 ↓
OCR full-text search
 ↓
Relevant screenshots
```

## 8. Core Features — MVP

### 8.1 Screenshot Import

User dapat:
- Share screenshot dari Android share sheet.
- Memilih screenshot dari gallery.
- Memilih beberapa screenshot sekaligus.

#### Acceptance Criteria
- App dapat menerima image dari share intent.
- User dapat memilih image manual.
- Image tampil sebelum proses analisis selesai.
- User dapat membatalkan proses.

### 8.2 OCR

App membaca text dari screenshot.

Output minimal:
- raw text
- language
- bounding box
- confidence bila tersedia

OCR harus berjalan secara local/on-device bila memungkinkan.

#### Acceptance Criteria
- OCR tidak memblokir UI.
- Text dapat disalin.
- OCR result disimpan bersama screenshot.
- User dapat edit OCR text jika salah.

### 8.3 Translate

User dapat memilih:
- source language otomatis
- target language
- translate seluruh screenshot
- translate selected text

Bahasa awal prioritas:
- Japanese
- Korean
- Chinese
- English
- Indonesian

#### Translation Modes

**Fast**
- default
- prioritaskan kecepatan
- suitable untuk penggunaan sehari-hari

**Natural**
- optional later
- prioritaskan konteks dan naturalness

## 9. Manga Mode

Manga Mode adalah killer feature utama.

### 9.1 Bubble Detection

System mendeteksi:
- speech bubble
- text box
- narration box
- text region

Setiap region memiliki:
```text
id
polygon / bounding box
text
reading order
translation
confidence
```

### 9.2 Reading Order

System harus mendukung:
- Right → Left
- Left → Right
- Top → Bottom

User dapat override reading direction.

### 9.3 Contextual Translation

Dialog tidak selalu diterjemahkan bubble-per-bubble secara terisolasi.

Pipeline:
```text
Bubble 1
Bubble 2
Bubble 3
Bubble 4
   ↓
Build page context
   ↓
Translate
   ↓
Map result kembali ke setiap bubble
```

Tujuan:
- pronoun lebih konsisten
- dialog tidak terasa terputus
- slang lebih natural
- hubungan antar-kalimat lebih masuk akal

### 9.4 Adaptive Bubble Translation

Translation overlay harus menyesuaikan area balon manga.

#### Rules
1. Jangan menutupi artwork jika tersedia ruang dalam bubble.
2. Text harus mengikuti safe area.
3. Font size auto-fit.
4. Line wrapping otomatis.
5. Ada minimum readable font size.
6. Jika translation terlalu panjang:
   - tampilkan versi ringkas dalam bubble
   - full translation dapat dibuka saat tap
7. User dapat melihat original text kapan saja.

### 9.5 Render Modes

#### Replace Mode
Original text dibersihkan lalu translation ditempatkan di bubble.

#### Glass Mode
Translation memakai translucent layer mengikuti shape bubble.

#### Floating Mode
Translation muncul sebagai label/card kecil terhubung ke bubble saat confidence rendah.

### 9.6 Original / Translated Toggle

User dapat berpindah:
```text
Original ↔ Translated
```

Tanpa reload page.

### 9.7 Bubble Interaction

Tap bubble:
```text
Translated text
Original text

[ Copy ]
[ Edit ]
[ Translate Again ]
```

### 9.8 Batch Manga Screenshots

Batch processing **bukan premium gate**.

User dapat memilih beberapa screenshot manga dan memprosesnya sebagai sequence.

Target awal:
- 2–20 images per batch
- sequential preview
- next / previous
- translation cache

Jika device terlalu lemah, proses dilakukan queue per page.

## 10. Screenshot Actions

Setelah OCR, app mencoba mendeteksi entity.

### Date / Time
Contoh:
```text
Deadline 12 October 23:59
```
Action:
```text
[ Create Reminder ]
```

### URL
Action:
```text
[ Copy Link ]
```

### Price
Contoh:
```text
Rp 5.499.000
```
Action:
```text
[ Save Product ]
```

### Tracking Number
Action:
```text
[ Copy ]
[ Save ]
```

### Foreign Language
Action:
```text
[ Translate ]
```

### Manga / Comic Pattern
Action:
```text
[ Manga Mode ]
```

## 11. Reminder

Reminder dibuat dari informasi screenshot.

```text
OCR detects date
      ↓
"Deadline detected"
      ↓
[ Remind Me ]
      ↓
Confirm date & time
      ↓
Local notification
```

Reminder tidak memerlukan account.

## 12. Screenshot Library

Setiap screenshot yang disimpan memiliki:
```text
image
OCR text
language
category
tags
created_at
source
entities
translation
```

### Auto Categories
- Manga
- Assignment
- Chat
- Product
- Receipt
- Ticket
- Other

## 13. Search

Search harus mencari berdasarkan:
- OCR text
- translation
- tag
- category
- detected entities

Example:
```text
search: "deadline"
```

Result:
```text
Assignment — Oct 8
Class group screenshot — Oct 12
Event announcement — Oct 20
```

## 14. Login Strategy

### MVP
**Tidak ada login wajib.**

App dapat digunakan penuh setelah install.

Data disimpan local.

### Future
Account baru diperkenalkan jika user membutuhkan:
- cloud backup
- multi-device sync
- restore after reinstall
- web access

Copy yang disarankan:

> **Want your screenshot library on another device? Sign in to sync.**

Bukan:

> **Create an account to continue.**

## 15. Free-First Strategy

Tujuan launch:

> Membuat user nyaman dan membentuk habit sebelum memikirkan monetisasi.

Core feature saat launch:
- OCR
- Translate
- Manga Mode
- Batch manga screenshots
- Copy text
- Reminder
- Screenshot history
- Search
- Local storage

Tidak ada:
- artificial daily translate limit
- manga mode paywall
- compulsory trial
- subscription popup pada first launch

Monetisasi baru dipertimbangkan setelah produk memiliki retention yang sehat dan user benar-benar menggunakan app.

## 16. Performance Requirements

Performance adalah bagian dari core product, bukan bonus.

### Target UX

```text
Screenshot selected
      ↓
Image visible immediately
      ↓
OCR regions appear
      ↓
Translation starts appearing
      ↓
Final overlay
```

User tidak menunggu blank loading screen hingga seluruh pipeline selesai.

### Performance Targets
Target awal untuk screenshot normal pada Android mid-range:
- image preview: < 300 ms
- OCR first result: target < 1.5 s
- basic translation first result: target < 2.5 s
- UI tetap responsive selama processing

Angka di atas adalah target engineering, bukan SLA.

## 17. Performance Architecture

Gunakan dua versi image:

```text
Original
↓
final render

Downscaled copy
↓
OCR
bubble detection
analysis
```

Parallel processing:

```text
             Screenshot
                 │
        ┌────────┴─────────┐
        ↓                  ↓
       OCR          Bubble Detection
        │                  │
        └────────┬─────────┘
                 ↓
            Reading Order
                 ↓
              Translate
                 ↓
               Render
```

## 18. Local-First Architecture

```text
Expo / React Native
        │
        ├── Screenshot input
        ├── OCR
        ├── Entity parser
        ├── Translation
        ├── Manga pipeline
        ├── Skia renderer
        ├── Notifications
        └── SQLite
```

### SQLite Candidate Tables
```text
screenshots
ocr_results
translations
entities
reminders
tags
manga_pages
manga_regions
settings
```

## 19. Data Model

### screenshots
```text
id
image_uri
width
height
created_at
source_app
category
```

### ocr_results
```text
id
screenshot_id
text
language
confidence
bounds
```

### manga_regions
```text
id
screenshot_id
region_type
polygon
original_text
translated_text
reading_order
confidence
render_mode
```

### reminders
```text
id
screenshot_id
title
scheduled_at
status
```

## 20. Privacy

Default behavior:
- screenshot tetap di device
- OCR result tetap di device
- history tetap di device

Jika suatu saat ada cloud AI, app harus memberi tahu user sebelum image/text dikirim ke server.

User harus dapat:
- delete screenshot
- delete translation
- clear history
- disable history
- clear local database

## 21. Home Screen

```text
┌───────────────────────────┐
│ Screenshot Assistant      │
│                           │
│ Search screenshots...     │
│                           │
│ [ + Analyze Screenshot ]  │
│                           │
│ Quick Actions             │
│ Translate   Manga         │
│ Extract     Reminder      │
│                           │
│ Recent                    │
│ ┌───────────────────────┐ │
│ │ Manga JP              │ │
│ │ 2 min ago             │ │
│ └───────────────────────┘ │
│                           │
└───────────────────────────┘
```

## 22. Manga Reader Screen

```text
┌───────────────────────────┐
│ < Manga Mode       ⋮      │
├───────────────────────────┤
│                           │
│       manga artwork       │
│                           │
│   ( Kamu siapa? )         │
│                           │
│              ( Aku... )   │
│                           │
├───────────────────────────┤
│ Original | Translated     │
│                           │
│ ◀ Previous      Next ▶    │
└───────────────────────────┘
```

## 23. Empty State

First launch:

```text
Your screenshots can do more.

Translate manga, extract text,
find deadlines, and search
anything you've saved.

[ Choose Screenshot ]

or

Share a screenshot from any app
```

Tidak ada signup.

## 24. Metrics

Monetisasi bukan metric utama awal.

### North Star Candidate
**Successful screenshot actions per active user**

Successful action:
- translate completed
- manga page translated
- reminder created
- text copied
- screenshot found through search

### Activation
User dianggap activated apabila dalam first session berhasil:
```text
Analyze screenshot
+
Complete at least 1 action
```

### Retention
Measure:
- D1
- D7
- D30

### Product Metrics
Track:
- screenshot analyzed
- Manga Mode opened
- translation completed
- reminder created
- search used
- batch manga used
- average processing time
- OCR failure
- bubble detection failure

## 25. MVP Release Criteria

V1 dianggap siap diuji jika:
- [ ] App berjalan standalone di Android.
- [ ] Share screenshot masuk ke app.
- [ ] Import gallery berfungsi.
- [ ] OCR berfungsi.
- [ ] Basic translation berfungsi.
- [ ] Screenshot dapat disimpan.
- [ ] Search OCR berfungsi.
- [ ] Reminder dapat dibuat.
- [ ] Manga Mode dapat menemukan text region.
- [ ] Translation dapat dirender di atas manga.
- [ ] Original / translated toggle bekerja.
- [ ] Batch screenshot dasar bekerja.
- [ ] User tidak diwajibkan login.
- [ ] Processing tidak membuat UI freeze.
- [ ] Failure state memiliki retry.

## 26. Development Phases

### Phase 0 — Technical Proof
```text
Image
↓
OCR
↓
Translate
↓
Overlay
```

### Phase 1 — Utility MVP
- Gallery import
- Share intent
- OCR
- Translate
- SQLite history
- Search
- Copy text
- Reminder

### Phase 2 — Manga MVP
- bubble/text region detection
- reading order
- adaptive text fitting
- replace / glass / floating render
- original-translated toggle
- batch pages

### Phase 3 — Quality
- speed
- OCR accuracy
- translation quality
- bubble accuracy
- UI polish
- error recovery
- low-memory handling

### Phase 4 — Public Beta
- Play Store testing
- crash reporting
- analytics
- feedback
- retention measurement

### Phase 5 — Product Direction

Hanya setelah real usage data tersedia:

```text
A. Manga translator
B. Screenshot utility
C. Screenshot knowledge/search app
D. Combination
```

Jangan menentukan arah berdasarkan asumsi sebelum melihat behaviour user.

## 27. Product Principles

### 1. Value Before Account
User mendapatkan manfaat sebelum diminta membuat account.

### 2. Fast Before Perfect
Hasil cepat yang usable lebih baik daripada hasil sempurna yang membutuhkan waktu terlalu lama.

### 3. Translation Is a Guest in the Artwork
Overlay tidak boleh merusak pengalaman visual manga.

### 4. Local Before Cloud
Jika suatu fitur dapat dilakukan dengan baik di device, prioritaskan local processing.

### 5. Free Must Be Actually Useful
Free version bukan demo yang sengaja dibuat menyebalkan.

### 6. Don't Guess When Confidence Is Low
Jika bubble detection tidak yakin, gunakan Floating Mode daripada menutupi artwork secara agresif.

### 7. User Can Correct the Machine
OCR dan translation dapat diedit.

## 28. One-Sentence Pitch

> **A fast, local-first screenshot assistant that can translate manga cleanly, extract text, find important information, create reminders, and make every screenshot searchable.**

## 29. Indonesian Pitch

> **Screenshot apa pun, langsung jadi berguna — terjemahkan manga dengan rapi, ambil teks, temukan deadline, buat reminder, dan cari kembali screenshot berdasarkan isinya.**

## 30. MVP Product Promise

User install aplikasi dan dalam kurang dari satu menit harus bisa merasakan:

> **“Oh, ini lebih enak daripada screenshot lalu buka translator manual.”**

Jika pengalaman itu belum tercapai, belum waktunya menambah fitur besar lain.
