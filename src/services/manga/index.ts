export {
  mangaDetectionService,
  classifyMangaRegion,
  generateRegionPolygon,
  calculateMangaReadingOrder,
  translateMangaDialogueWithContext,
} from './mangaDetectionService';

export {
  mangaBatchProcessor,
  MangaBatchProcessor,
} from './mangaBatchProcessor';

export type {
  MangaRegionData,
  MangaDetectionInput,
  MangaDetectionResult,
  ContextualDialogueItem,
  ContextualTranslationResult,
} from './mangaDetectionService';

export type {
  MangaBatchItem,
  MangaBatchPageStatus,
  BatchProcessingProgress,
} from './mangaBatchProcessor';
