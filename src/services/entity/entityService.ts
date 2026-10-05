import * as Linking from 'expo-linking';
import { entityRepository } from '../../db';
import { BoundingBox, EntityRow, EntityType, ScreenshotCategory } from '../../types';

export interface DetectedEntity {
  id: string;
  screenshotId: string;
  entityType: EntityType;
  value: string;
  confidence: number;
  suggestedAction: string;
  actionData: Record<string, any>;
  icon: string;
  label: string;
}

/**
 * Extracts and classifies structured entities from OCR text and screenshot metadata.
 */
export function extractEntitiesFromText(
  screenshotId: string,
  text: string,
  category: ScreenshotCategory = 'Other',
  boundingBoxes: BoundingBox[] = []
): DetectedEntity[] {
  const entities: DetectedEntity[] = [];
  const clean = text.trim();
  if (!clean) return entities;

  const now = Date.now();
  let entityCounter = 0;

  const makeId = () => `ent_${now}_${++entityCounter}_${Math.random().toString(36).slice(2, 6)}`;

  // 1. URL / Link Detection
  const urlRegex = /(https?:\/\/[^\s/$.?#].[^\s]*|\b(?:www\.)[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+(?:\/[^\s]*)?|\b[a-zA-Z0-9-]+\.(?:com|org|net|id|co\.id|io|app|dev|edu|gov)(?:\/[^\s]*)?)/gi;
  const urlMatches = clean.match(urlRegex);
  if (urlMatches) {
    const uniqueUrls = Array.from(new Set(urlMatches));
    for (const url of uniqueUrls) {
      const normalizedUrl = url.startsWith('http://') || url.startsWith('https://')
        ? url
        : `https://${url}`;

      entities.push({
        id: makeId(),
        screenshotId,
        entityType: 'url',
        value: url,
        confidence: 0.98,
        suggestedAction: 'open_url',
        actionData: { url: normalizedUrl },
        icon: 'globe-outline',
        label: 'Website URL',
      });
    }
  }

  // 2. Tracking Number / Resi Detection
  const trackingRegex = /\b(?:No\.?\s*Resi|AWB|Tracking|Resi)[:\s#]*([A-Z0-9]{8,24})\b|\b(SPXID[A-Z0-9]{8,16}|JP[0-9]{10,14}|TKP[0-9]{10,14}|SOC[A-Z0-9]{8,14}|JX[0-9]{10,14})\b/gi;
  let trackMatch: RegExpExecArray | null;
  while ((trackMatch = trackingRegex.exec(clean)) !== null) {
    const trackingCode = (trackMatch[1] || trackMatch[2] || trackMatch[0]).trim();
    if (trackingCode.length >= 8 && !entities.some((e) => e.value === trackingCode)) {
      entities.push({
        id: makeId(),
        screenshotId,
        entityType: 'tracking_number',
        value: trackingCode,
        confidence: 0.96,
        suggestedAction: 'copy_tracking',
        actionData: { trackingNumber: trackingCode },
        icon: 'cube-outline',
        label: 'Tracking / Resi',
      });
    }
  }

  // 3. Price / Nominal Uang Detection
  const priceRegex = /(?:Rp\.?|IDR|\$|USD|€|EUR|¥|JPY|£|GBP)\s*[\d.,]+(?:\s*(?:k|ribu|million|juta))?|\bTotal\s*(?:Due|Bayar)?[:\s]*(?:Rp\.?|IDR|\$)?\s*[\d.,]+/gi;
  const priceMatches = clean.match(priceRegex);
  if (priceMatches) {
    const uniquePrices = Array.from(new Set(priceMatches));
    for (const price of uniquePrices) {
      entities.push({
        id: makeId(),
        screenshotId,
        entityType: 'price',
        value: price.trim(),
        confidence: 0.95,
        suggestedAction: 'copy_price',
        actionData: { price: price.trim() },
        icon: 'cash-outline',
        label: 'Amount / Price',
      });
    }
  }

  // 4. Phone Number / Contact Detection
  const phoneRegex = /\b(?:\+?62|08)[1-9][0-9]{7,11}\b|\b\+?[1-9]\d{1,2}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g;
  const phoneMatches = clean.match(phoneRegex);
  if (phoneMatches) {
    const uniquePhones = Array.from(new Set(phoneMatches));
    for (const phone of uniquePhones) {
      entities.push({
        id: makeId(),
        screenshotId,
        entityType: 'phone',
        value: phone.trim(),
        confidence: 0.94,
        suggestedAction: 'copy_phone',
        actionData: { phoneNumber: phone.trim() },
        icon: 'call-outline',
        label: 'Phone Number',
      });
    }
  }

  // 5. Date / Time / Deadline Detection
  const dateRegex = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember))\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}?\b|\b\d{1,2}\s+(?:Jan(?:uari)?|Feb(?:ruari)?|Mar(?:et)?|Apr(?:il)?|Mei|Jun(?:i)?|Jul(?:i)?|Agu(?:stus)?|Sep(?:tember)?|Okt(?:ober)?|Nov(?:ember)?|Des(?:ember))\s*\d{4}?\b|\b(?:Deadline|Meeting|Jadwal|Tenggat)[:\s]*[A-Za-z0-9\s:.,-]+\b|\b(?:Friday|Monday|Tuesday|Wednesday|Thursday|Saturday|Sunday|Jumat|Senin|Selasa|Rabu|Kamis|Sabtu|Minggu|Tomorrow|Besok)\b/gi;
  const dateMatches = clean.match(dateRegex);
  if (dateMatches) {
    const uniqueDates = Array.from(new Set(dateMatches.slice(0, 2)));
    for (const d of uniqueDates) {
      entities.push({
        id: makeId(),
        screenshotId,
        entityType: 'date',
        value: d.trim(),
        confidence: 0.95,
        suggestedAction: 'create_reminder',
        actionData: { title: `Reminder: ${d.trim()}`, textSnippet: clean.slice(0, 100) },
        icon: 'alarm-outline',
        label: 'Event / Deadline',
      });
    }
  }

  // 6. Manga Pattern Detection
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(clean);
  if (hasJapanese || category === 'Manga') {
    entities.push({
      id: makeId(),
      screenshotId,
      entityType: 'manga_pattern',
      value: hasJapanese ? 'Japanese Speech Bubble Content' : 'Manga Panel Layout',
      confidence: 0.97,
      suggestedAction: 'open_manga',
      actionData: { bubbleCount: boundingBoxes.length },
      icon: 'book-outline',
      label: 'Manga Detected',
    });
  }

  return entities;
}

export const entityService = {
  /**
   * Detects, parses, and persists all entities for a given screenshot into SQLite.
   */
  async detectAndSaveEntities(
    screenshotId: string,
    text: string,
    category: ScreenshotCategory = 'Other',
    boundingBoxes: BoundingBox[] = []
  ): Promise<DetectedEntity[]> {
    const entities = extractEntitiesFromText(screenshotId, text, category, boundingBoxes);

    // Clean previous entities for this screenshot before saving updated list
    await entityRepository.deleteEntitiesByScreenshotId(screenshotId);

    if (entities.length > 0) {
      await entityRepository.saveEntities(
        entities.map((e) => ({
          id: e.id,
          screenshot_id: e.screenshotId,
          entity_type: e.entityType,
          value: e.value,
          confidence: e.confidence,
          suggested_action: e.suggestedAction,
          action_data_json: JSON.stringify(e.actionData),
        }))
      );
    }

    return entities;
  },

  /**
   * Loads existing saved entities for a screenshot from SQLite.
   */
  async getSavedEntities(screenshotId: string): Promise<EntityRow[]> {
    return entityRepository.getEntitiesByScreenshotId(screenshotId);
  },

  /**
   * Executes appropriate system action for a detected entity (e.g. open URL).
   */
  async executeEntityAction(entity: DetectedEntity): Promise<{ success: boolean; message?: string }> {
    switch (entity.suggestedAction) {
      case 'open_url': {
        const url = entity.actionData.url;
        if (url) {
          const supported = await Linking.canOpenURL(url);
          if (supported) {
            await Linking.openURL(url);
            return { success: true, message: 'Opening website...' };
          }
        }
        return { success: false, message: 'Unable to open URL' };
      }
      default:
        return { success: true };
    }
  },
};
