import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = ['All', 'Manga', 'Assignment', 'Receipt', 'Chat'];

export const LibraryScreen: React.FC = () => {
  const [selectedCat, setSelectedCat] = useState('All');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        <Text style={styles.subtitle}>Saved screenshots & searchable OCR text</Text>
      </View>

      {/* Category Pills Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCat === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, isSelected && styles.catChipActive]}
              onPress={() => setSelectedCat(cat)}
            >
              <Text style={[styles.catText, isSelected && styles.catTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Grid or Empty State */}
      <View style={styles.content}>
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={48} color="#A8A29A" />
          <Text style={styles.emptyTitle}>No screenshots in {selectedCat}</Text>
          <Text style={styles.emptySub}>
            Imported or shared screenshots will be saved here automatically.
          </Text>
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
  filterRow: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFECE4',
  },
  catChipActive: {
    backgroundColor: '#F5B031',
    borderColor: '#F5B031',
  },
  catText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6E6B65',
  },
  catTextActive: {
    color: '#1E1E1E',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EFECE4',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#8A867E',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
