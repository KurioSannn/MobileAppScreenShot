import React, { useState } from 'react';
import {
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
import { DetectedEntity, entityService } from '../../services';

export interface EntityChipsViewProps {
  entities: DetectedEntity[];
  onOpenMangaMode?: () => void;
  onCreateReminder?: (title: string, snippet: string) => void;
}

export const EntityChipsView: React.FC<EntityChipsViewProps> = ({
  entities,
  onOpenMangaMode,
  onCreateReminder,
}) => {
  const [copiedEntityId, setCopiedEntityId] = useState<string | null>(null);

  if (!entities || entities.length === 0) {
    return null;
  }

  const handleAction = async (entity: DetectedEntity) => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}

    switch (entity.suggestedAction) {
      case 'open_url': {
        await entityService.executeEntityAction(entity);
        break;
      }
      case 'copy_tracking':
      case 'copy_price':
      case 'copy_phone': {
        Clipboard.setString(entity.value);
        setCopiedEntityId(entity.id);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (_) {}
        setTimeout(() => setCopiedEntityId(null), 2000);
        break;
      }
      case 'create_reminder': {
        if (onCreateReminder) {
          onCreateReminder(entity.actionData.title || `Reminder: ${entity.value}`, entity.actionData.textSnippet || entity.value);
        } else {
          Clipboard.setString(entity.value);
          setCopiedEntityId(entity.id);
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (_) {}
          setTimeout(() => setCopiedEntityId(null), 2000);
        }
        break;
      }
      case 'open_manga': {
        onOpenMangaMode?.();
        break;
      }
      default: {
        Clipboard.setString(entity.value);
        setCopiedEntityId(entity.id);
        setTimeout(() => setCopiedEntityId(null), 2000);
      }
    }
  };

  const getActionLabel = (entity: DetectedEntity, isCopied: boolean) => {
    if (isCopied) return 'Copied!';
    switch (entity.suggestedAction) {
      case 'open_url':
        return 'Open';
      case 'copy_tracking':
        return 'Copy Resi';
      case 'copy_price':
        return 'Copy Price';
      case 'copy_phone':
        return 'Copy Phone';
      case 'create_reminder':
        return 'Set Reminder';
      case 'open_manga':
        return 'Manga Mode';
      default:
        return 'Copy';
    }
  };

  const getActionIcon = (entity: DetectedEntity, isCopied: boolean) => {
    if (isCopied) return 'checkmark';
    switch (entity.suggestedAction) {
      case 'open_url':
        return 'open-outline';
      case 'create_reminder':
        return 'alarm-outline';
      case 'open_manga':
        return 'book-outline';
      default:
        return 'copy-outline';
    }
  };

  return (
    <Card variant="surface" padding={Spacing.lg} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={20} color={Colors.primary} />
          <Text style={styles.headerTitle}>Detected Entities & Actions</Text>
        </View>
        <StatusBadge label={`${entities.length} Found`} status="info" />
      </View>

      <Text style={styles.subtitle}>
        Tap any detected item to take immediate action or copy isolated data.
      </Text>

      <View style={styles.chipsContainer}>
        {entities.map((entity) => {
          const isCopied = copiedEntityId === entity.id;
          const isManga = entity.entityType === 'manga_pattern';

          return (
            <View
              key={entity.id}
              style={[
                styles.entityRow,
                isManga && styles.entityRowManga,
              ]}
            >
              <View style={styles.entityLeft}>
                <View style={[styles.iconBox, isManga && styles.iconBoxManga]}>
                  <Ionicons
                    name={entity.icon as any}
                    size={16}
                    color={isManga ? '#6847B8' : Colors.textPrimary}
                  />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.entityLabel}>{entity.label}</Text>
                  <Text style={styles.entityValue} numberOfLines={1}>
                    {entity.value}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isManga && styles.actionButtonManga,
                  isCopied && styles.actionButtonCopied,
                ]}
                onPress={() => handleAction(entity)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={getActionIcon(entity, isCopied) as any}
                  size={14}
                  color={
                    isCopied
                      ? Colors.success
                      : isManga
                      ? '#6847B8'
                      : Colors.textPrimary
                  }
                />
                <Text
                  style={[
                    styles.actionButtonText,
                    isManga && styles.actionButtonTextManga,
                    isCopied && styles.actionButtonTextCopied,
                  ]}
                >
                  {getActionLabel(entity, isCopied)}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
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
    marginBottom: Spacing.xs,
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
  subtitle: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 16,
  },
  chipsContainer: {
    gap: Spacing.sm,
  },
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  entityRowManga: {
    backgroundColor: '#FAF7FD',
    borderColor: '#E8DFF7',
  },
  entityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    flex: 1,
    marginRight: Spacing.sm,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.xs,
    backgroundColor: Colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxManga: {
    backgroundColor: '#EBE6F8',
  },
  textContainer: {
    flex: 1,
  },
  entityLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entityValue: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.textPrimary,
    marginTop: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  actionButtonManga: {
    backgroundColor: '#EBE6F8',
    borderColor: '#D8CEF3',
  },
  actionButtonCopied: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
  },
  actionButtonText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  actionButtonTextManga: {
    color: '#6847B8',
  },
  actionButtonTextCopied: {
    color: Colors.success,
  },
});
