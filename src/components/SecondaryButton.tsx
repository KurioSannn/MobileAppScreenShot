import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Spacing, Typography } from '../theme/tokens';

interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  label,
  onPress,
  icon,
  loading = false,
  disabled = false,
  style,
  textStyle,
  size = 'md',
}) => {
  const handlePress = () => {
    if (disabled || loading) return;
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    onPress();
  };

  const getHeight = () => {
    switch (size) {
      case 'sm':
        return 44; // Minimum accessible touch target
      case 'lg':
        return 56;
      default:
        return 48;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { minHeight: getHeight() },
        disabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.7}
      onPress={handlePress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={Colors.textPrimary} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text style={[styles.text, textStyle]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 44,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.textPrimary,
  },
  disabled: {
    backgroundColor: '#FAF8F5',
    borderColor: '#EFECE4',
    opacity: 0.6,
  },
});
