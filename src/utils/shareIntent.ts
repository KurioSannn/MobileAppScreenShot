import * as Linking from 'expo-linking';
import { screenshotRepository } from '../db';
import { ScreenshotRow } from '../types';
import { generateScreenshotId } from './imagePicker';

export interface ProcessedShareIntent {
  success: boolean;
  screenshot?: ScreenshotRow;
  batch?: ScreenshotRow[];
  error?: string;
  rawUri?: string;
}

const SUPPORTED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.heic'];

/**
 * Validates whether a given URI or file path represents a valid image.
 */
export function isValidImageUri(uri: string): boolean {
  if (!uri || typeof uri !== 'string') return false;
  const cleanUri = uri.trim().toLowerCase();

  // Android content provider URI for images
  if (cleanUri.startsWith('content://')) {
    // If it contains non-image indicators like text or pdf, reject
    if (cleanUri.includes('/text/') || cleanUri.includes('/pdf/') || cleanUri.includes('/video/')) {
      return false;
    }
    return true;
  }

  // File or HTTP URI - check extension
  const pathPart = cleanUri.split('?')[0] ?? '';
  const cleanPath = pathPart.split('#')[0] ?? '';
  return SUPPORTED_IMAGE_EXTENSIONS.some((ext) => cleanPath.endsWith(ext));
}

/**
 * Extracts candidate image URIs from an incoming Linking URL or intent string.
 */
export function extractUrisFromIntentUrl(url: string): string[] {
  if (!url) return [];

  // Check if it's a deep link with parameters (e.g. snaply://share?uri=... or ?uris=...)
  try {
    const parsed = Linking.parse(url);
    if (parsed.queryParams) {
      if (typeof parsed.queryParams.uri === 'string') {
        return [parsed.queryParams.uri];
      }
      if (typeof parsed.queryParams.url === 'string') {
        return [parsed.queryParams.url];
      }
      if (Array.isArray(parsed.queryParams.uris)) {
        return parsed.queryParams.uris.filter((u): u is string => typeof u === 'string');
      }
      if (typeof parsed.queryParams.uris === 'string') {
        return parsed.queryParams.uris.split(',');
      }
    }
  } catch (_) {}

  // Direct content:// or file:// URI passed as URL
  if (url.startsWith('content://') || url.startsWith('file://')) {
    return [url];
  }

  return [];
}

/**
 * Processes an incoming share intent URL, validates image MIME,
 * saves screenshot metadata to SQLite, and returns the result.
 */
export async function processIncomingShareIntent(
  incomingUrl: string | null
): Promise<ProcessedShareIntent> {
  if (!incomingUrl) {
    return {
      success: false,
      error: 'No share intent URL received',
    };
  }

  const candidateUris = extractUrisFromIntentUrl(incomingUrl);

  if (candidateUris.length === 0) {
    return {
      success: false,
      rawUri: incomingUrl,
      error: 'Invalid share intent: No image URI could be extracted.',
    };
  }

  // Validate each URI
  const validUris: string[] = [];
  for (const uri of candidateUris) {
    if (isValidImageUri(uri)) {
      validUris.push(uri);
    }
  }

  if (validUris.length === 0) {
    return {
      success: false,
      rawUri: candidateUris[0] ?? '',
      error: 'Invalid file type: The shared file is not a supported image format. Snaply only processes screenshots and images (PNG, JPG, WEBP).',
    };
  }

  try {
    const now = Date.now();
    const savedScreenshots: ScreenshotRow[] = [];

    for (let i = 0; i < validUris.length; i++) {
      const uri = validUris[i];
      if (!uri) continue;
      const newId = generateScreenshotId();

      const saved = await screenshotRepository.createScreenshot({
        id: newId,
        image_uri: uri,
        width: 0, // resolution can be enriched later during analysis
        height: 0,
        created_at: now + i,
        category: 'Other',
        source_app: 'Android Share',
        notes: null,
      });

      savedScreenshots.push(saved);
    }

    return {
      success: true,
      screenshot: savedScreenshots[0],
      batch: savedScreenshots,
      rawUri: validUris[0] ?? '',
    };
  } catch (error) {
    console.error('Failed to save shared screenshot into database:', error);
    return {
      success: false,
      rawUri: validUris[0] ?? '',
      error: error instanceof Error ? error.message : 'Database error while saving shared screenshot',
    };
  }
}
