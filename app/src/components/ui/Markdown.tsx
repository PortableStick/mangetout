import { Platform, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { parseMarkdown, type MdBlock, type Span } from '@/features/ai/markdown';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamily, type TypographyVariant } from '@/theme/tokens';

/** Variante typo par niveau de titre — reste dans l'échelle existante, n'en crée pas. */
const HEADING_VARIANT: Record<1 | 2 | 3, TypographyVariant> = {
  1: 'title3',
  2: 'headline',
  3: 'headline',
};

const CODE_FONT = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

/** Rend une ligne de spans inline (texte/gras/italique/code) dans un `Text` conteneur unique. */
function SpansLine({
  spans,
  variant,
  prefix,
}: {
  spans: Span[];
  variant: TypographyVariant;
  prefix?: string;
}) {
  const theme = useTheme();
  return (
    <Text variant={variant}>
      {prefix ? <Text variant={variant}>{prefix}</Text> : null}
      {spans.map((span, i) => {
        switch (span.t) {
          case 'bold':
            return (
              <Text key={i} variant={variant} style={{ fontFamily: fontFamily.semibold }}>
                {span.s}
              </Text>
            );
          case 'italic':
            return (
              <Text key={i} variant={variant} style={{ fontStyle: 'italic' }}>
                {span.s}
              </Text>
            );
          case 'code':
            return (
              <Text
                key={i}
                variant={variant}
                style={{
                  fontFamily: CODE_FONT,
                  backgroundColor: theme.colors.surfaceMuted,
                  paddingHorizontal: theme.spacing.xs,
                }}
              >
                {span.s}
              </Text>
            );
          case 'text':
          default:
            return (
              <Text key={i} variant={variant}>
                {span.s}
              </Text>
            );
        }
      })}
    </Text>
  );
}

function Block({ block }: { block: MdBlock }) {
  const theme = useTheme();

  switch (block.type) {
    case 'h':
      return <SpansLine spans={block.spans} variant={HEADING_VARIANT[block.level]} />;
    case 'ul':
      return (
        <View style={{ gap: theme.spacing.xs }}>
          {block.items.map((item, i) => (
            <SpansLine key={i} spans={item} variant="body" prefix="• " />
          ))}
        </View>
      );
    case 'ol':
      return (
        <View style={{ gap: theme.spacing.xs }}>
          {block.items.map((item, i) => (
            <SpansLine key={i} spans={item} variant="body" prefix={`${i + 1}. `} />
          ))}
        </View>
      );
    case 'p':
    default:
      return <SpansLine spans={block.spans} variant="body" />;
  }
}

/** Rend le markdown (sous-ensemble coach) avec le kit `Text` du thème — aucune couleur en dur. */
export function Markdown({ children }: { children: string }) {
  const theme = useTheme();
  const blocks = parseMarkdown(children);

  return (
    <View style={{ gap: theme.spacing.xs }}>
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </View>
  );
}
