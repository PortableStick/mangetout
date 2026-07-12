import { Pressable, View } from 'react-native';

import { Field } from '@/components/ui/Field';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

import { fieldsFor, type MetricKey, type MetricSetKey } from './metrics';

const numOf = (s: string) => Number.parseFloat(s.replace(',', '.')) || 0;

interface SetInputProps {
  metricSet: MetricSetKey;
  value: Partial<Record<MetricKey, number | string>>;
  onChange: (v: Partial<Record<MetricKey, number | string>>) => void;
}

/** Saisie d'une série générée depuis le preset `metricSet` (`fieldsFor`) : un champ numérique par
 * `MetricField` int/float/duration (clavier numérique), un sélecteur de puces pour les enums (`set_type`). */
export function SetInput({ metricSet, value, onChange }: SetInputProps) {
  const theme = useTheme();

  const setField = (key: MetricKey, v: number | string) => onChange({ ...value, [key]: v });

  /** Retire la clé (au lieu d'écrire 0) quand le champ numérique est vidé : sinon effacer un
   * champ optionnel borné (ex. `rpe` min 6) écrit une valeur hors bornes qui casse la série. */
  const clearField = (key: MetricKey) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };

  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {fieldsFor(metricSet).map((field) => {
        const current = value[field.key];

        if (field.kind === 'enum') {
          return (
            <View key={field.key} style={{ gap: 4 }}>
              <Text variant="footnote" color="textTertiary">
                {field.label}
              </Text>
              <View style={{ flexDirection: 'row', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
                {(field.options ?? []).map((opt) => {
                  const active = current === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setField(field.key, opt)}
                      accessibilityRole="button"
                      accessibilityLabel={`${field.label} : ${opt}`}
                      accessibilityState={{ selected: active }}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: theme.spacing.sm,
                        borderRadius: theme.radius.pill,
                        backgroundColor: active ? theme.colors.accent : theme.colors.surfaceMuted,
                      }}
                    >
                      <Text variant="footnote" color={active ? 'onAccent' : 'textSecondary'}>
                        {opt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        }

        return (
          <View key={field.key} style={{ gap: 4 }}>
            <Field
              value={current === undefined ? '' : String(current)}
              onChangeText={(text) => {
                if (text.trim() === '') {
                  clearField(field.key);
                  return;
                }
                const parsed = field.kind === 'float' ? numOf(text) : Math.round(numOf(text));
                setField(field.key, parsed);
              }}
              placeholder={field.label}
              keyboardType="numeric"
              accessibilityLabel={field.label}
              style={{ width: 74, paddingVertical: 8, textAlign: 'center' }}
            />
            <Text variant="footnote" color="textTertiary" style={{ textAlign: 'center' }}>
              {field.unit || field.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
