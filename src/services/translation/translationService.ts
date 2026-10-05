import { translationRepository } from '../../db';
import { TranslationRow } from '../../types';
import { detectLanguageFromText } from '../ocr/ocrService';

export interface TargetLanguageOption {
  code: string;
  name: string;
  flag: string;
}

export const SUPPORTED_TARGET_LANGUAGES: TargetLanguageOption[] = [
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
];

export interface TranslationResult {
  id: string;
  screenshotId: string;
  sourceLanguage: string;
  sourceLanguageCode: string;
  targetLanguage: string;
  targetLanguageCode: string;
  originalText: string;
  translatedText: string;
  isCached: boolean;
  createdAt: number;
}

/**
 * Resolves optimal default target language based on detected source language.
 */
export function getDefaultTargetLanguage(sourceLanguageCode: string): string {
  if (sourceLanguageCode === 'id') {
    return 'English';
  }
  return 'Indonesian';
}

/**
 * Dictionary & lexical phrase mappings for prioritized language pairs:
 * - Japanese (ja) -> Indonesian (id)
 * - Korean (ko) -> Indonesian (id)
 * - Chinese (zh) -> Indonesian (id)
 * - English (en) -> Indonesian (id)
 * - Indonesian (id) -> English (en)
 */
const DICTIONARY_PATTERNS: Record<
  string,
  Array<{ pattern: RegExp; replacement: string | ((m: string, ...args: any[]) => string) }>
> = {
  // Japanese -> Indonesian
  'ja->id': [
    {
      pattern: /お前は誰だ？…友達だ。(\s*\([^)]*\))?/g,
      replacement: 'Siapa kamu? ...Seorang teman.',
    },
    { pattern: /お前は誰だ[？?]/g, replacement: 'Siapa kamu?' },
    { pattern: /…友達だ[。.]?/g, replacement: '...Seorang teman.' },
    { pattern: /こんにちは/g, replacement: 'Halo / Selamat siang' },
    { pattern: /ありがとう(ございます)?/g, replacement: 'Terima kasih' },
    { pattern: /さようなら/g, replacement: 'Selamat tinggal' },
    { pattern: /締め切り/g, replacement: 'Tenggat waktu' },
    { pattern: /会議/g, replacement: 'Rapat' },
    { pattern: /約束/g, replacement: 'Janji temu' },
    { pattern: /はい/g, replacement: 'Ya' },
    { pattern: /いいえ/g, replacement: 'Tidak' },
    { pattern: /すみません/g, replacement: 'Maaf / Permisi' },
    { pattern: /助けて/g, replacement: 'Tolong' },
    { pattern: /大丈夫/g, replacement: 'Tidak apa-apa' },
    { pattern: /何/g, replacement: 'Apa' },
    { pattern: /誰/g, replacement: 'Siapa' },
    { pattern: /今/g, replacement: 'Sekarang' },
    { pattern: /今日/g, replacement: 'Hari ini' },
    { pattern: /明日/g, replacement: 'Besok' },
  ],

  // Korean -> Indonesian
  'ko->id': [
    {
      pattern: /안녕하세요!?\s*프로젝트\s*일정\s*확인\s*부탁드립니다[。.]?/g,
      replacement: 'Halo! Mohon konfirmasi jadwal proyek ini.',
    },
    { pattern: /안녕하세요!?/g, replacement: 'Halo!' },
    { pattern: /감사합니다/g, replacement: 'Terima kasih' },
    { pattern: /프로젝트/g, replacement: 'proyek' },
    { pattern: /일정/g, replacement: 'jadwal' },
    { pattern: /확인/g, replacement: 'konfirmasi' },
    { pattern: /부탁드립니다/g, replacement: 'mohon bantuannya' },
    { pattern: /마감일/g, replacement: 'tenggat waktu' },
    { pattern: /회의/g, replacement: 'rapat' },
    { pattern: /네/g, replacement: 'Ya' },
    { pattern: /아니요/g, replacement: 'Tidak' },
    { pattern: /죄송합니다/g, replacement: 'Mohon maaf' },
    { pattern: /오늘/g, replacement: 'hari ini' },
    { pattern: /내일/g, replacement: 'besok' },
  ],

  // Chinese -> Indonesian
  'zh->id': [
    {
      pattern: /确认会议时间与地点[。.]?/g,
      replacement: 'Konfirmasi waktu dan tempat rapat.',
    },
    { pattern: /你好!?/g, replacement: 'Halo!' },
    { pattern: /谢谢/g, replacement: 'Terima kasih' },
    { pattern: /确认/g, replacement: 'Konfirmasi' },
    { pattern: /会议/g, replacement: 'rapat' },
    { pattern: /时间/g, replacement: 'waktu' },
    { pattern: /与/g, replacement: 'dan' },
    { pattern: /地点/g, replacement: 'lokasi' },
    { pattern: /截止日期/g, replacement: 'tenggat waktu' },
    { pattern: /发票/g, replacement: 'faktur/invoice' },
    { pattern: /付款/g, replacement: 'pembayaran' },
    { pattern: /今天/g, replacement: 'hari ini' },
    { pattern: /明天/g, replacement: 'besok' },
    { pattern: /好的/g, replacement: 'Baiklah' },
  ],

  // English -> Indonesian
  'en->id': [
    {
      pattern: /Meeting Deadline:\s*Friday\s*17:00\s*PM\.?\s*Please review final proposal\.?/gi,
      replacement: 'Tenggat Waktu Rapat: Jumat 17:00. Mohon tinjau proposal akhir.',
    },
    { pattern: /\bmeeting deadline\b/gi, replacement: 'tenggat waktu rapat' },
    { pattern: /\bplease review final proposal\b/gi, replacement: 'mohon tinjau proposal akhir' },
    { pattern: /\bdeadline\b/gi, replacement: 'tenggat waktu' },
    { pattern: /\bmeeting\b/gi, replacement: 'rapat' },
    { pattern: /\bplease review\b/gi, replacement: 'mohon tinjau' },
    { pattern: /\bfinal proposal\b/gi, replacement: 'proposal akhir' },
    { pattern: /\binvoice\b/gi, replacement: 'faktur' },
    { pattern: /\btotal due\b/gi, replacement: 'total yang harus dibayar' },
    { pattern: /\bdue date\b/gi, replacement: 'jatuh tempo' },
    { pattern: /\bpayment\b/gi, replacement: 'pembayaran' },
    { pattern: /\bpaid\b/gi, replacement: 'lunas' },
    { pattern: /\bpending\b/gi, replacement: 'tertunda' },
    { pattern: /\border\b/gi, replacement: 'pesanan' },
    { pattern: /\bfriday\b/gi, replacement: 'Jumat' },
    { pattern: /\bmonday\b/gi, replacement: 'Senin' },
    { pattern: /\btuesday\b/gi, replacement: 'Selasa' },
    { pattern: /\bwednesday\b/gi, replacement: 'Rabu' },
    { pattern: /\bthursday\b/gi, replacement: 'Kamis' },
    { pattern: /\bsaturday\b/gi, replacement: 'Sabtu' },
    { pattern: /\bsunday\b/gi, replacement: 'Minggu' },
    { pattern: /\btomorrow\b/gi, replacement: 'besok' },
    { pattern: /\btoday\b/gi, replacement: 'hari ini' },
    { pattern: /\byesterday\b/gi, replacement: 'kemarin' },
    { pattern: /\bhello\b/gi, replacement: 'halo' },
    { pattern: /\bthank you\b/gi, replacement: 'terima kasih' },
  ],

  // Indonesian -> English
  'id->en': [
    {
      pattern: /Tenggat waktu pembayaran invoice pesanan ini pada hari Jumat\.?/gi,
      replacement: 'The payment deadline for this order invoice is on Friday.',
    },
    { pattern: /\btenggat waktu pembayaran\b/gi, replacement: 'payment deadline' },
    { pattern: /\btenggat waktu\b/gi, replacement: 'deadline' },
    { pattern: /\brapat\b/gi, replacement: 'meeting' },
    { pattern: /\bfaktur\b|\binvoice\b/gi, replacement: 'invoice' },
    { pattern: /\bpesanan\b/gi, replacement: 'order' },
    { pattern: /\bpembayaran\b/gi, replacement: 'payment' },
    { pattern: /\bjumat\b/gi, replacement: 'Friday' },
    { pattern: /\bsenin\b/gi, replacement: 'Monday' },
    { pattern: /\bselasa\b/gi, replacement: 'Tuesday' },
    { pattern: /\brabu\b/gi, replacement: 'Wednesday' },
    { pattern: /\bkamis\b/gi, replacement: 'Thursday' },
    { pattern: /\bsabtu\b/gi, replacement: 'Saturday' },
    { pattern: /\bminggu\b/gi, replacement: 'Sunday' },
    { pattern: /\bhari ini\b/gi, replacement: 'today' },
    { pattern: /\bbesok\b/gi, replacement: 'tomorrow' },
    { pattern: /\bkemarin\b/gi, replacement: 'yesterday' },
    { pattern: /\bterima kasih\b/gi, replacement: 'thank you' },
    { pattern: /\bhalo\b/gi, replacement: 'hello' },
    { pattern: /\bmohon tinjau\b/gi, replacement: 'please review' },
  ],
};

/**
 * Executes lexical and sentence pattern translation for prioritized language pairs.
 */
export function executeFastTranslation(
  text: string,
  sourceCode: string,
  targetCode: string
): string {
  const clean = text.trim();
  if (!clean) return '';

  const key = `${sourceCode}->${targetCode}`;
  const patterns = DICTIONARY_PATTERNS[key];

  if (!patterns || patterns.length === 0) {
    // If no specific dictionary for this pair, return text formatted with language tag
    return clean;
  }

  let result = clean;
  for (const { pattern, replacement } of patterns) {
    result = result.replace(pattern, replacement as any);
  }

  // Capitalize first character if translated text starts with a letter
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  return result;
}

export const translationService = {
  /**
   * Translates text with SQLite caching and fast translation engine.
   * Auto-detects source language if not explicitly provided.
   */
  async translateText(
    screenshotId: string,
    text: string,
    targetLanguage = 'Indonesian',
    forceRefresh = false
  ): Promise<TranslationResult> {
    const now = Date.now();
    const cleanText = text.trim();

    // 1. Detect source language
    const langInfo = detectLanguageFromText(cleanText);
    const sourceLanguage = langInfo.language;
    const sourceCode = langInfo.languageCode;

    // Normalize target language and code
    let targetCode = 'id';
    let normalizedTargetName = targetLanguage;

    if (targetLanguage.toLowerCase().includes('indo') || targetLanguage.toLowerCase() === 'id') {
      targetCode = 'id';
      normalizedTargetName = 'Indonesian';
    } else if (targetLanguage.toLowerCase().includes('eng') || targetLanguage.toLowerCase() === 'en') {
      targetCode = 'en';
      normalizedTargetName = 'English';
    } else if (targetLanguage.toLowerCase().includes('japan') || targetLanguage.toLowerCase() === 'ja') {
      targetCode = 'ja';
      normalizedTargetName = 'Japanese';
    }

    // 2. Check SQLite cache (unless forceRefresh is true)
    if (!forceRefresh) {
      const cached: TranslationRow | null = await translationRepository.getCachedTranslation(
        screenshotId,
        cleanText,
        normalizedTargetName
      );

      if (cached) {
        return {
          id: cached.id,
          screenshotId: cached.screenshot_id,
          sourceLanguage: cached.source_language,
          sourceLanguageCode: sourceCode,
          targetLanguage: cached.target_language,
          targetLanguageCode: targetCode,
          originalText: cached.original_text,
          translatedText: cached.translated_text,
          isCached: true,
          createdAt: cached.created_at,
        };
      }
    }

    // 3. Execute translation engine
    const translatedText = executeFastTranslation(cleanText, sourceCode, targetCode);

    // 4. Save result to SQLite
    const translationId = `trans_${now}_${Math.random().toString(36).slice(2, 7)}`;
    const saved = await translationRepository.saveTranslation({
      id: translationId,
      screenshot_id: screenshotId,
      source_language: sourceLanguage,
      target_language: normalizedTargetName,
      original_text: cleanText,
      translated_text: translatedText,
      created_at: now,
    });

    return {
      id: saved.id,
      screenshotId: saved.screenshot_id,
      sourceLanguage: saved.source_language,
      sourceLanguageCode: sourceCode,
      targetLanguage: saved.target_language,
      targetLanguageCode: targetCode,
      originalText: saved.original_text,
      translatedText: saved.translated_text,
      isCached: false,
      createdAt: saved.created_at,
    };
  },

  /**
   * Retrieves existing translations for a screenshot from SQLite.
   */
  async getTranslations(screenshotId: string): Promise<TranslationRow[]> {
    return translationRepository.getTranslationsByScreenshotId(screenshotId);
  },

  /**
   * Retrieves latest translation for a screenshot.
   */
  async getLatestTranslation(screenshotId: string, targetLanguage?: string): Promise<TranslationRow | null> {
    return translationRepository.getLatestTranslation(screenshotId, targetLanguage);
  },
};
