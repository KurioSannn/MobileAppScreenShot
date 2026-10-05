import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const SearchScreen: React.FC = () => {
  const [query, setQuery] = useState('');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>Find screenshots by OCR text or translation</Text>
      </View>

      {/* Search Input Bar */}
      <View style={styles.inputContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#8A867E" />
          <TextInput
            style={styles.input}
            placeholder="Search keywords, e.g. 'deadline', 'manga'..."
            placeholderTextColor="#9E9B93"
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color="#8A867E" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results or Empty State */}
      <View style={styles.content}>
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={44} color="#A8A29A" />
          <Text style={styles.emptyTitle}>
            {query ? `No results for "${query}"` : 'Type to search screenshots'}
          </Text>
          <Text style={styles.emptySub}>
            Snaply performs full-text search across all extracted OCR texts and translations.
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
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: '#EFECE4',
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1E1E1E',
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
