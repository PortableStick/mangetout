import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

interface FieldProps extends TextInputProps {
  label?: string;
}

/** Champ de saisie à la iOS (surface arrondie, label discret optionnel, anneau accent au focus). */
export function Field({ label, style, onFocus, onBlur, ...props }: FieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const handleFocus: NonNullable<TextInputProps['onFocus']> = (e) => {
    setFocused(true);
    onFocus?.(e);
  };
  const handleBlur: NonNullable<TextInputProps['onBlur']> = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text variant="footnote" color="textTertiary">
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={theme.colors.textTertiary}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            borderWidth: focused ? 2 : 1,
            borderColor: focused ? theme.colors.accent : theme.colors.separator,
            paddingVertical: focused ? 13 : 14,
            paddingHorizontal: theme.spacing.lg,
            color: theme.colors.text,
            fontFamily: theme.typography.body.fontFamily,
            fontSize: theme.typography.body.fontSize,
          },
          style,
        ]}
        {...props}
      />
    </View>
  );
}
