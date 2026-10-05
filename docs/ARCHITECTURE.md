# Snaply Architecture Documentation

## 1. High-Level Flow

```text
Screenshot Input (Gallery / Android Share Intent)
      ↓
Metadata & Preview (instant display)
      ↓
Progressive Processing Pipeline
  ├─ On-Device OCR (Raw text + Bounding boxes)
  ├─ Language Auto-Detection
  └─ Entity Detection (Dates, URLs, Prices, etc.)
      ↓
User Actions (Translate / Copy / Reminder / Manga Mode)
      ↓
Local-First Storage (expo-sqlite)
      ↓
Library & Full-Text Search
```

---

## 2. Manga Pipeline Flow

```text
Manga Screenshot
      ↓
Speech Bubble / Region Detection
      ↓
Reading Order Sorting (RTL for Manga, TTB for Webtoons)
      ↓
Text Extraction & Contextual Translation
      ↓
Adaptive Typesetting & Canvas Inpainting (React Native Skia)
      ↓
Interactive Manga Reader & Bubble Editor
```

---

## 3. Directory Responsibilities

* `src/components/`: Reusable Warm Minimalist UI primitives (Card, Buttons, ActionChips, StatusBadges, SegmentedControl, BottomTabBar).
* `src/features/`: Feature modules:
  * `home/`: Main hub, Hero card, Quick actions, Recent previews.
  * `analyze/`: Progressive analysis pipeline & suggested actions.
  * `manga/`: Fullscreen reader, bubble overlay & typesetting.
  * `library/`: Category filter & screenshot collection.
  * `search/`: Instant full-text search across OCR texts and translations.
  * `settings/`: Local-only toggles, database cache controls.
* `src/theme/`: Design tokens (`tokens.ts`) defining color palette, spacing scale, radius, and typography.
* `src/db/`: SQLite connection, migrations, and typed repository methods.
* `src/types/`: Domain types and interfaces.
* `src/hooks/`: Custom hooks for database queries, haptics, and image processing.
* `src/utils/`: Pure utilities (text parsing, date formatting, regex).
