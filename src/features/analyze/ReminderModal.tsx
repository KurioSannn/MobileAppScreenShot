import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PrimaryButton, SecondaryButton } from '../../components';
import { Colors, Radius, Spacing, Typography } from '../../theme/tokens';
import { ReminderRow } from '../../types';
import { parseDateTimeFromText, reminderService } from '../../services';

export interface ReminderModalProps {
  visible: boolean;
  onClose: () => void;
  initialTitle?: string;
  initialDateSnippet?: string;
  screenshotId?: string | null;
  onReminderScheduled?: (reminder: ReminderRow) => void;
}

const REMIND_BEFORE_OPTIONS = [
  { label: 'At event', minutes: 0 },
  { label: '15m before', minutes: 15 },
  { label: '30m before', minutes: 30 },
  { label: '1h before', minutes: 60 },
  { label: '1d before', minutes: 1440 },
];

export const ReminderModal: React.FC<ReminderModalProps> = ({
  visible,
  onClose,
  initialTitle = '',
  initialDateSnippet = '',
  screenshotId,
  onReminderScheduled,
}) => {
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [remindBefore, setRemindBefore] = useState(15);
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form fields whenever modal opens
  useEffect(() => {
    if (visible) {
      const parsed = parseDateTimeFromText(initialDateSnippet || initialTitle || '');
      setTitle(initialTitle || 'Screenshot Reminder');
      setDateStr(parsed.dateStr);
      setTimeStr(parsed.timeStr);
      setRemindBefore(15);
      setError(null);
    }
  }, [visible, initialTitle, initialDateSnippet]);

  const handleQuickDay = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setDateStr(`${yyyy}-${mm}-${dd}`);
    try {
      Haptics.selectionAsync();
    } catch (_) {}
  };

  const handleQuickTime = (hhmm: string) => {
    setTimeStr(hhmm);
    try {
      Haptics.selectionAsync();
    } catch (_) {}
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please provide a title for the reminder.');
      return;
    }

    // Parse date and time into timestamp
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const [hourStr, minStr] = timeStr.split(':');

    if (!yearStr || !monthStr || !dayStr || !hourStr || !minStr) {
      setError('Please use valid date (YYYY-MM-DD) and time (HH:mm) formats.');
      return;
    }

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minStr, 10);

    const targetDate = new Date(year, month, day, hour, minute, 0, 0);
    const scheduledAt = targetDate.getTime();

    if (isNaN(scheduledAt)) {
      setError('Invalid date/time provided.');
      return;
    }

    setIsScheduling(true);
    setError(null);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}

    try {
      const reminder = await reminderService.scheduleReminder({
        screenshotId,
        title: title.trim(),
        scheduledAt,
        remindBeforeMinutes: remindBefore,
      });

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}

      onReminderScheduled?.(reminder);
      onClose();
    } catch (err: any) {
      console.error('Failed to schedule reminder:', err);
      setError(err?.message || 'Could not schedule reminder.');
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* Sheet Header */}
              <View style={styles.sheetHeader}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="alarm" size={20} color={Colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.sheetTitle}>Schedule Reminder</Text>
                    <Text style={styles.sheetSubtitle}>
                      Editable date & time detected from screenshot
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Title Field */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Reminder Title</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Meeting Deadline or Bill Payment"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              {/* Date Field & Quick Shortcuts */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={dateStr}
                  onChangeText={setDateStr}
                  placeholder="2026-10-15"
                  placeholderTextColor={Colors.textMuted}
                />
                <View style={styles.quickPillsRow}>
                  <TouchableOpacity
                    style={styles.quickPill}
                    onPress={() => handleQuickDay(0)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickPillText}>Today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickPill}
                    onPress={() => handleQuickDay(1)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickPillText}>Tomorrow</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickPill}
                    onPress={() => handleQuickDay(7)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickPillText}>Next Week</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Time Field & Quick Shortcuts */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Time (HH:mm)</Text>
                <TextInput
                  style={styles.input}
                  value={timeStr}
                  onChangeText={setTimeStr}
                  placeholder="09:00"
                  placeholderTextColor={Colors.textMuted}
                />
                <View style={styles.quickPillsRow}>
                  <TouchableOpacity
                    style={styles.quickPill}
                    onPress={() => handleQuickTime('09:00')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickPillText}>09:00 AM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickPill}
                    onPress={() => handleQuickTime('14:00')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickPillText}>02:00 PM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickPill}
                    onPress={() => handleQuickTime('19:00')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickPillText}>07:00 PM</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Remind Before Selector */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Notify Me</Text>
                <View style={styles.quickPillsRow}>
                  {REMIND_BEFORE_OPTIONS.map((opt) => {
                    const isSelected = remindBefore === opt.minutes;
                    return (
                      <TouchableOpacity
                        key={opt.minutes}
                        style={[
                          styles.remindBeforePill,
                          isSelected && styles.remindBeforePillSelected,
                        ]}
                        onPress={() => {
                          setRemindBefore(opt.minutes);
                          try {
                            Haptics.selectionAsync();
                          } catch (_) {}
                        }}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.remindBeforePillText,
                            isSelected && styles.remindBeforePillTextSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Modal Action Buttons */}
              <View style={styles.buttonRow}>
                <SecondaryButton
                  label="Cancel"
                  onPress={onClose}
                  disabled={isScheduling}
                  style={{ flex: 1 }}
                />
                <PrimaryButton
                  label="Schedule"
                  onPress={handleSave}
                  loading={isScheduling}
                  style={{ flex: 1 }}
                  icon={<Ionicons name="checkmark-circle" size={18} color="#1E1E1E" />}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 30, 30, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  sheetSubtitle: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  errorText: {
    fontSize: Typography.size.xs,
    color: Colors.danger,
    fontWeight: Typography.weight.medium,
    flex: 1,
  },
  formGroup: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: Typography.size.sm,
    color: Colors.textPrimary,
  },
  quickPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: 2,
  },
  quickPill: {
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  quickPillText: {
    fontSize: Typography.size.xs - 1,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
  },
  remindBeforePill: {
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  remindBeforePillSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  remindBeforePillText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
  },
  remindBeforePillTextSelected: {
    color: Colors.textPrimary,
    fontWeight: Typography.weight.bold,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
});
