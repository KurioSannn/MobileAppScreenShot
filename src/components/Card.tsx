import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Spacing } from '../theme/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'surface' | 'subtle' | 'primary' | 'peach' | 'lavender' | 'mint' | 'honey';
  padding?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'surface',
  padding = Spacing.lg,
}) => {
  const getBgColor = () => {
    switch (variant) {
      case 'primary':
        return Colors.primary;
      case 'subtle':
        return Colors.surfaceSubtle;
      case 'peach':
        return Colors.pastelPeach;
      case 'lavender':
        return Colors.pastelLavender;
      case 'mint':
        return Colors.pastelMint;
      case 'honey':
        return Colors.pastelHoney;
      case 'surface':
      default:
        return Colors.surface;
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor: getBgColor(),
    padding,
    borderRadius: Radius.card,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.base, cardStyle, styles.shadow, style]}
        activeOpacity={0.85}
        onPress={() => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch (_) {}
          onPress();
        }}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.base, cardStyle, styles.shadow, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
});
