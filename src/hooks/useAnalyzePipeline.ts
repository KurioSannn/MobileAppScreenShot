import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { BoundingBox, ScreenshotRow } from '../types';
import { ocrService, RecognizedOcrData } from '../services';

export type PipelineStep =
  | 'idle'
  | 'reading_image'
  | 'detecting_text'
  | 'detecting_language'
  | 'finding_actions'
  | 'completed'
  | 'cancelled'
  | 'error';

export interface StepDefinition {
  key: 'reading_image' | 'detecting_text' | 'detecting_language' | 'finding_actions';
  label: string;
  description: string;
}

export const PIPELINE_STEPS: StepDefinition[] = [
  {
    key: 'reading_image',
    label: '1. Reading image metadata',
    description: 'Inspecting resolution & image layout',
  },
  {
    key: 'detecting_text',
    label: '2. Detecting text regions & layout',
    description: 'Scanning lines, bounding boxes, and bubble shapes with local OCR',
  },
  {
    key: 'detecting_language',
    label: '3. Identifying language & entities',
    description: 'Classifying Japanese, Korean, Chinese, English, Indonesian, and dates',
  },
  {
    key: 'finding_actions',
    label: '4. Finding relevant actions',
    description: 'Matching translations, copy options, and reminders',
  },
];

export interface DetectedEntityPreview {
  type: 'date' | 'url' | 'price' | 'manga_pattern' | 'other';
  value: string;
  action: string;
}

export interface SuggestedActionItem {
  id: string;
  label: string;
  iconName: string;
  badge?: string;
  type: 'translate' | 'manga' | 'copy' | 'reminder';
}

export interface UseAnalyzePipelineReturn {
  currentStep: PipelineStep;
  progress: number;
  isProcessing: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
  error: string | null;
  extractedTextPreview: string | null;
  rawText: string | null;
  correctedText: string | null;
  isCorrected: boolean;
  detectedLanguage: string | null;
  detectedEntities: DetectedEntityPreview[];
  suggestedActions: SuggestedActionItem[];
  boundingBoxes: BoundingBox[];
  blocks: Array<{ id: string; text: string; box: BoundingBox }>;
  selectedBlockId: string | null;
  ocrConfidence: number;
  startPipeline: () => void;
  cancelPipeline: () => void;
  retryPipeline: () => void;
  selectBlock: (id: string | null) => void;
  saveEditedText: (newText: string) => Promise<void>;
  revertToOriginal: () => Promise<void>;
}

/**
 * Custom hook to drive the progressive screenshot analysis pipeline
 * using native on-device OCR without blocking the UI or displaying fullscreen blank spinners.
 */
export function useAnalyzePipeline(
  screenshot: ScreenshotRow | null
): UseAnalyzePipelineReturn {
  const [currentStep, setCurrentStep] = useState<PipelineStep>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Progressive results revealed as pipeline moves forward
  const [extractedTextPreview, setExtractedTextPreview] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [correctedText, setCorrectedText] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [detectedEntities, setDetectedEntities] = useState<DetectedEntityPreview[]>([]);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedActionItem[]>([]);
  const [boundingBoxes, setBoundingBoxes] = useState<BoundingBox[]>([]);
  const [blocks, setBlocks] = useState<Array<{ id: string; text: string; box: BoundingBox }>>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState(1.0);

  const cancelFlagRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const cancelPipeline = useCallback(() => {
    clearTimer();
    cancelFlagRef.current = true;
    setCurrentStep('cancelled');
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (_) {}
  }, []);

  const startPipeline = useCallback(() => {
    if (!screenshot) {
      setCurrentStep('idle');
      setProgress(0);
      return;
    }

    clearTimer();
    cancelFlagRef.current = false;
    setError(null);
    setCurrentStep('reading_image');
    setProgress(15);
    setExtractedTextPreview(null);
    setRawText(null);
    setCorrectedText(null);
    setDetectedLanguage(null);
    setDetectedEntities([]);
    setSuggestedActions([]);
    setBoundingBoxes([]);
    setBlocks([]);
    setSelectedBlockId(null);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    // Stage 1 -> Stage 2: Reading image metadata completes quickly
    timeoutRef.current = setTimeout(async () => {
      if (cancelFlagRef.current) return;
      setCurrentStep('detecting_text');
      setProgress(40);

      try {
        // Execute On-Device OCR asynchronously (non-blocking)
        const ocrResult: RecognizedOcrData = await ocrService.recognizeText(
          screenshot.id,
          screenshot.image_uri
        );

        if (cancelFlagRef.current) return;

        // Progressively reveal extracted OCR text & bounding boxes immediately
        setRawText(ocrResult.text);
        setCorrectedText(ocrResult.correctedText ?? null);
        setExtractedTextPreview(ocrResult.activeText);
        setBoundingBoxes(ocrResult.boundingBoxes);
        setBlocks(ocrResult.blocks);
        setOcrConfidence(ocrResult.confidence);
        setDetectedLanguage(`${ocrResult.language} (${ocrResult.languageCode})`);

        try {
          Haptics.selectionAsync();
        } catch (_) {}

        // Stage 2 -> Stage 3: Detecting language & entities
        timeoutRef.current = setTimeout(() => {
          if (cancelFlagRef.current) return;
          setCurrentStep('detecting_language');
          setProgress(70);

          // Entity heuristic parsing based on extracted OCR text
          const entities: DetectedEntityPreview[] = [];
          if (
            ocrResult.language === 'Japanese' ||
            ocrResult.language === 'Korean' ||
            screenshot.category === 'Manga'
          ) {
            entities.push({
              type: 'manga_pattern',
              value: `${ocrResult.boundingBoxes.length} Text Regions`,
              action: 'Manga Mode',
            });
          }

          if (/(\d{1,2}:\d{2}|deadline|meeting|friday|tomorrow)/i.test(ocrResult.text)) {
            entities.push({
              type: 'date',
              value: 'Detected Deadline/Event',
              action: 'Set Reminder',
            });
          }

          if (entities.length === 0) {
            entities.push({
              type: 'other',
              value: `${ocrResult.boundingBoxes.length} Text Lines`,
              action: 'Copy Text',
            });
          }

          setDetectedEntities(entities);

          // Stage 3 -> Stage 4: Finding actions
          timeoutRef.current = setTimeout(() => {
            if (cancelFlagRef.current) return;
            setCurrentStep('finding_actions');
            setProgress(90);

            // Stage 4 -> Completed
            timeoutRef.current = setTimeout(() => {
              if (cancelFlagRef.current) return;
              setCurrentStep('completed');
              setProgress(100);

              const actions: SuggestedActionItem[] = [];

              if (ocrResult.language === 'Japanese' || screenshot.category === 'Manga') {
                actions.push(
                  {
                    id: 'manga',
                    label: 'Open in Manga Mode',
                    iconName: 'book-outline',
                    badge: 'Recommended',
                    type: 'manga',
                  },
                  {
                    id: 'translate',
                    label: 'Translate to Indonesian',
                    iconName: 'language-outline',
                    type: 'translate',
                  },
                  {
                    id: 'copy',
                    label: 'Copy Japanese Text',
                    iconName: 'copy-outline',
                    type: 'copy',
                  }
                );
              } else {
                actions.push(
                  {
                    id: 'translate',
                    label: 'Translate to Indonesian',
                    iconName: 'language-outline',
                    badge: 'Auto',
                    type: 'translate',
                  },
                  {
                    id: 'reminder',
                    label: 'Create Deadline Reminder',
                    iconName: 'alarm-outline',
                    badge: 'Detected',
                    type: 'reminder',
                  },
                  {
                    id: 'copy',
                    label: 'Copy Extracted Text',
                    iconName: 'copy-outline',
                    type: 'copy',
                  }
                );
              }

              setSuggestedActions(actions);

              try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (_) {}
            }, 300);
          }, 350);
        }, 350);
      } catch (ocrErr) {
        console.error('OCR pipeline execution error:', ocrErr);
        if (!cancelFlagRef.current) {
          setError('Failed to extract text from screenshot');
          setCurrentStep('error');
        }
      }
    }, 250);
  }, [screenshot]);

  const retryPipeline = useCallback(() => {
    startPipeline();
  }, [startPipeline]);

  const selectBlock = useCallback((id: string | null) => {
    setSelectedBlockId(id);
    try {
      Haptics.selectionAsync();
    } catch (_) {}
  }, []);

  const saveEditedText = useCallback(
    async (newText: string) => {
      if (!screenshot) return;
      const trimmed = newText.trim();
      await ocrService.updateCorrectedText(screenshot.id, trimmed);
      setCorrectedText(trimmed);
      setExtractedTextPreview(trimmed);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}
    },
    [screenshot]
  );

  const revertToOriginal = useCallback(async () => {
    if (!screenshot || !rawText) return;
    await ocrService.revertCorrectedText(screenshot.id);
    setCorrectedText(null);
    setExtractedTextPreview(rawText);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
  }, [screenshot, rawText]);

  // Trigger analysis pipeline automatically whenever the target screenshot changes
  useEffect(() => {
    if (screenshot) {
      startPipeline();
    } else {
      clearTimer();
      setCurrentStep('idle');
      setProgress(0);
      setExtractedTextPreview(null);
      setRawText(null);
      setCorrectedText(null);
      setDetectedLanguage(null);
      setDetectedEntities([]);
      setSuggestedActions([]);
      setBoundingBoxes([]);
      setBlocks([]);
      setSelectedBlockId(null);
    }

    return () => {
      clearTimer();
    };
  }, [screenshot?.id, startPipeline]);

  const isProcessing =
    currentStep === 'reading_image' ||
    currentStep === 'detecting_text' ||
    currentStep === 'detecting_language' ||
    currentStep === 'finding_actions';

  return {
    currentStep,
    progress,
    isProcessing,
    isCompleted: currentStep === 'completed',
    isCancelled: currentStep === 'cancelled',
    error,
    extractedTextPreview,
    rawText,
    correctedText,
    isCorrected: !!correctedText && correctedText !== rawText,
    detectedLanguage,
    detectedEntities,
    suggestedActions,
    boundingBoxes,
    blocks,
    selectedBlockId,
    ocrConfidence,
    startPipeline,
    cancelPipeline,
    retryPipeline,
    selectBlock,
    saveEditedText,
    revertToOriginal,
  };
}
