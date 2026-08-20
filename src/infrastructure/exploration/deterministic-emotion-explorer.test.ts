import { InMemoryEmotionNeedVocabulary } from '../../core/vocabulary/in-memory-emotion-need-vocabulary';
import { INITIAL_VOCABULARY } from '../../core/vocabulary/seed';
import { DeterministicEmotionExplorer } from './deterministic-emotion-explorer';

const vocabulary = new InMemoryEmotionNeedVocabulary(INITIAL_VOCABULARY);

describe('DeterministicEmotionExplorer', () => {
  it('사용자가 이미 고른 항목을 다시 제안하거나 선택값을 바꾸지 않는다', async () => {
    const explorer = new DeterministicEmotionExplorer(vocabulary);
    const userSelected = {
      emotions: [{ id: 'emotion-hurt', kind: 'emotion' as const, label: '서운한', source: 'catalog' as const }],
      needs: [],
    };

    const result = await explorer.suggest({
      story: '기대했던 말을 듣지 못해서 서운했어요.',
      userSelected,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.emotions).toEqual([]);
    expect(result.value.needs.map((suggestion) => suggestion.choice.id)).toEqual(['need-respect']);
    expect(userSelected.emotions.map((choice) => choice.id)).toEqual(['emotion-hurt']);
  });

  it('여러 단서가 있어도 종류별 후보를 세 개 이하로 제한하고 중복을 제거한다', async () => {
    const explorer = new DeterministicEmotionExplorer(vocabulary);

    const result = await explorer.suggest({
      story: '외롭고 불안해서 걱정됐고 피곤해서 쉬고 싶은데 억울하고 화도 났어요.',
      userSelected: { emotions: [], needs: [] },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.emotions).toHaveLength(3);
    expect(result.value.needs).toHaveLength(3);
    expect(new Set(result.value.emotions.map((suggestion) => suggestion.choice.id)).size).toBe(3);
    expect(new Set(result.value.needs.map((suggestion) => suggestion.choice.id)).size).toBe(3);
  });

  it('단서가 없으면 사용자의 감정을 임의로 만들어내지 않는다', async () => {
    const explorer = new DeterministicEmotionExplorer(vocabulary);

    await expect(
      explorer.suggest({ story: '오늘 있었던 일을 적었어요.', userSelected: { emotions: [], needs: [] } }),
    ).resolves.toEqual({ ok: true, value: { emotions: [], needs: [] } });
  });

  it.each(['대화', '평화', '영화', '화창', '변화'])('%s에 포함된 글자만으로 화와 억울함을 추론하지 않는다', async (word) => {
    const explorer = new DeterministicEmotionExplorer(vocabulary);

    const result = await explorer.suggest({
      story: `오늘은 ${word}라는 표현을 썼어요.`,
      userSelected: { emotions: [], needs: [] },
    });

    expect(result).toEqual({ ok: true, value: { emotions: [], needs: [] } });
  });

  it('화가 났다는 명시적 표현에서만 보조 후보를 만든다', async () => {
    const explorer = new DeterministicEmotionExplorer(vocabulary);

    const result = await explorer.suggest({
      story: '약속이 갑자기 바뀌어서 화가 났어요.',
      userSelected: { emotions: [], needs: [] },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.emotions.map((suggestion) => suggestion.choice.id)).toEqual(['emotion-wronged']);
    expect(result.value.needs.map((suggestion) => suggestion.choice.id)).toEqual(['need-respect']);
  });

  it('빈 이야기 실패에도 원문을 포함하지 않은 안전한 문구를 반환한다', async () => {
    const explorer = new DeterministicEmotionExplorer(vocabulary);

    const result = await explorer.suggest({ story: '   ', userSelected: { emotions: [], needs: [] } });

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'invalid-response',
        safeMessage: '지금은 보조 후보를 준비하지 못했어요. 직접 고른 내용은 그대로 유지돼요.',
      },
    });
  });
});
