import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MangaScreenProps {
  onBack: () => void;
}

export const MangaScreen: React.FC<MangaScreenProps> = ({ onBack }) => {
  const [mode, setMode] = useState<'translated' | 'original'>('translated');

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#1E1E1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manga Mode</Text>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={20} color="#1E1E1E" />
        </TouchableOpacity>
      </View>

      {/* Manga Canvas Viewer Container */}
      <View style={styles.canvasContainer}>
        <View style={styles.mangaCard}>
          <Ionicons name="book" size={54} color="#6847B8" />
          <Text style={styles.mangaPlaceholderTitle}>Manga Page Viewer</Text>
          <Text style={styles.mangaPlaceholderSub}>
            Speech bubbles are automatically detected with adaptive typesetting & clean inpainting.
          </Text>

          {/* Sample Bubble Tag Simulation */}
          <View style={styles.bubbleTag}>
            <Text style={styles.bubbleTagText}>
              {mode === 'translated'
                ? '💬 "Kamu siapa? ...Aku temanmu."'
                : '💬 「お前は誰だ？…友達だ。」'}
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Manga Controls */}
      <View style={styles.controlsBar}>
        <View style={styles.toggleWrapper}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'original' && styles.toggleBtnActive]}
            onPress={() => setMode('original')}
          >
            <Text
              style={[
                styles.toggleText,
                mode === 'original' && styles.toggleTextActive,
              ]}
            >
              Original
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'translated' && styles.toggleBtnActive]}
            onPress={() => setMode('translated')}
          >
            <Text
              style={[
                styles.toggleText,
                mode === 'translated' && styles.toggleTextActive,
              ]}
            >
              Translated
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F6F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFECE4',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  canvasContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  mangaCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    borderWidth: 1,
    borderColor: '#EFECE4',
  },
  mangaPlaceholderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E1E1E',
    marginTop: 14,
  },
  mangaPlaceholderSub: {
    fontSize: 13,
    color: '#7A766F',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: '85%',
  },
  bubbleTag: {
    backgroundColor: '#F3EFE6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#E8E3D7',
  },
  bubbleTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
  },
  controlsBar: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
  },
  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: '#EFECE4',
  },
  toggleBtn: {
    flex: 1,
    height: 44,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#F5B031',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6E6B65',
  },
  toggleTextActive: {
    color: '#1E1E1E',
    fontWeight: '700',
  },
});
