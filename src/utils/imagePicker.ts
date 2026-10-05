import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { screenshotRepository, settingsRepository } from '../db';
import { ScreenshotCategory, ScreenshotRow } from '../types';

export interface PickedImageResult {
  canceled: boolean;
  screenshot?: ScreenshotRow;
  screenshots?: ScreenshotRow[];
  error?: string;
}

/**
 * Generates a unique, collision-resistant ID for screenshot records.
 */
export function generateScreenshotId(): string {
  return `sc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Requests media library read permissions gracefully.
 */
export async function requestGalleryPermission(): Promise<boolean> {
  try {
    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status === 'granted') {
      return true;
    }

    if (!canAskAgain) {
      Alert.alert(
        'Permission Required',
        'Gallery permission is needed to import screenshots. Please enable it in device settings.'
      );
    }
    return false;
  } catch (error) {
    console.warn('Error requesting gallery permission:', error);
    return false;
  }
}

/**
 * Launches the device gallery for single screenshot selection.
 * Immediately saves metadata (URI, width, height, created_at) into SQLite.
 * Does not crash if user cancels or permission is denied.
 */
export async function pickSingleScreenshot(
  category: ScreenshotCategory = 'Other'
): Promise<PickedImageResult> {
  try {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) {
      return { canceled: true, error: 'Permission not granted' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 1,
      exif: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { canceled: true };
    }

    const asset = result.assets[0];
    if (!asset) {
      return { canceled: true };
    }

    const newId = generateScreenshotId();
    const now = Date.now();
    const isHistoryDisabled = await settingsRepository.getBooleanSetting('disable_history', false);

    let savedScreenshot: ScreenshotRow;
    if (isHistoryDisabled) {
      savedScreenshot = {
        id: newId,
        image_uri: asset.uri,
        width: asset.width ?? 0,
        height: asset.height ?? 0,
        created_at: now,
        category,
        source_app: asset.fileName ?? null,
        notes: null,
      };
    } else {
      savedScreenshot = await screenshotRepository.createScreenshot({
        id: newId,
        image_uri: asset.uri,
        width: asset.width ?? 0,
        height: asset.height ?? 0,
        created_at: now,
        category,
        source_app: asset.fileName ?? null,
        notes: null,
      });
    }

    return {
      canceled: false,
      screenshot: savedScreenshot,
    };
  } catch (error) {
    console.error('Failed to pick single screenshot:', error);
    return {
      canceled: true,
      error: error instanceof Error ? error.message : 'Unknown error during image selection',
    };
  }
}

/**
 * Launches the device gallery for multiple screenshot selection (batch mode).
 * Saves metadata for all selected images into SQLite.
 * Does not crash if user cancels or permission is denied.
 */
export async function pickMultipleScreenshots(
  category: ScreenshotCategory = 'Other'
): Promise<PickedImageResult> {
  try {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) {
      return { canceled: true, error: 'Permission not granted' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
      exif: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { canceled: true };
    }

    const savedScreenshots: ScreenshotRow[] = [];
    const now = Date.now();
    const isHistoryDisabled = await settingsRepository.getBooleanSetting('disable_history', false);

    for (let i = 0; i < result.assets.length; i++) {
      const asset = result.assets[i];
      if (!asset) continue;
      const newId = generateScreenshotId();

      let saved: ScreenshotRow;
      if (isHistoryDisabled) {
        saved = {
          id: newId,
          image_uri: asset.uri,
          width: asset.width ?? 0,
          height: asset.height ?? 0,
          created_at: now + i,
          category,
          source_app: asset.fileName ?? null,
          notes: null,
        };
      } else {
        saved = await screenshotRepository.createScreenshot({
          id: newId,
          image_uri: asset.uri,
          width: asset.width ?? 0,
          height: asset.height ?? 0,
          created_at: now + i, // slight offset to maintain selected order
          category,
          source_app: asset.fileName ?? null,
          notes: null,
        });
      }
      savedScreenshots.push(saved);
    }

    return {
      canceled: false,
      screenshots: savedScreenshots,
      screenshot: savedScreenshots[0],
    };
  } catch (error) {
    console.error('Failed to pick multiple screenshots:', error);
    return {
      canceled: true,
      error: error instanceof Error ? error.message : 'Unknown error during batch selection',
    };
  }
}
