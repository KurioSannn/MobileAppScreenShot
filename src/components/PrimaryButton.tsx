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

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      activeOpacity={0.85}
      onPress={handlePress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="#1E1E1E" size="small" />
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
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    minWidth: 44,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
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
    fontWeight: Typography.weight.bold,
    color: '#1E1E1E',
    letterSpacing: 0.1,
  },
  disabled: {
    backgroundColor: '#E5DFD5',
    shadowOpacity: 0,
    elevation: 0,
  },
});
