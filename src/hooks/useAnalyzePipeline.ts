import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { ScreenshotRow } from '../types';

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
    description: 'Locating lines, bounding boxes, and bubble shapes',
  },
  {
    key: 'detecting_language',
    label: '3. Identifying language & entities',
    description: 'Classifying Japanese, English, Indonesian, and dates',
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
  detectedLanguage: string | null;
  detectedEntities: DetectedEntityPreview[];
  suggestedActions: SuggestedActionItem[];
  startPipeline: () => void;
  cancelPipeline: () => void;
  retryPipeline: () => void;
}

/**
 * Custom hook to drive the progressive screenshot analysis pipeline
 * without blocking the UI or displaying fullscreen blank spinners.
 */
export function useAnalyzePipeline(
  screenshot: ScreenshotRow | null
): UseAnalyzePipelineReturn {
  const [currentStep, setCurrentStep] = useState<PipelineStep>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Progressive results revealed as pipeline moves forward
  const [extractedTextPreview, setExtractedTextPreview] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [detectedEntities, setDetectedEntities] = useState<DetectedEntityPreview[]>([]);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedActionItem[]>([]);

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
    setDetectedLanguage(null);
    setDetectedEntities([]);
    setSuggestedActions([]);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    // Stage 1 -> Stage 2: Reading image metadata completes quickly
    timeoutRef.current = setTimeout(() => {
      if (cancelFlagRef.current) return;
      setCurrentStep('detecting_text');
      setProgress(40);

      // Stage 2 -> Stage 3: Detecting text regions reveals preliminary OCR snippet
      timeoutRef.current = setTimeout(() => {
        if (cancelFlagRef.current) return;
        setCurrentStep('detecting_language');
        setProgress(70);

        // Progressively reveal extracted OCR text before whole pipeline completes
        const mockSnippet =
          screenshot.category === 'Manga'
            ? 'お前は誰だ？…友達だ。(Who are you? ...A friend.)'
            : 'Meeting Deadline: Friday 17:00 PM. Please review final proposal.';
        setExtractedTextPreview(mockSnippet);

        try {
          Haptics.selectionAsync();
        } catch (_) {}

        // Stage 3 -> Stage 4: Detecting language & entities
        timeoutRef.current = setTimeout(() => {
          if (cancelFlagRef.current) return;
          setCurrentStep('finding_actions');
          setProgress(90);

          const lang = screenshot.category === 'Manga' ? 'Japanese (日本語)' : 'English (en)';
          setDetectedLanguage(lang);

          const entities: DetectedEntityPreview[] =
            screenshot.category === 'Manga'
              ? [{ type: 'manga_pattern', value: '2 Speech Bubbles', action: 'Manga Mode' }]
              : [
                  { type: 'date', value: 'Friday 17:00 PM', action: 'Set Reminder' },
                  { type: 'other', value: 'Proposal Document', action: 'Copy Text' },
                ];
          setDetectedEntities(entities);

          // Stage 4 -> Completed
          timeoutRef.current = setTimeout(() => {
            if (cancelFlagRef.current) return;
            setCurrentStep('completed');
            setProgress(100);

            const actions: SuggestedActionItem[] =
              screenshot.category === 'Manga'
                ? [
                    { id: 'manga', label: 'Open in Manga Mode', iconName: 'book-outline', badge: 'Recommended', type: 'manga' },
                    { id: 'translate', label: 'Translate to Indonesian', iconName: 'language-outline', type: 'translate' },
                    { id: 'copy', label: 'Copy Japanese Text', iconName: 'copy-outline', type: 'copy' },
                  ]
                : [
                    { id: 'translate', label: 'Translate to Indonesian', iconName: 'language-outline', badge: 'Auto', type: 'translate' },
                    { id: 'reminder', label: 'Create Deadline Reminder', iconName: 'alarm-outline', badge: 'Detected', type: 'reminder' },
                    { id: 'copy', label: 'Copy Extracted Text', iconName: 'copy-outline', type: 'copy' },
                  ];
            setSuggestedActions(actions);

            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (_) {}
          }, 350);
        }, 400);
      }, 450);
    }, 300);
  }, [screenshot]);

  const retryPipeline = useCallback(() => {
    startPipeline();
  }, [startPipeline]);

  // Trigger analysis pipeline automatically whenever the target screenshot changes
  useEffect(() => {
    if (screenshot) {
      startPipeline();
    } else {
      clearTimer();
      setCurrentStep('idle');
      setProgress(0);
      setExtractedTextPreview(null);
      setDetectedLanguage(null);
      setDetectedEntities([]);
      setSuggestedActions([]);
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
    detectedLanguage,
    detectedEntities,
    suggestedActions,
    startPipeline,
    cancelPipeline,
    retryPipeline,
  };
}
