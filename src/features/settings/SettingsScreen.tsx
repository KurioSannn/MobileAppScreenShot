import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Spacing, Typography } from '../../theme/tokens';
import { screenshotRepository, settingsRepository } from '../../db';
import { metricsService } from '../../services/metrics';

export const SettingsScreen: React.FC = () => {
  const [fastMode, setFastMode] = useState(true);
  const [localOcrOnly, setLocalOcrOnly] = useState(true);
  const [disableHistory, setDisableHistory] = useState(false);
  const [screenshotCount, setScreenshotCount] = useState(0);
  const [metricsCount, setMetricsCount] = useState(0);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const showStatus = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => setStatusFeedback(null), 2500);
  };

  useEffect(() => {
    let isCurrent = true;

    // Load initial settings and storage counts
    Promise.all([
      settingsRepository.getBooleanSetting('fast_mode', true),
      settingsRepository.getBooleanSetting('local_ocr_only', true),
      settingsRepository.getBooleanSetting('disable_history', false),
      screenshotRepository.countScreenshots(),
      metricsService.getEventsCount(),
    ]).then(([fast, localOcr, noHistory, scCount, mCount]) => {
      if (!isCurrent) return;
      setFastMode(fast);
      setLocalOcrOnly(localOcr);
      setDisableHistory(noHistory);
      setScreenshotCount(scCount);
      setMetricsCount(mCount);
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  const handleToggleFastMode = async (value: boolean) => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    setFastMode(value);
    await settingsRepository.setBooleanSetting('fast_mode', value);
  };

  const handleToggleLocalOcr = async (value: boolean) => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    setLocalOcrOnly(value);
    await settingsRepository.setBooleanSetting('local_ocr_only', value);
  };

  const handleToggleDisableHistory = async (value: boolean) => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    setDisableHistory(value);
    await settingsRepository.setBooleanSetting('disable_history', value);
    showStatus(value ? 'Incognito Mode: History recording disabled' : 'History recording active');
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Screenshot History?',
      'This will permanently delete all screenshot items, OCR text, translations, and manga dialogues. Your scheduled reminders will remain safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All History',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch (_) {}
            await screenshotRepository.clearAllHistory();
            setScreenshotCount(0);
            showStatus('All screenshot history cleared');
          },
        },
      ]
    );
  };

  const handleClearDatabase = () => {
    Alert.alert(
      'Reset Local Database?',
      'This will erase ALL data including screenshots, translations, scheduled reminders, and cached settings. Snaply will return to a clean install state.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Database',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch (_) {}
            await screenshotRepository.clearLocalDatabase();
            await metricsService.clearMetrics();
            setScreenshotCount(0);
            setMetricsCount(0);
            showStatus('Local database completely reset');
          },
        },
      ]
    );
  };

  const handleClearDiagnostics = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    await metricsService.clearMetrics();
    setMetricsCount(0);
    showStatus('Local event logs cleared');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Privacy, preferences & local storage control</Text>
      </View>

      {statusFeedback && (
        <View style={styles.statusToast}>
          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.statusToastText}>{statusFeedback}</Text>
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Section 1: Privacy & Data Protection */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Privacy & Data Protection</Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>On-Device Local Processing</Text>
              <Text style={styles.settingSub}>
                Screenshots and ML Kit OCR run strictly on your device. Never transmitted to cloud.
              </Text>
            </View>
            <Switch
              value={localOcrOnly}
              onValueChange={handleToggleLocalOcr}
              trackColor={{ false: Colors.borderLight, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.labelBadgeRow}>
                <Text style={styles.settingLabel}>Disable History (Incognito Mode)</Text>
                {disableHistory && (
                  <View style={styles.incognitoBadge}>
                    <Text style={styles.incognitoBadgeText}>Active</Text>
                  </View>
                )}
              </View>
              <Text style={styles.settingSub}>
                Process screenshots ephemerally without persisting them to library history.
              </Text>
            </View>
            <Switch
              value={disableHistory}
              onValueChange={handleToggleDisableHistory}
              trackColor={{ false: Colors.borderLight, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Section 2: Performance & Engine */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="flash" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Performance & Pipeline</Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Fast Pipeline Mode</Text>
              <Text style={styles.settingSub}>
                Prioritizes sub-second OCR matching and instant translation caching.
              </Text>
            </View>
            <Switch
              value={fastMode}
              onValueChange={handleToggleFastMode}
              trackColor={{ false: Colors.borderLight, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Section 3: Data Management & Deletion */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="trash-bin-outline" size={18} color={Colors.danger} />
            <Text style={styles.sectionTitle}>Data Management & Cleanup</Text>
          </View>

          <View style={styles.statsSummaryRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{screenshotCount}</Text>
              <Text style={styles.statLabel}>Screenshots</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{metricsCount}</Text>
              <Text style={styles.statLabel}>Local Events</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>100%</Text>
              <Text style={styles.statLabel}>Offline</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={handleClearHistory}
            activeOpacity={0.7}
          >
            <Ionicons name="images-outline" size={16} color={Colors.danger} />
            <Text style={styles.actionBtnTextDanger}>Clear Screenshot History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtnOutline, { marginTop: 8 }]}
            onPress={handleClearDatabase}
            activeOpacity={0.7}
          >
            <Ionicons name="server-outline" size={16} color={Colors.danger} />
            <Text style={styles.actionBtnTextDanger}>Reset Entire Local Database</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtnSubtle, { marginTop: 8 }]}
            onPress={handleClearDiagnostics}
            activeOpacity={0.7}
          >
            <Ionicons name="analytics-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.actionBtnTextSubtle}>Clear Diagnostic Event Logs</Text>
          </TouchableOpacity>
        </View>

        {/* Section 4: App Info & Zero-Paywall Guarantee */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.info} />
            <Text style={styles.sectionTitle}>About Snaply</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0 (Beta Ready)</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Subscription Tier</Text>
            <View style={styles.freePill}>
              <Text style={styles.freePillText}>100% Free • No Paywall</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Status</Text>
            <Text style={styles.infoValue}>No Login Required (Anonymous)</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.heavy,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusToast: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 32, 0.94)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  statusToastText: {
    color: '#FFFFFF',
    fontSize: Typography.size.sm,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: 80,
    gap: Spacing.md,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
    gap: 2,
  },
  labelBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  incognitoBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  incognitoBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
  },
  settingLabel: {
    fontSize: Typography.size.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  settingSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.xs + 2,
  },
  statsSummaryRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: Spacing.sm,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: Typography.size.md,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(217, 83, 79, 0.3)',
    backgroundColor: 'rgba(217, 83, 79, 0.05)',
    paddingVertical: 10,
    borderRadius: Radius.pill,
  },
  actionBtnTextDanger: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.danger,
  },
  actionBtnSubtle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceSubtle,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  actionBtnTextSubtle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: Typography.size.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  freePill: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  freePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.success,
  },
});
