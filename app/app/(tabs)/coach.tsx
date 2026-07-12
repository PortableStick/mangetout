import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { IconButton } from '@/components/ui/IconButton';
import { Markdown } from '@/components/ui/Markdown';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { env } from '@/config/env';
import {
  useApplyAction,
  useCoach,
  type ChatTurn,
  type CoachResult,
} from '@/features/ai/useAi';
import { CoachCore } from '@/features/coach3d/CoachRig';
import { useTheme } from '@/theme/ThemeProvider';
import { withAlpha } from '@/theme/tokens';

interface Bubble extends ChatTurn {
  proposal?: { tool: string; args: unknown; summary: string };
}

export default function CoachScreen() {
  const theme = useTheme();
  const router = useRouter();
  const coach = useCoach();
  const apply = useApplyAction();
  const [input, setInput] = useState('');
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  function scrollToEnd() {
    scrollRef.current?.scrollToEnd({ animated: true });
  }

  if (!env.aiEnabled) {
    return (
      <PlaceholderScreen
        title="Coach"
        icon="sparkles-outline"
        subtitle="Le coach IA est désactivé (AI_ENABLED)."
      />
    );
  }

  function send() {
    const text = input.trim();
    if (!text) return;
    const next: Bubble[] = [...bubbles, { role: 'user', content: text }];
    setBubbles(next);
    setInput('');
    scrollToEnd();
    coach.mutate(next.map((b) => ({ role: b.role, content: b.content })), {
      onSuccess: (res: CoachResult) => {
        if (res.type === 'message') {
          setBubbles((b) => [...b, { role: 'assistant', content: res.text }]);
        } else if (res.type === 'proposal') {
          setBubbles((b) => [...b, { role: 'assistant', content: res.summary, proposal: res }]);
        } else {
          setBubbles((b) => [...b, { role: 'assistant', content: `Erreur : ${res.error}` }]);
        }
        scrollToEnd();
      },
      onError: (e) => {
        setBubbles((b) => [
          ...b,
          { role: 'assistant', content: e instanceof Error ? e.message : 'Erreur coach' },
        ]);
        scrollToEnd();
      },
    });
  }

  function confirm(index: number, proposal: NonNullable<Bubble['proposal']>) {
    apply.mutate(
      { tool: proposal.tool, args: proposal.args },
      {
        onSuccess: (res) => {
          setBubbles((b) => {
            const copy = [...b];
            copy[index] = { ...copy[index]!, proposal: undefined };
            return [
              ...copy,
              { role: 'assistant', content: res.ok ? '✓ C’est fait.' : `Échec : ${res.error ?? ''}` },
            ];
          });
        },
      }
    );
  }

  const canSend = input.trim().length > 0 && !coach.isPending;

  return (
    <Screen scroll={false} padded={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Hero — bandeau du coach. Rig 3D procédural (M24) : idle en `brief`, accéléré/teinté warn en `thinking`. */}
        <View
          style={{
            height: 200,
            position: 'relative',
            overflow: 'hidden',
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.separator,
            backgroundColor: theme.colors.background,
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '70%',
              backgroundColor: theme.colors.accentMuted,
            }}
          />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <CoachCore state={coach.isPending ? 'thinking' : 'brief'} height={200} />
          </View>
          <View
            style={{
              position: 'absolute',
              left: theme.spacing.lg,
              bottom: theme.spacing.md,
            }}
          >
            <Text variant="label" color="accent">
              {coach.isPending ? 'Analyse…' : 'Coach · en ligne'}
            </Text>
            <Text variant="display" style={{ marginTop: theme.spacing.xs }}>
              Brief de séance
            </Text>
          </View>
          <View
            style={{
              position: 'absolute',
              right: theme.spacing.lg,
              bottom: theme.spacing.md,
            }}
          >
            <IconButton
              name="barbell-outline"
              tone="neutral"
              accessibilityLabel="Bibliothèque de gestes"
              onPress={() => router.push('/moves')}
            />
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.xl,
            paddingVertical: theme.spacing.lg,
            gap: theme.spacing.md,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
        >
          {bubbles.length === 0 ? (
            <Card>
              <Text variant="headline">Pose-moi une question</Text>
              <Text variant="subhead" color="textSecondary">
                « Il me reste combien de protéines ? », « note ma pesée à 78 kg », « propose un snack à 200
                kcal riche en protéines ».
              </Text>
            </Card>
          ) : (
            bubbles.map((b, i) => (
              <View key={i} style={{ alignItems: b.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <View
                  style={{
                    maxWidth: '85%',
                    backgroundColor: b.role === 'user' ? theme.colors.accentMuted : theme.colors.surface,
                    borderWidth: 1,
                    borderColor:
                      b.role === 'user' ? withAlpha(theme.colors.accent, 0.25) : theme.colors.separator,
                    borderRadius: theme.radius.md,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    gap: theme.spacing.sm,
                  }}
                >
                  {b.role === 'assistant' ? (
                    <Markdown>{b.content}</Markdown>
                  ) : (
                    <Text variant="body">{b.content}</Text>
                  )}
                  {b.proposal ? (
                    <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
                      <Text variant="footnote" color="textTertiary">
                        Cette action sera appliquée seulement après ta confirmation.
                      </Text>
                      <Button
                        label="Confirmer"
                        loading={apply.isPending}
                        onPress={() => confirm(i, b.proposal!)}
                      />
                    </View>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.sm,
            alignItems: 'flex-end',
            paddingHorizontal: theme.spacing.xl,
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing.lg,
            borderTopWidth: 1,
            borderTopColor: theme.colors.separator,
          }}
        >
          <View style={{ flex: 1 }}>
            <Field
              value={input}
              onChangeText={setInput}
              placeholder="Pose ta question au coach"
              multiline
              style={{
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radius.sm,
              }}
            />
          </View>
          <View style={{ opacity: canSend ? 1 : 0.5 }} pointerEvents={canSend ? 'auto' : 'none'}>
            <IconButton name="send" tone="accent" accessibilityLabel="Envoyer" onPress={send} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
