# Snaply — Screenshot Assistant

> **Your screenshots, made useful.**  
> Asisten screenshot berbasis AI & OCR lokal untuk Android dengan Expo + React Native.

---

## 🎯 Value Proposition

Snaply mengubah tumpukan screenshot pasif di gallery menjadi informasi yang actionable dan searchable:
- **Scan & OCR Instan:** Deteksi dan salin teks lokal tanpa kirim ke cloud.
- **Manga Mode:** Deteksi speech bubble manga/komik, inpainting bersih, dan typesetting terjemahan adaptif.
- **Quick Translation:** Terjemahkan teks screenshot ke Bahasa Indonesia & Inggris.
- **Action Extraction:** Deteksi tanggal/deadline, reminder, nomor resi, dan URL otomatis.
- **Local-First Library:** Riwayat screenshot dan pencarian full-text berbasis SQLite di perangkat pengguna.

---

## 🛠️ Tech Stack

- **Framework:** Expo SDK 57 + React Native 0.86
- **Language:** TypeScript
- **Design System:** Warm Minimalist tokens (`src/theme/tokens.ts`)
- **Canvas / Graphic:** `@shopify/react-native-skia`
- **Database:** `expo-sqlite` (Local-first)
- **Haptics:** `expo-haptics`
- **Icons:** `@expo/vector-icons` (`Ionicons`) & `lucide-react-native`

---

## 📁 Struktur Direktori

```text
src/
├── components/     # Reusable design system primitives (Card, Buttons, Chips, etc.)
├── features/       # Feature modules (home, analyze, manga, library, search, settings)
├── theme/          # Design tokens (Colors, Spacing, Radius, Typography)
├── db/             # SQLite migrations, schema, dan repositories (Task 04+)
├── hooks/          # Custom reusable React hooks
├── types/          # Domain types & interfaces
└── utils/          # Helper & utility functions
```

---

## 🚀 Menjalankan Project

```bash
# 1. Install dependencies
npm install

# 2. Typecheck
npm run typecheck

# 3. Jalankan development server
npx expo start
```
