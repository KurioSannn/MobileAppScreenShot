import React from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import { Colors } from '../../theme/tokens';

export interface HighlightedTextProps {
  text: string;
  keyword: string;
  style?: TextStyle;
  highlightStyle?: TextStyle;
  numberOfLines?: number;
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  keyword,
  style,
  highlightStyle,
  numberOfLines,
}) => {
  const cleanKeyword = keyword?.trim();

  if (!cleanKeyword || !text) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  // Escape special regex characters safely
  const escaped = cleanKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === cleanKeyword.toLowerCase();
        if (isMatch) {
          return (
            <Text key={index} style={[styles.highlight, highlightStyle]}>
              {part}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
};

const styles = StyleSheet.create({
  highlight: {
    backgroundColor: '#FFE6AC', // Warm Honey highlight token
    color: '#7A4B00',           // Deep contrasting amber text
    fontWeight: '700',
    borderRadius: 3,
  },
});
