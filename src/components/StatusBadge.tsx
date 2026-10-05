import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../theme/tokens';

export type StatusType = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  status?: StatusType;
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  status = 'neutral',
  style,
}) => {
  const getColors = () => {
    switch (status) {
      case 'success':
        return { bg: Colors.successLight, text: Colors.success, dot: Colors.success };
      case 'warning':
        return { bg: Colors.warningLight, text: Colors.warning, dot: Colors.warning };
      case 'danger':
        return { bg: Colors.dangerLight, text: Colors.danger, dot: Colors.danger };
      case 'info':
        return { bg: Colors.infoLight, text: Colors.info, dot: Colors.info };
      case 'neutral':
      default:
        return { bg: Colors.surfaceSubtle, text: Colors.textSecondary, dot: Colors.textMuted };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]}>
      <View style={[styles.dot, { backgroundColor: colors.dot }]} />
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
    gap: Spacing.xs + 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
  },
});
