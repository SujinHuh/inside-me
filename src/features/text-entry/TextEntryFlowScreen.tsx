import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type {
  ConfirmedEmotion,
  DateKey,
  EmotionChoice,
  EmotionIntensity,
  EmotionNeedVocabulary,
  EntryDraft,
  EntryRepository,
  NeedChoice,
  VocabularyItem,
} from '@/src/core/contracts';
import type { SelfExplorationService } from '@/src/application/exploration/self-exploration-service';
import { borders, colors, spacing, typography, typeScale } from '@/src/ui/tokens';
import { WholeEmotionNeedsMap, type MapSectionId } from '../emotion-review/WholeEmotionNeedsMap';
import { AssistantExplorationPanel } from './AssistantExplorationPanel';
import { useAssistantExploration } from './useAssistantExploration';

type FlowStep = 'story' | 'emotions' | 'assistant-consent' | 'assistant-results' | 'confirm';
type FlowMessage = { kind: 'error' | 'success'; text: string };

interface TextEntryFlowScreenProps {
  dateKey: DateKey;
  repository: EntryRepository;
  selfExploration: Pick<SelfExplorationService, 'requestAssistantSuggestions'>;
  vocabulary: EmotionNeedVocabulary;
  initialDraft?: EntryDraft;
  onSaved?: () => void;
}

interface SelectedEmotion {
  choice: EmotionChoice;
  intensity: EmotionIntensity;
}

const intensityValues: readonly EmotionIntensity[] = [1, 2, 3, 4, 5];

function createUserAddedId(kind: 'emotion' | 'need', label: string): string {
  return `user-added-${kind}-${encodeURIComponent(label.normalize('NFKC').trim().toLocaleLowerCase('ko-KR'))}`;
}

function initialEmotions(draft?: EntryDraft): readonly SelectedEmotion[] {
  if (!draft) return [];
  const confirmed = draft.exploration.finalConfirmed.emotions;
  if (confirmed.status === 'confirmed') {
    return confirmed.items.map(({ intensity, ...choice }) => ({ choice, intensity }));
  }
  return draft.exploration.userSelected.emotions.map((choice) => ({ choice, intensity: 3 }));
}

function initialNeeds(draft?: EntryDraft): readonly NeedChoice[] {
  if (!draft) return [];
  const confirmed = draft.exploration.finalConfirmed.needs;
  return confirmed.status === 'confirmed' ? confirmed.items : draft.exploration.userSelected.needs;
}

function initialRepresentativeId(draft?: EntryDraft): string | null {
  const emotions = draft?.exploration.finalConfirmed.emotions;
  return emotions?.status === 'confirmed' ? emotions.representativeEmotionId : null;
}

function initialEmotionUnknown(draft?: EntryDraft): boolean {
  return draft?.exploration.finalConfirmed.emotions.status === 'unknown';
}

export function TextEntryFlowScreen({
  dateKey,
  repository,
  selfExploration,
  vocabulary,
  initialDraft,
  onSaved,
}: TextEntryFlowScreenProps) {
  const [step, setStep] = useState<FlowStep>('story');
  const [story, setStory] = useState(initialDraft?.story ?? '');
  const [emotions, setEmotions] = useState<readonly SelectedEmotion[]>(() => initialEmotions(initialDraft));
  const [needs, setNeeds] = useState<readonly NeedChoice[]>(() => initialNeeds(initialDraft));
  const [representativeEmotionId, setRepresentativeEmotionId] = useState<string | null>(() =>
    initialRepresentativeId(initialDraft),
  );
  const [emotionUnknown, setEmotionUnknown] = useState(() => initialEmotionUnknown(initialDraft));
  const [message, setMessage] = useState<FlowMessage | null>(null);
  const [saving, setSaving] = useState(false);
  const mounted = useRef(true);
  const saveInFlight = useRef(false);
  const scrollView = useRef<ScrollView>(null);
  const mapOffset = useRef(0);
  const mapSectionOffsets = useRef<Partial<Record<MapSectionId, number>>>({});
  const assistant = useAssistantExploration({ initialDraft, selfExploration });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const toggleVocabularyItem = (item: VocabularyItem) => {
    setMessage(null);
    if (item.kind === 'emotion') {
      const exists = emotions.some(({ choice }) => choice.id === item.id);
      if (exists) {
        removeEmotion(item.id);
      } else {
        setEmotionUnknown(false);
        assistant.selectEmotionManually(item.id);
        setEmotions((current) => [
          ...current,
          { choice: { id: item.id, kind: 'emotion', label: item.label, source: 'catalog' }, intensity: 3 },
        ]);
      }
      return;
    }

    const needExists = needs.some((choice) => choice.id === item.id);
    if (!needExists) assistant.selectNeedManually(item.id);
    setNeeds((current) => {
      return needExists
        ? current.filter((choice) => choice.id !== item.id)
        : [...current, { id: item.id, kind: 'need', label: item.label, source: 'catalog' }];
    });
  };

  function removeEmotion(id: string) {
    assistant.removeAcceptedEmotion(id);
    setRepresentativeEmotionId((current) => current === id ? null : current);
    setEmotions((current) => current.filter(({ choice }) => choice.id !== id));
    setMessage(null);
  }

  function removeNeed(id: string) {
    assistant.removeAcceptedNeed(id);
    setNeeds((current) => current.filter((choice) => choice.id !== id));
    setMessage(null);
  }

  const addCustomChoice = (kind: 'emotion' | 'need', label: string) => {
    const normalizedLabel = label.normalize('NFKC').trim().toLocaleLowerCase('ko-KR');
    const matchingCatalogItem = (kind === 'emotion'
      ? vocabulary.search({ kind: 'emotion', text: label })
      : vocabulary.search({ kind: 'need', text: label }))
      .find((item) => item.label.normalize('NFKC').trim().toLocaleLowerCase('ko-KR') === normalizedLabel);
    if (matchingCatalogItem) {
      const alreadySelected = matchingCatalogItem.kind === 'emotion'
        ? emotions.some(({ choice }) => choice.id === matchingCatalogItem.id)
        : needs.some((choice) => choice.id === matchingCatalogItem.id);
      if (!alreadySelected) toggleVocabularyItem(matchingCatalogItem);
      return;
    }
    const id = createUserAddedId(kind, label);
    if (kind === 'emotion') {
      setEmotionUnknown(false);
      setEmotions((current) =>
        current.some(({ choice }) => choice.id === id)
          ? current
          : [...current, { choice: { id, kind, label, source: 'user-added' }, intensity: 3 }],
      );
      return;
    }
    setNeeds((current) =>
      current.some((choice) => choice.id === id)
        ? current
        : [...current, { id, kind, label, source: 'user-added' }],
    );
  };

  const changeIntensity = (id: string, intensity: EmotionIntensity) => {
    setEmotions((current) =>
      current.map((selected) => selected.choice.id === id ? { ...selected, intensity } : selected),
    );
  };

  const addAssistantEmotion = (choice: EmotionChoice) => {
    if (emotions.some((selected) => selected.choice.id === choice.id)) return;
    setEmotionUnknown(false);
    setEmotions((current) => [...current, { choice: { ...choice }, intensity: 3 }]);
    assistant.acceptEmotion(choice.id);
    setMessage(null);
  };

  const addAssistantNeed = (choice: NeedChoice) => {
    if (needs.some((selected) => selected.id === choice.id)) return;
    setNeeds((current) => [...current, { ...choice }]);
    assistant.acceptNeed(choice.id);
    setMessage(null);
  };

  const requestAssistantSuggestions = async () => {
    if (assistant.requesting) return;
    setMessage(null);
    const result = await assistant.request({
      story,
      emotions: emotions.map(({ choice }) => choice),
      needs,
    });
    if (!result) return;
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error.safeMessage });
      return;
    }
    setStep('assistant-results');
  };

  const continueFromStory = () => {
    if (!story.trim()) {
      setMessage({ kind: 'error', text: '일기를 한 글자 이상 적어 주세요.' });
      return;
    }
    setMessage(null);
    setStep('emotions');
  };

  const continueToConfirm = () => {
    if (emotions.length === 0 && !emotionUnknown) {
      setMessage({ kind: 'error', text: '가까운 감정을 하나 이상 고르거나 아직 모르겠어요를 선택해 주세요.' });
      setStep('emotions');
      return;
    }
    setMessage(null);
    setStep('confirm');
  };

  const save = async () => {
    if (saveInFlight.current) return;

    if (!emotionUnknown && (
      !representativeEmotionId || !emotions.some(({ choice }) => choice.id === representativeEmotionId)
    )) {
      setMessage({ kind: 'error', text: '달력에서 먼저 보고 싶은 대표 감정을 골라 주세요.' });
      return;
    }

    const confirmedEmotions = emotions.map<ConfirmedEmotion>(({ choice, intensity }) => ({ ...choice, intensity }));
    const firstConfirmedEmotion = confirmedEmotions[0];
    if (!emotionUnknown && !firstConfirmedEmotion) {
      setMessage({ kind: 'error', text: '가까운 감정을 하나 이상 골라 주세요.' });
      return;
    }
    const draft: EntryDraft = {
      dateKey,
      inputMethod: 'text',
      story,
      exploration: {
        userExpressed: initialDraft?.exploration.userExpressed ?? [],
        userSelected: {
          emotions: emotions
            .filter(({ choice }) => !assistant.acceptedEmotionIds.has(choice.id))
            .map(({ choice }) => ({ ...choice })),
          needs: needs
            .filter((choice) => !assistant.acceptedNeedIds.has(choice.id))
            .map((choice) => ({ ...choice })),
        },
        aiSuggested: assistant.suggestions,
        finalConfirmed: {
          emotions: emotionUnknown
            ? { status: 'unknown' }
            : {
              status: 'confirmed',
              items: [firstConfirmedEmotion!, ...confirmedEmotions.slice(1)],
              representativeEmotionId: representativeEmotionId!,
            },
          needs: needs.length > 0
            ? { status: 'confirmed', items: [needs[0], ...needs.slice(1)] }
            : { status: 'unknown' },
        },
      },
      ...(initialDraft?.summary === undefined ? {} : { summary: initialDraft.summary }),
      ...(initialDraft?.nextAction === undefined ? {} : { nextAction: initialDraft.nextAction }),
    };

    saveInFlight.current = true;
    setSaving(true);
    setMessage(null);
    let result: Awaited<ReturnType<EntryRepository['save']>>;
    try {
      result = await repository.save(draft);
    } catch {
      if (mounted.current) {
        setMessage({
          kind: 'error',
          text: '기록을 저장하지 못했어요. 작성한 내용은 그대로 남아 있어요.',
        });
      }
      return;
    } finally {
      saveInFlight.current = false;
      if (mounted.current) setSaving(false);
    }
    if (!mounted.current) return;
    if (!result.ok) {
      setMessage({
        kind: 'error',
        text: result.error.safeMessage || '기록을 저장하지 못했어요.',
      });
      return;
    }
    setMessage({ kind: 'success', text: '기록을 이 기기에 저장했어요.' });
    onSaved?.();
  };

  const selectedEmotionIds = new Set(emotions.map(({ choice }) => choice.id));
  const selectedNeedIds = new Set(needs.map((choice) => choice.id));

  return (
    <KeyboardAvoidingView
      accessibilityLabel="글 기록과 감정 살펴보기"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <View style={styles.window}>
        <View style={styles.titleBar}>
          <Text accessibilityRole="header" style={styles.title}>{stepTitle(step)}</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          ref={scrollView}
        >
          {step === 'story' && (
            <>
              <Text style={styles.heading}>오늘 마음에 남은 일을 적어보세요.</Text>
              <Text style={styles.description}>정답은 없어요. 적은 내용은 다음 단계에서도 그대로 남아 있어요.</Text>
              <TextInput
                accessibilityLabel="오늘의 이야기"
                multiline
                onChangeText={(value) => { setStory(value); setMessage(null); }}
                placeholder="오늘 있었던 일을 자유롭게 적어 보세요."
                style={styles.storyInput}
                textAlignVertical="top"
                value={story}
              />
              <PrimaryButton label="감정 살펴보기" onPress={continueFromStory} />
            </>
          )}

          {step === 'emotions' && (
            <>
              <Text style={styles.heading}>전체 지도에서 내 마음을 찾아보세요.</Text>
              <Text style={styles.description}>충족·미충족 느낌과 욕구 8개 영역을 한 번에 보고 서로 다른 곳에서 여러 개를 골라도 돼요.</Text>
              <WholeEmotionNeedsMap
                onAdd={addCustomChoice}
                onToggle={toggleVocabularyItem}
                selectedEmotionIds={selectedEmotionIds}
                selectedNeedIds={selectedNeedIds}
                vocabulary={vocabulary}
                emotionUnknown={emotionUnknown}
                onToggleEmotionUnknown={() => {
                  if (emotionUnknown) {
                    setEmotionUnknown(false);
                    setMessage(null);
                    return;
                  }
                  for (const selected of emotions) assistant.removeAcceptedEmotion(selected.choice.id);
                  setEmotions([]);
                  setRepresentativeEmotionId(null);
                  setEmotionUnknown(true);
                  setMessage(null);
                }}
                onJumpToSection={(sectionId) => {
                  const sectionOffset = mapSectionOffsets.current[sectionId];
                  if (sectionOffset === undefined) return;
                  scrollView.current?.scrollTo({
                    animated: true,
                    y: Math.max(0, mapOffset.current + sectionOffset - spacing.sm),
                  });
                }}
                onMapLayout={(event) => { mapOffset.current = event.nativeEvent.layout.y; }}
                onSectionLayout={(sectionId, event) => {
                  mapSectionOffsets.current[sectionId] = event.nativeEvent.layout.y;
                }}
              />
              {emotions.map(({ choice, intensity }) => (
                <View key={choice.id} style={styles.intensityRow}>
                  <View style={styles.selectionHeadingRow}>
                    <Text style={styles.intensityLabel}>{choice.label} 강도 {intensity}</Text>
                    <Pressable
                      accessibilityLabel={`${choice.label} 감정 선택 해제`}
                      accessibilityRole="button"
                      onPress={() => removeEmotion(choice.id)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeButtonText}>해제</Text>
                    </Pressable>
                  </View>
                  <View accessibilityLabel={`${choice.label} 강도 선택`} style={styles.intensityButtons}>
                    {intensityValues.map((value) => (
                      <Pressable
                        accessibilityLabel={`${choice.label} 강도 ${value}`}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: intensity === value }}
                        key={value}
                        onPress={() => changeIntensity(choice.id, value)}
                        style={[styles.intensityButton, intensity === value && styles.intensityButtonSelected]}
                      >
                        <Text style={styles.intensityButtonText}>{value}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
              {needs.length > 0 && (
                <View accessibilityLabel="선택한 욕구" style={styles.selectedNeeds}>
                  {needs.map((need) => (
                    <View key={need.id} style={styles.selectionHeadingRow}>
                      <Text style={styles.intensityLabel}>{need.label}</Text>
                      <Pressable
                        accessibilityLabel={`${need.label} 욕구 선택 해제`}
                        accessibilityRole="button"
                        onPress={() => removeNeed(need.id)}
                        style={styles.removeButton}
                      >
                        <Text style={styles.removeButtonText}>해제</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
              <SecondaryButton label="글 다시 보기" onPress={() => setStep('story')} />
              <SecondaryButton
                label="AI와 더 살펴보기"
                onPress={() => { setMessage(null); setStep('assistant-consent'); }}
              />
              <PrimaryButton
                label="내 선택으로 확인하기"
                onPress={continueToConfirm}
              />
            </>
          )}

          {step === 'assistant-consent' && (
            <>
              <AssistantExplorationPanel
                mode="consent"
                onAddEmotion={addAssistantEmotion}
                onAddNeed={addAssistantNeed}
                selectedEmotionIds={selectedEmotionIds}
                selectedNeedIds={selectedNeedIds}
                suggestions={assistant.suggestions}
              />
              <SecondaryButton
                disabled={assistant.requesting}
                label="마음 지도로 돌아가기"
                onPress={() => { setMessage(null); setStep('emotions'); }}
              />
              <SecondaryButton
                disabled={assistant.requesting}
                label="내 선택으로 계속하기"
                onPress={continueToConfirm}
              />
              <PrimaryButton
                disabled={assistant.requesting}
                label={assistant.requesting ? '후보 확인 중' : '안내 확인하고 후보 보기'}
                onPress={() => { void requestAssistantSuggestions(); }}
              />
            </>
          )}

          {step === 'assistant-results' && (
            <>
              <AssistantExplorationPanel
                mode="results"
                onAddEmotion={addAssistantEmotion}
                onAddNeed={addAssistantNeed}
                selectedEmotionIds={selectedEmotionIds}
                selectedNeedIds={selectedNeedIds}
                suggestions={assistant.suggestions}
              />
              <SecondaryButton label="마음 지도 다시 보기" onPress={() => setStep('emotions')} />
              <PrimaryButton
                label="선택한 내용 확인하기"
                onPress={continueToConfirm}
              />
            </>
          )}

          {step === 'confirm' && (
            <>
              <Text style={styles.heading}>
                {emotionUnknown ? '아직 모르는 마음으로 저장할까요?' : '달력에서 먼저 볼 대표 감정을 골라 주세요.'}
              </Text>
              <Text style={styles.description}>
                {emotionUnknown
                  ? '지금 이름 붙이지 못해도 괜찮아요. 기록을 다시 열어 나중에 감정을 고칠 수 있어요.'
                  : '대표 감정은 하루를 판정하는 점수가 아니라, 나중에 먼저 떠올리고 싶은 표시예요.'}
              </Text>
              {emotions.map(({ choice, intensity }) => (
                <Pressable
                  accessibilityLabel={`${choice.label}: 대표 감정으로 선택`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: representativeEmotionId === choice.id }}
                  key={choice.id}
                  onPress={() => { setRepresentativeEmotionId(choice.id); setEmotionUnknown(false); setMessage(null); }}
                  style={[styles.reviewChoice, representativeEmotionId === choice.id && styles.reviewChoiceSelected]}
                >
                  <Text style={styles.choiceText}>{choice.label} · 강도 {intensity}</Text>
                </Pressable>
              ))}
              <Text style={styles.summaryText}>선택한 욕구: {needs.length ? needs.map((need) => need.label).join(', ') : '아직 모르겠어요'}</Text>
              <SecondaryButton label="마음 지도 다시 보기" onPress={() => setStep('emotions')} />
              <PrimaryButton disabled={saving} label={saving ? '저장 중' : '이 내용으로 저장'} onPress={save} />
            </>
          )}

          {message && (
            <View
              accessibilityLiveRegion="assertive"
              accessibilityRole={message.kind === 'success' ? 'summary' : 'alert'}
              style={styles.messagePanel}
            >
              <Text style={styles.messageText}>{message.text}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function stepTitle(step: FlowStep): string {
  switch (step) {
    case 'story': return '글로 기록하기';
    case 'emotions': return '한 장 마음 지도';
    case 'assistant-consent': return 'AI 도움 확인';
    case 'assistant-results': return 'AI 보조 후보';
    case 'confirm': return '내 선택 확인하기';
  }
}

interface FlowButtonProps { label: string; onPress: () => void; disabled?: boolean }

function PrimaryButton({ label, onPress, disabled = false }: FlowButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, disabled && styles.buttonDisabled, pressed && styles.buttonPressed]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress, disabled = false }: FlowButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryButton, disabled && styles.buttonDisabled, pressed && styles.buttonPressed]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.72 },
  buttonText: { color: colors.text, fontSize: typeScale.body, fontWeight: typography.statusWeight, textAlign: 'center' },
  choiceText: { color: colors.text, fontSize: typeScale.body, fontWeight: typography.statusWeight },
  content: { gap: spacing.lg, padding: spacing.xl },
  description: { color: colors.textMuted, fontSize: typeScale.body, lineHeight: typeScale.bodyLineHeight },
  heading: { color: colors.text, fontSize: typeScale.heading, fontWeight: typography.headingWeight, lineHeight: typeScale.headingLineHeight },
  intensityButton: { alignItems: 'center', backgroundColor: colors.button, borderColor: colors.panelBorder, borderWidth: borders.panel, justifyContent: 'center', minHeight: 44, minWidth: 44 },
  intensityButtonSelected: { backgroundColor: '#b9c9e3', borderColor: colors.titleBar, borderWidth: borders.button },
  intensityButtonText: { color: colors.text, fontSize: typeScale.body, fontWeight: typography.statusWeight },
  intensityButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  intensityLabel: { color: colors.text, fontSize: typeScale.body, fontWeight: typography.statusWeight },
  intensityRow: { backgroundColor: colors.panel, borderColor: colors.panelBorder, borderWidth: borders.panel, gap: spacing.sm, padding: spacing.md },
  messagePanel: { backgroundColor: '#fff7d6', borderColor: colors.windowBorder, borderWidth: borders.panel, padding: spacing.md },
  messageText: { color: colors.text, fontSize: typeScale.body, lineHeight: typeScale.bodyLineHeight },
  primaryButton: { backgroundColor: colors.button, borderBottomColor: colors.buttonShadow, borderLeftColor: colors.buttonHighlight, borderRightColor: colors.buttonShadow, borderTopColor: colors.buttonHighlight, borderWidth: borders.button, minHeight: 48, padding: spacing.md },
  removeButton: { alignItems: 'center', borderColor: colors.panelBorder, borderWidth: borders.panel, justifyContent: 'center', minHeight: 44, minWidth: 56, paddingHorizontal: spacing.sm },
  removeButtonText: { color: colors.textMuted, fontSize: typeScale.status, fontWeight: typography.statusWeight },
  reviewChoice: { backgroundColor: colors.panel, borderColor: colors.panelBorder, borderWidth: borders.panel, minHeight: 48, padding: spacing.md },
  reviewChoiceSelected: { backgroundColor: '#dce7d7', borderColor: colors.status, borderWidth: borders.button },
  screen: { backgroundColor: colors.canvas, flex: 1, padding: spacing.md },
  secondaryButton: { backgroundColor: colors.window, borderColor: colors.buttonShadow, borderWidth: borders.panel, minHeight: 48, padding: spacing.md },
  selectedNeeds: { backgroundColor: colors.panel, borderColor: colors.panelBorder, borderWidth: borders.panel, gap: spacing.sm, padding: spacing.md },
  selectionHeadingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  storyInput: { backgroundColor: colors.panel, borderColor: colors.panelBorder, borderWidth: borders.button, color: colors.text, fontSize: typeScale.body, lineHeight: typeScale.bodyLineHeight, minHeight: 180, padding: spacing.md },
  summaryText: { color: colors.text, fontSize: typeScale.body, lineHeight: typeScale.bodyLineHeight },
  title: { color: colors.titleText, fontSize: typeScale.title, fontWeight: typography.titleWeight, letterSpacing: typography.titleLetterSpacing },
  titleBar: { backgroundColor: colors.titleBar, borderBottomColor: colors.windowBorder, borderBottomWidth: borders.window, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  window: { backgroundColor: colors.window, borderColor: colors.windowBorder, borderWidth: borders.window, flex: 1, maxWidth: 640, width: '100%', alignSelf: 'center' },
});
