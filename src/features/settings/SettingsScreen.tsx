import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const SettingsScreen: React.FC = () => {
  const [fastMode, setFastMode] = useState(true);
  const [localOcrOnly, setLocalOcrOnly] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Preferences & local-first storage</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Section 1: Translation */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Translation & OCR</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Fast Mode</Text>
              <Text style={styles.settingSub}>Prioritize instant translation speed</Text>
            </View>
            <Switch
              value={fastMode}
              onValueChange={setFastMode}
              trackColor={{ false: '#E5DFD5', true: '#F5B031' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>On-Device Local Processing</Text>
              <Text style={styles.settingSub}>Never send screenshots to cloud</Text>
            </View>
            <Switch
              value={localOcrOnly}
              onValueChange={setLocalOcrOnly}
              trackColor={{ false: '#E5DFD5', true: '#F5B031' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Section 2: Storage */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Storage & Privacy</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>SQLite Database</Text>
              <Text style={styles.settingSub}>Local cache & indexed history</Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color="#2A7B4C" />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>App Version</Text>
              <Text style={styles.settingSub}>Snaply MVP 0.1 (Android)</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F6F0',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E1E1E',
  },
  subtitle: {
    fontSize: 13,
    color: '#6E6B65',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 80,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EFECE4',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1E1E',
    marginBottom: 14,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
  },
  settingSub: {
    fontSize: 12,
    color: '#7A766F',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3EFE6',
    marginVertical: 6,
  },
});
