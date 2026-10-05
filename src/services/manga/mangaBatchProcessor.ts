import { mangaRepository, screenshotRepository } from '../../db';
import { ScreenshotRow } from '../../types';
import { mangaDetectionService, MangaRegionData } from './mangaDetectionService';

export type MangaBatchPageStatus = 'ready' | 'processing' | 'done' | 'failed';

export interface MangaBatchItem {
  id: string;
  screenshotId: string;
  imageUri: string;
  pageNumber: number;
  status: MangaBatchPageStatus;
  progress: number; // 0 - 100
  errorMessage?: string;
  bubbleCount: number;
  narrationCount: number;
  isCached: boolean;
  regions: MangaRegionData[];
}

export interface BatchProcessingProgress {
  total: number;
  completed: number;
  failed: number;
  processingIndex: number;
  percentage: number;
}

export class MangaBatchProcessor {
  private queue: MangaBatchItem[] = [];
  private isProcessing = false;
  private isCanceled = false;

  /**
   * Initializes queue from a list of screenshots (2 to 20 pages).
   */
  createQueueFromScreenshots(screenshots: ScreenshotRow[]): MangaBatchItem[] {
    const clamped = screenshots.slice(0, 20); // Clamp to max 20 pages
    this.queue = clamped.map((s, index) => ({
      id: `queue_${s.id}_${index}`,
      screenshotId: s.id,
      imageUri: s.image_uri,
      pageNumber: index + 1,
      status: 'ready',
      progress: 0,
      bubbleCount: 0,
      narrationCount: 0,
      isCached: false,
      regions: [],
    }));
    this.isCanceled = false;
    return [...this.queue];
  }

  getQueue(): MangaBatchItem[] {
    return [...this.queue];
  }

  cancel(): void {
    this.isCanceled = true;
    this.isProcessing = false;
  }

  /**
   * Processes the manga pages in the queue one by one to avoid UI freeze and memory spikes.
   */
  async processQueue(
    onProgress?: (progress: BatchProcessingProgress) => void,
    onItemUpdate?: (item: MangaBatchItem) => void
  ): Promise<MangaBatchItem[]> {
    if (this.isProcessing) return this.queue;
    this.isProcessing = true;
    this.isCanceled = false;

    const total = this.queue.length;

    for (let i = 0; i < total; i++) {
      if (this.isCanceled) break;

      const item = this.queue[i]!;

      // Skip already completed pages (cache hit / idempotency)
      if (item.status === 'done') {
        const completed = this.queue.filter((q) => q.status === 'done').length;
        const failed = this.queue.filter((q) => q.status === 'failed').length;
        onProgress?.({
          total,
          completed,
          failed,
          processingIndex: i,
          percentage: Math.round(((completed + failed) / total) * 100),
        });
        continue;
      }

      item.status = 'processing';
      item.progress = 20;
      onItemUpdate?.({ ...item });

      // Yield control briefly to ensure UI remains smooth and non-blocking
      await new Promise((resolve) => setTimeout(resolve, 30));

      try {
        // 1. Check SQLite for existing cached manga regions
        const existing = await mangaRepository.getMangaRegionsByScreenshotId(item.screenshotId);
        if (existing.length > 0) {
          item.status = 'done';
          item.progress = 100;
          item.isCached = true;
          item.bubbleCount = existing.filter((r) => r.region_type === 'bubble').length;
          item.narrationCount = existing.filter((r) => r.region_type === 'narration').length;

          onItemUpdate?.({ ...item });
        } else {
          // 2. Fresh detection & contextual translation
          item.progress = 50;
          onItemUpdate?.({ ...item });

          const detectionRes = await mangaDetectionService.detectMangaLayout({
            screenshotId: item.screenshotId,
            imageWidth: 1080,
            imageHeight: 1920,
            readingDirection: 'rtl',
          });

          item.status = 'done';
          item.progress = 100;
          item.isCached = false;
          item.bubbleCount = detectionRes.bubbleCount;
          item.narrationCount = detectionRes.narrationCount;
          item.regions = detectionRes.regions;

          onItemUpdate?.({ ...item });
        }
      } catch (err) {
        item.status = 'failed';
        item.progress = 0;
        item.errorMessage = err instanceof Error ? err.message : 'Processing failed';
        onItemUpdate?.({ ...item });
      }

      const completed = this.queue.filter((q) => q.status === 'done').length;
      const failed = this.queue.filter((q) => q.status === 'failed').length;
      onProgress?.({
        total,
        completed,
        failed,
        processingIndex: i,
        percentage: Math.round(((completed + failed) / total) * 100),
      });

      // Brief breather between pages
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    this.isProcessing = false;
    return [...this.queue];
  }

  /**
   * Retries an individual failed item.
   */
  async retryItem(
    itemId: string,
    onProgress?: (progress: BatchProcessingProgress) => void,
    onItemUpdate?: (item: MangaBatchItem) => void
  ): Promise<MangaBatchItem | null> {
    const item = this.queue.find((q) => q.id === itemId);
    if (!item) return null;

    item.status = 'processing';
    item.progress = 30;
    item.errorMessage = undefined;
    onItemUpdate?.({ ...item });

    try {
      const detectionRes = await mangaDetectionService.detectMangaLayout({
        screenshotId: item.screenshotId,
        imageWidth: 1080,
        imageHeight: 1920,
        readingDirection: 'rtl',
      });

      item.status = 'done';
      item.progress = 100;
      item.bubbleCount = detectionRes.bubbleCount;
      item.narrationCount = detectionRes.narrationCount;
      item.regions = detectionRes.regions;
    } catch (err) {
      item.status = 'failed';
      item.errorMessage = err instanceof Error ? err.message : 'Retry failed';
    }

    onItemUpdate?.({ ...item });

    const total = this.queue.length;
    const completed = this.queue.filter((q) => q.status === 'done').length;
    const failed = this.queue.filter((q) => q.status === 'failed').length;
    onProgress?.({
      total,
      completed,
      failed,
      processingIndex: this.queue.indexOf(item),
      percentage: Math.round(((completed + failed) / total) * 100),
    });

    return { ...item };
  }
}

export const mangaBatchProcessor = new MangaBatchProcessor();
