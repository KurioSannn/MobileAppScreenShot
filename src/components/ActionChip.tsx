import React from 'react';
import {
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Spacing, Typography } from '../theme/tokens';

interface ActionChipProps {
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  selected?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const ActionChip: React.FC<ActionChipProps> = ({
  label,
  icon,
  onPress,
  selected = false,
  style,
  textStyle,
}) => {
  const handlePress = () => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    onPress();
  };

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && styles.chipSelected,
        style,
      ]}
      activeOpacity={0.75}
      onPress={handlePress}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text
        style={[
          styles.text,
          selected && styles.textSelected,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    minHeight: 44, // Minimum accessible touch target
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs + 2,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.textPrimary,
  },
  textSelected: {
    color: '#1E1E1E',
    fontWeight: Typography.weight.bold,
  },
});
