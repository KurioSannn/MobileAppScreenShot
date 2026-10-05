import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Spacing, Typography } from '../theme/tokens';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  style?: ViewStyle;
}

export const SegmentedControl = <T extends string>({
  options,
  selectedValue,
  onSelect,
  style,
}: SegmentedControlProps<T>) => {
  const handleSelect = (val: T) => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    onSelect(val);
  };

  return (
    <View style={[styles.container, style]}>
      {options.map((item) => {
        const isSelected = selectedValue === item.value;
        return (
          <TouchableOpacity
            key={item.value}
            style={[styles.segment, isSelected && styles.segmentSelected]}
            activeOpacity={0.8}
            onPress={() => handleSelect(item.value)}
          >
            <Text
              style={[
                styles.label,
                isSelected && styles.labelSelected,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.pill,
    padding: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 44, // Minimum accessible touch target
    alignItems: 'center',
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  segmentSelected: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.textSecondary,
  },
  labelSelected: {
    color: '#1E1E1E',
    fontWeight: Typography.weight.bold,
  },
});
