import React, { useState } from 'react';
import {
  Clipboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card, PrimaryButton, SecondaryButton, SegmentedControl, StatusBadge } from '../../components';
import { Colors, Radius, Spacing, Typography } from '../../theme/tokens';
import { BoundingBox } from '../../types';

export interface TextExtractionViewProps {
  rawText: string | null;
  activeText: string | null;
  correctedText: string | null;
  isCorrected: boolean;
  detectedLanguage: string | null;
  blocks: Array<{ id: string; text: string; box: BoundingBox }>;
  selectedBlockId: string | null;
  ocrConfidence: number;
  onSelectBlock: (id: string | null) => void;
  onSaveEditedText: (newText: string) => Promise<void>;
  onRevertToOriginal: () => Promise<void>;
}

export const TextExtractionView: React.FC<TextExtractionViewProps> = ({
  rawText,
  activeText,
  correctedText,
  isCorrected,
  detectedLanguage,
  blocks,
  selectedBlockId,
  ocrConfidence,
  onSelectBlock,
  onSaveEditedText,
  onRevertToOriginal,
}) => {
  const [activeTab, setActiveTab] = useState<'full' | 'regions'>('full');
  const [isEditing, setIsEditing] = useState(false);
  const [editedTextValue, setEditedTextValue] = useState(activeText || '');
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync edited text if activeText changes from outside
  React.useEffect(() => {
    if (!isEditing && activeText) {
      setEditedTextValue(activeText);
    }
  }, [activeText, isEditing]);

  const handleCopyFull = () => {
    if (!activeText) return;
    Clipboard.setString(activeText);
    setCopiedFull(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
    setTimeout(() => setCopiedFull(false), 2000);
  };

  const handleCopyBlock = (blockId: string, text: string) => {
    Clipboard.setString(text);
    setCopiedBlockId(blockId);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
    setTimeout(() => setCopiedBlockId(null), 2000);
  };

  const handleStartEdit = () => {
    setEditedTextValue(activeText || '');
    setIsEditing(true);
    try {
      Haptics.selectionAsync();
    } catch (_) {}
  };

  const handleCancelEdit = () => {
    setEditedTextValue(activeText || '');
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      await onSaveEditedText(editedTextValue);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save edited text:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevert = async () => {
    setIsSaving(true);
    try {
      await onRevertToOriginal();
      setEditedTextValue(rawText || '');
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to revert text:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeText && blocks.length === 0) {
    return null;
  }

  return (
    <Card variant="surface" padding={Spacing.lg} style={styles.container}>
      {/* Header with Title and Mode Actions */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="document-text" size={20} color={Colors.primary} />
          <Text style={styles.headerTitle}>Extracted Text</Text>
          {isCorrected && (
            <StatusBadge label="Edited" status="warning" style={styles.editedBadge} />
          )}
        </View>

        <View style={styles.headerActions}>
          {!isEditing ? (
            <>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={handleCopyFull}
                activeOpacity={0.7}
                accessibilityLabel="Copy full text"
              >
                <Ionicons
                  name={copiedFull ? 'checkmark-outline' : 'copy-outline'}
                  size={16}
                  color={copiedFull ? Colors.success : Colors.textPrimary}
                />
                <Text
                  style={[
                    styles.headerBtnText,
                    copiedFull && { color: Colors.success, fontWeight: '700' },
                  ]}
                >
                  {copiedFull ? 'Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={handleStartEdit}
                activeOpacity={0.7}
                accessibilityLabel="Edit extracted text"
              >
                <Ionicons name="pencil-outline" size={16} color={Colors.textPrimary} />
                <Text style={styles.headerBtnText}>Edit</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>

      {/* Segmented Control: Full Text vs Individual Regions */}
      {!isEditing && blocks.length > 0 && (
        <SegmentedControl<'full' | 'regions'>
          options={[
            { value: 'full', label: 'Full Text' },
            { value: 'regions', label: `Regions (${blocks.length})` },
          ]}
          selectedValue={activeTab}
          onSelect={(val) => setActiveTab(val)}
          style={styles.segmentedControl}
        />
      )}

      {/* Main Body: Full Text Mode vs Regions Mode vs Edit Mode */}
      {isEditing ? (
        /* Edit Mode */
        <View style={styles.editSection}>
          <Text style={styles.editHint}>
            Edit OCR text to correct typo or imperfect recognition. Changes are saved locally.
          </Text>
          <TextInput
            style={styles.textInput}
            multiline
            value={editedTextValue}
            onChangeText={setEditedTextValue}
            placeholder="Type or edit extracted text..."
            placeholderTextColor={Colors.textMuted}
            autoFocus
            textAlignVertical="top"
          />

          <View style={styles.editButtonRow}>
            {isCorrected && (
              <SecondaryButton
                label="Revert"
                onPress={handleRevert}
                loading={isSaving}
                size="sm"
                icon={<Ionicons name="refresh-outline" size={16} color={Colors.textPrimary} />}
                style={styles.revertBtn}
              />
            )}
            <SecondaryButton
              label="Cancel"
              onPress={handleCancelEdit}
              disabled={isSaving}
              size="sm"
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label="Save"
              onPress={handleSaveEdit}
              loading={isSaving}
              size="sm"
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : activeTab === 'full' ? (
        /* Full Text Display Mode */
        <View style={styles.fullTextSection}>
          <View style={styles.textBubble}>
            <Text style={styles.fullTextContent} selectable>
              {activeText}
            </Text>
          </View>

          {isCorrected && (
            <TouchableOpacity
              style={styles.revertRow}
              onPress={handleRevert}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-undo-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.revertRowText}>Revert to original OCR text</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        /* Regions / Bounding Box Blocks Mode */
        <View style={styles.regionsSection}>
          <Text style={styles.regionsHint}>
            Tap a block to highlight region or copy its individual text snippet.
          </Text>
          <View style={styles.blocksList}>
            {blocks.map((block, index) => {
              const isSelected = selectedBlockId === block.id;
              const isBlockCopied = copiedBlockId === block.id;

              return (
                <TouchableOpacity
                  key={block.id}
                  style={[
                    styles.blockCard,
                    isSelected && styles.blockCardSelected,
                  ]}
                  onPress={() => onSelectBlock(isSelected ? null : block.id)}
                  activeOpacity={0.75}
                >
                  <View style={styles.blockCardHeader}>
                    <View style={styles.blockMetaTag}>
                      <Text style={styles.blockMetaText}>Region #{index + 1}</Text>
                    </View>
                    <Text style={styles.blockCoordsText}>
                      [{Math.round(block.box.x)}, {Math.round(block.box.y)},{' '}
                      {Math.round(block.box.width)}×{Math.round(block.box.height)}]
                    </Text>
                    <TouchableOpacity
                      style={styles.blockCopyBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleCopyBlock(block.id, block.text);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isBlockCopied ? 'checkmark' : 'copy-outline'}
                        size={14}
                        color={isBlockCopied ? Colors.success : Colors.textPrimary}
                      />
                      <Text
                        style={[
                          styles.blockCopyText,
                          isBlockCopied && { color: Colors.success, fontWeight: '700' },
                        ]}
                      >
                        {isBlockCopied ? 'Copied' : 'Copy'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.blockBodyText, isSelected && styles.blockBodyTextSelected]}>
                    {block.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Metadata Badges Footer */}
      <View style={styles.metaFooterRow}>
        {detectedLanguage && (
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Language:</Text>
            <StatusBadge label={detectedLanguage} status="info" />
          </View>
        )}
        {blocks.length > 0 && (
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Regions:</Text>
            <StatusBadge label={`${blocks.length} blocks`} status="neutral" />
          </View>
        )}
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Confidence:</Text>
          <StatusBadge
            label={`${Math.round(ocrConfidence * 100)}%`}
            status="success"
          />
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
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
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  editedBadge: {
    marginLeft: Spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  headerBtnText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.textPrimary,
  },
  segmentedControl: {
    marginVertical: Spacing.sm,
  },
  fullTextSection: {
    marginTop: Spacing.xs,
  },
  textBubble: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  fullTextContent: {
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  revertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    marginTop: Spacing.xs + 2,
    paddingVertical: 2,
  },
  revertRowText: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
    textDecorationLine: 'underline',
  },
  editSection: {
    marginTop: Spacing.xs,
  },
  editHint: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs + 2,
    lineHeight: 16,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
    minHeight: 120,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  editButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  revertBtn: {
    marginRight: Spacing.xs,
  },
  regionsSection: {
    marginTop: Spacing.xs,
  },
  regionsHint: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 16,
  },
  blocksList: {
    gap: Spacing.sm,
  },
  blockCard: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radius.sm,
    padding: Spacing.md,
  },
  blockCardSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  blockCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs + 2,
  },
  blockMetaTag: {
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  blockMetaText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.textSecondary,
  },
  blockCoordsText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
    flex: 1,
    marginLeft: Spacing.sm,
  },
  blockCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  blockCopyText: {
    fontSize: 11,
    fontWeight: Typography.weight.semibold,
    color: Colors.textPrimary,
  },
  blockBodyText: {
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  blockBodyTextSelected: {
    fontWeight: Typography.weight.medium,
  },
  metaFooterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaLabel: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weight.medium,
  },
});
