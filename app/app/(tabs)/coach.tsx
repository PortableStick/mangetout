import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
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
import { useTheme } from '@/theme/ThemeProvider';

interface Bubble extends ChatTurn {
  proposal?: { tool: string; args: unknown; summary: string };
}

export default function CoachScreen() {
  const theme = useTheme();
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

  return (
    <Screen scroll={false} padded={false}>
      <KeyboardAvoidingView
        style={{ flex: 1, gap: theme.spacing.md }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.xl,
            gap: theme.spacing.lg,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
        >
          <Text variant="largeTitle">Coach</Text>
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
                <Card
                  elevation={b.role === 'user' ? 'none' : 'sm'}
                  style={{
                    backgroundColor: b.role === 'user' ? theme.colors.accentMuted : theme.colors.surface,
                    maxWidth: '90%',
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
                </Card>
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
          }}
        >
          <View style={{ flex: 1 }}>
            <Field value={input} onChangeText={setInput} placeholder="Écris au coach…" multiline />
          </View>
          <Button label="Envoyer" loading={coach.isPending} disabled={!input.trim()} onPress={send} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
