export {
  mangaDetectionService,
  classifyMangaRegion,
  generateRegionPolygon,
  calculateMangaReadingOrder,
  translateMangaDialogueWithContext,
} from './mangaDetectionService';

export type {
  MangaRegionData,
  MangaDetectionInput,
  MangaDetectionResult,
  ContextualDialogueItem,
  ContextualTranslationResult,
} from './mangaDetectionService';
