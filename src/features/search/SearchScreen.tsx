import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card, StatusBadge } from '../../components';
import { Colors, Radius, Spacing, Typography } from '../../theme/tokens';
import { screenshotRepository } from '../../db';
import { ScreenshotRow, ScreenshotWithDetails } from '../../types';
import { HighlightedText } from './HighlightedText';
import { getMatchInfo } from './searchUtils';

const QUICK_SUGGESTIONS = ['Manga', 'Receipt', 'Assignment', 'Chat', 'Product', 'Deadline'];

export interface SearchScreenProps {
  onSelectScreenshot?: (screenshot: ScreenshotRow) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ onSelectScreenshot }) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<ScreenshotWithDetails[]>([]);
  const [loading, setLoading] = useState(false);

  // Fast 250ms debounce for lag-free typing performance
  useEffect(() => {
    if (!query.trim()) {
      setDebouncedQuery('');
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Execute offline full-text search against SQLite
  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }

    let isCurrent = true;
    setLoading(true);

    screenshotRepository
      .searchScreenshots(debouncedQuery)
      .then((items) => {
        if (isCurrent) {
          setResults(items);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Search query failed:', err);
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [debouncedQuery]);

  const handleSelectScreenshot = (item: ScreenshotWithDetails) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    onSelectScreenshot?.(item);
  };

  const handleSuggestionPress = (suggestion: string) => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    setQuery(suggestion);
  };

  const handleClear = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
    setQuery('');
    setDebouncedQuery('');
    setResults([]);
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderItem = ({ item }: { item: ScreenshotWithDetails }) => {
    const match = getMatchInfo(item, debouncedQuery);

    return (
      <Card
        variant="surface"
        style={styles.resultCard}
        padding={Spacing.md}
        onPress={() => handleSelectScreenshot(item)}
      >
        <View style={styles.cardRow}>
          {/* Thumbnail preview */}
          <View style={styles.thumbWrapper}>
            {item.image_uri ? (
              <Image
                source={{ uri: item.image_uri }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.thumbPlaceholder}>
                <Ionicons name="image-outline" size={28} color={Colors.textMuted} />
              </View>
            )}
          </View>

          {/* Details Column */}
          <View style={styles.detailsCol}>
            {/* Header badges */}
            <View style={styles.badgeRow}>
              <StatusBadge
                label={item.category}
                status={item.category === 'Manga' ? 'info' : 'neutral'}
              />
              <View style={styles.matchTypePill}>
                <Text style={styles.matchTypeLabel}>{match.label}</Text>
              </View>
              {item.language && (
                <View style={styles.langPill}>
                  <Ionicons name="globe-outline" size={10} color={Colors.textSecondary} />
                  <Text style={styles.langText}>{item.language.toUpperCase()}</Text>
                </View>
              )}
            </View>

            {/* Date and reminders */}
            <View style={styles.metaRow}>
              <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
              {item.reminder_count && item.reminder_count > 0 ? (
                <View style={styles.reminderBadge}>
                  <Ionicons name="alarm-outline" size={12} color={Colors.pastelHoneyIcon} />
                  <Text style={styles.reminderCount}>{item.reminder_count}</Text>
                </View>
              ) : null}
            </View>

            {/* Highlighted Match Snippet */}
            <HighlightedText
              text={match.snippet}
              keyword={debouncedQuery}
              style={styles.snippetText}
              numberOfLines={2}
            />

            {/* Tags Pills */}
            {item.tags && item.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {item.tags.map((tag, idx) => (
                  <View key={idx} style={styles.tagPill}>
                    <HighlightedText
                      text={`#${tag}`}
                      keyword={debouncedQuery}
                      style={styles.tagText}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Forward Arrow */}
          <View style={styles.arrowCol}>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>
          Find screenshots by OCR text, translation, tags, or category
        </Text>
      </View>

      {/* Search Input Bar */}
      <View style={styles.inputContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Type keywords, e.g. 'deadline', 'manga'..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
          {loading && (
            <ActivityIndicator size="small" color={Colors.primary} style={styles.inputSpinner} />
          )}
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Suggestions Chips */}
      <View style={styles.suggestionsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsScroll}
        >
          {QUICK_SUGGESTIONS.map((suggestion) => {
            const isActive = query.toLowerCase() === suggestion.toLowerCase();
            return (
              <TouchableOpacity
                key={suggestion}
                style={[styles.suggestionChip, isActive && styles.suggestionChipActive]}
                onPress={() => handleSuggestionPress(suggestion)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.suggestionText, isActive && styles.suggestionTextActive]}
                >
                  {suggestion}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results Header */}
      {debouncedQuery.length > 0 && !loading && (
        <View style={styles.resultsInfoRow}>
          <Text style={styles.resultsInfoText}>
            Found {results.length} {results.length === 1 ? 'match' : 'matches'} for "{debouncedQuery}"
          </Text>
        </View>
      )}

      {/* Content Area */}
      {debouncedQuery.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="search-outline" size={38} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Full-Text Screenshot Search</Text>
          <Text style={styles.emptySub}>
            Search offline across all your screenshots by any text, translated phrase, category, or note.
          </Text>
        </View>
      ) : results.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="alert-circle-outline" size={38} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No matches found</Text>
          <Text style={styles.emptySub}>
            No screenshots found containing "{debouncedQuery}". Try another keyword or category.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.heavy,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  inputContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  inputSpinner: {
    marginRight: 4,
  },
  suggestionsContainer: {
    paddingBottom: Spacing.xs,
  },
  suggestionsScroll: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xs + 2,
  },
  suggestionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestionChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  suggestionText: {
    fontSize: Typography.size.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  suggestionTextActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  resultsInfoRow: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  resultsInfoText: {
    fontSize: Typography.size.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xs,
    paddingBottom: 100, // Space for bottom tab bar
    gap: Spacing.md,
  },
  resultCard: {
    backgroundColor: Colors.surface,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  thumbWrapper: {
    width: 68,
    height: 92,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCol: {
    flex: 1,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  matchTypePill: {
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  matchTypeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dateText: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFF8E7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  reminderCount: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.pastelHoneyIcon,
  },
  snippetText: {
    fontSize: Typography.size.xs,
    color: Colors.textPrimary,
    lineHeight: 18,
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  tagPill: {
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  tagText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  arrowCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 80,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
