import { TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

interface FieldProps extends TextInputProps {
  label?: string;
}

/** Champ de saisie à la iOS (surface arrondie, label discret optionnel). */
export function Field({ label, style, ...props }: FieldProps) {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text variant="footnote" color="textTertiary">
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={theme.colors.textTertiary}
        style={[
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            paddingVertical: 14,
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
