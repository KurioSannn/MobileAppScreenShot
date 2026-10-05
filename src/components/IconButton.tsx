import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Radius } from '../theme/tokens';

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  size?: number; // default 44
  variant?: 'surface' | 'ghost' | 'primary' | 'subtle';
  style?: ViewStyle;
  disabled?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 44, // Guarantees 44x44 minimum touch target
  variant = 'surface',
  style,
  disabled = false,
}) => {
  const handlePress = () => {
    if (disabled) return;
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    onPress();
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: Colors.primary,
          borderWidth: 0,
        };
      case 'subtle':
        return {
          backgroundColor: Colors.surfaceSubtle,
          borderWidth: 1,
          borderColor: Colors.borderLight,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      case 'surface':
      default:
        return {
          backgroundColor: Colors.surface,
          borderWidth: 1,
          borderColor: Colors.borderLight,
        };
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          width: Math.max(44, size),
          height: Math.max(44, size),
          borderRadius: Math.max(44, size) / 2,
        },
        getVariantStyle(),
        disabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.7}
      onPress={handlePress}
      disabled={disabled}
    >
      {icon}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  disabled: {
    opacity: 0.5,
  },
});
