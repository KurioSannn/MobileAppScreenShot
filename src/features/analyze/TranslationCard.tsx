import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card, StatusBadge } from '../../components';
import { Colors, Radius, Spacing, Typography } from '../../theme/tokens';
import {
  getDefaultTargetLanguage,
  SUPPORTED_TARGET_LANGUAGES,
  translationService,
} from '../../services';

export interface TranslationCardProps {
  screenshotId: string;
  sourceText: string | null;
  detectedLanguage?: string | null;
}

export const TranslationCard: React.FC<TranslationCardProps> = ({
  screenshotId,
  sourceText,
  detectedLanguage,
}) => {
  const [targetLanguage, setTargetLanguage] = useState<string>('Indonesian');
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [copied, setCopied] = useState(false);

  // Set default target language based on detected language
  useEffect(() => {
    if (detectedLanguage) {
      const isIndo =
        detectedLanguage.toLowerCase().includes('indonesian') ||
        detectedLanguage.toLowerCase().includes('(id)');
      const defaultTarget = isIndo ? 'English' : 'Indonesian';
      setTargetLanguage(defaultTarget);
    }
  }, [detectedLanguage]);

  // Execute translation
  const executeTranslate = async (forceRefresh = false) => {
    if (!sourceText || !sourceText.trim()) return;

    setIsTranslating(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    try {
      const result = await translationService.translateText(
        screenshotId,
        sourceText,
        targetLanguage,
        forceRefresh
      );

      setTranslatedText(result.translatedText);
      setIsCached(result.isCached);

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  // Auto-translate on mount or when sourceText / targetLanguage changes
  useEffect(() => {
    if (sourceText && sourceText.trim().length > 0) {
      executeTranslate(false);
    } else {
      setTranslatedText(null);
      setIsCached(false);
    }
  }, [screenshotId, sourceText, targetLanguage]);

  const handleCopy = () => {
    if (!translatedText) return;
    Clipboard.setString(translatedText);
    setCopied(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTranslateAgain = () => {
    executeTranslate(true); // forceRefresh = true
  };

  if (!sourceText || !sourceText.trim()) {
    return null;
  }

  return (
    <Card variant="surface" padding={Spacing.lg} style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="language" size={20} color={Colors.primary} />
          <Text style={styles.headerTitle}>Translation</Text>
          {isCached && (
            <StatusBadge label="Cached" status="neutral" style={styles.badge} />
          )}
        </View>

        {translatedText && !isTranslating && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleTranslateAgain}
            activeOpacity={0.7}
            accessibilityLabel="Translate again"
          >
            <Ionicons name="reload-outline" size={14} color={Colors.textPrimary} />
            <Text style={styles.actionBtnText}>Translate Again</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Target Language Selector */}
      <View style={styles.targetLangSection}>
        <Text style={styles.targetLangLabel}>Target Language:</Text>
        <View style={styles.targetPillRow}>
          {SUPPORTED_TARGET_LANGUAGES.map((lang) => {
            const isSelected = targetLanguage === lang.name;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.targetPill,
                  isSelected && styles.targetPillSelected,
                ]}
                onPress={() => {
                  if (targetLanguage !== lang.name) {
                    setTargetLanguage(lang.name);
                    try {
                      Haptics.selectionAsync();
                    } catch (_) {}
                  }
                }}
                activeOpacity={0.75}
              >
                <Text style={styles.targetFlag}>{lang.flag}</Text>
                <Text
                  style={[
                    styles.targetPillText,
                    isSelected && styles.targetPillTextSelected,
                  ]}
                >
                  {lang.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Content */}
      {isTranslating ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>
            Translating to {targetLanguage}...
          </Text>
        </View>
      ) : translatedText ? (
        <View style={styles.resultContainer}>
          <View style={styles.translatedBubble}>
            <Text style={styles.translatedText} selectable>
              {translatedText}
            </Text>
          </View>

          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={handleCopy}
              activeOpacity={0.7}
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={15}
                color={copied ? Colors.success : Colors.textPrimary}
              />
              <Text
                style={[
                  styles.copyBtnText,
                  copied && { color: Colors.success, fontWeight: '700' },
                ]}
              >
                {copied ? 'Copied!' : 'Copy Translation'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.metaHint}>
              {isCached ? 'Loaded from local SQLite cache' : 'Saved to local database'}
            </Text>
          </View>
        </View>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  badge: {
    marginLeft: Spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  actionBtnText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.textPrimary,
  },
  targetLangSection: {
    marginVertical: Spacing.xs + 2,
  },
  targetLangLabel: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
    marginBottom: Spacing.xs,
  },
  targetPillRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  targetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  targetPillSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  targetFlag: {
    fontSize: 14,
  },
  targetPillText: {
    fontSize: Typography.size.xs + 1,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
  },
  targetPillTextSelected: {
    color: Colors.textPrimary,
    fontWeight: Typography.weight.bold,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  resultContainer: {
    marginTop: Spacing.sm,
  },
  translatedBubble: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  translatedText: {
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  copyBtnText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.textPrimary,
  },
  metaHint: {
    fontSize: Typography.size.xs - 1,
    color: Colors.textMuted,
  },
});
