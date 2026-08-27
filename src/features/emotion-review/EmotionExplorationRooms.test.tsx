import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { useState } from 'react';

import type { VocabularyItem, VocabularyKind } from '@/src/core/contracts';
import { InMemoryEmotionNeedVocabulary, INITIAL_VOCABULARY } from '@/src/core/vocabulary';
import { EmotionExplorationRooms } from './EmotionExplorationRooms';

const vocabulary = new InMemoryEmotionNeedVocabulary(INITIAL_VOCABULARY);
const needsRoomAccessibilityLabel = '욕구 방 열기, 110개 표현, 욕구 8개 영역: '
  + '자율성 · 신체·생존 · 사회·정서·상호의존 · 놀이·재미 · 삶의 의미 · 진실성 · 아름다움·평화 · 자기구현';

function TestExplorer() {
  const [emotionIds, setEmotionIds] = useState<ReadonlySet<string>>(new Set());
  const [needIds, setNeedIds] = useState<ReadonlySet<string>>(new Set());
  const [unknown, setUnknown] = useState(false);

  const toggle = (item: VocabularyItem) => {
    const update = (current: ReadonlySet<string>) => {
      const next = new Set(current);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    };
    if (item.kind === 'emotion') setEmotionIds(update);
    else setNeedIds(update);
  };

  const add = (kind: VocabularyKind, label: string) => {
    const id = `user-added-${kind}-${label}`;
    if (kind === 'emotion') setEmotionIds((current) => new Set([...current, id]));
    else setNeedIds((current) => new Set([...current, id]));
  };

  return (
    <EmotionExplorationRooms
      emotionUnknown={unknown}
      onAdd={add}
      onResetSelections={() => {
        setEmotionIds(new Set());
        setNeedIds(new Set());
        setUnknown(false);
      }}
      onToggle={toggle}
      onToggleEmotionUnknown={() => setUnknown((current) => !current)}
      selectedEmotionIds={emotionIds}
      selectedLabels={[...emotionIds, ...needIds].map((id) => vocabulary.findById(id)?.label ?? id)}
      selectedNeedIds={needIds}
      vocabulary={vocabulary}
    />
  );
}

describe('EmotionExplorationRooms', () => {
  it('첫 화면에서 세 방의 정확한 수와 욕구 8개 영역을 바로 보여 준다', () => {
    render(<TestExplorer />);

    expect(screen.getByLabelText('충족 감정 방 열기, 70개 표현')).toBeTruthy();
    expect(screen.getByLabelText('미충족 감정 방 열기, 91개 표현')).toBeTruthy();
    expect(screen.getByLabelText(needsRoomAccessibilityLabel)).toBeTruthy();
    const needsPreview = screen.getByText(
      '자율성 · 신체·생존 · 사회·정서·상호의존 · 놀이·재미 · 삶의 의미 · 진실성 · 아름다움·평화 · 자기구현',
    );
    expect(needsPreview.props.numberOfLines).toBeUndefined();
    const orderedLabels = screen.getByLabelText('세 개의 마음 방')
      .findAll((node: { props: { accessibilityLabel?: unknown } }) => typeof node.props.accessibilityLabel === 'string')
      .map((node: { props: { accessibilityLabel?: unknown } }) => node.props.accessibilityLabel as string);
    expect(orderedLabels.indexOf('마음 방 선택')).toBeLessThan(orderedLabels.indexOf('추가 탐색 도구'));
    expect(screen.getByLabelText('감정을 아직 모르겠어요').props.accessibilityState.checked).toBe(false);
    expect(screen.getByRole('button', { name: '전체 목록 보기' })).toHaveStyle({ minHeight: 48 });
  });

  it('방과 묶음을 오가며 충족 감정과 욕구의 혼합 선택을 유지하고 초기화한다', () => {
    render(<TestExplorer />);

    fireEvent.press(screen.getByLabelText('충족 감정 방 열기, 70개 표현'));
    fireEvent.press(screen.getByLabelText(/기쁨과 즐거움 묶음 열기/));
    fireEvent.press(screen.getByLabelText('기쁜 선택'));
    expect(screen.getByLabelText('선택한 표현 1개')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: '한 단계 뒤로' }));
    fireEvent.press(screen.getByRole('button', { name: '한 단계 뒤로' }));
    fireEvent.press(screen.getByLabelText(needsRoomAccessibilityLabel));
    fireEvent.press(screen.getByLabelText(/신체적 안녕과 생존 묶음 열기/));
    fireEvent.press(screen.getByLabelText('휴식 선택'));

    expect(screen.getByLabelText('선택한 표현 2개')).toBeTruthy();
    expect(screen.getByText('기쁜 · 휴식')).toBeTruthy();
    expect(screen.getByRole('button', { name: '탐색과 선택 모두 초기화' })).toHaveStyle({ minHeight: 48 });
    fireEvent.press(screen.getByRole('button', { name: '탐색과 선택 모두 초기화' }));
    expect(screen.queryByLabelText('선택한 표현 2개')).toBeNull();
    expect(screen.getByLabelText('충족 감정 방 열기, 70개 표현')).toBeTruthy();
  });

  it('현재 방과 무관하게 271개 전체를 검색하고 검색 해제 뒤 원래 방으로 돌아온다', () => {
    render(<TestExplorer />);

    fireEvent.press(screen.getByLabelText(needsRoomAccessibilityLabel));
    const search = screen.getByLabelText('감정과 욕구 전체 검색');
    fireEvent.changeText(search, '고마운');
    expect(screen.getByLabelText('고마운 선택')).toBeTruthy();
    expect(screen.getByText('“고마운” 검색 결과 2개')).toBeTruthy();

    fireEvent.changeText(search, '');
    expect(screen.getByLabelText(/자율성 묶음 열기/)).toBeTruthy();
    expect(screen.queryByLabelText('고마운 선택')).toBeNull();
  });

  it('전체 목록에서 세 방의 19개 구조와 271개 항목을 빠짐없이 제공한다', () => {
    render(<TestExplorer />);

    fireEvent.press(screen.getByRole('button', { name: '전체 목록 보기' }));
    const allItems = screen.getByLabelText('전체 감정과 욕구 목록');
    expect(within(allItems).getByLabelText('충족 감정, 기쁨과 즐거움')).toBeTruthy();
    expect(within(allItems).getByLabelText('미충족 감정, 화와 억울함')).toBeTruthy();
    expect(within(allItems).getByLabelText('욕구, 자기구현과 성장')).toBeTruthy();
    expect(within(allItems).getAllByRole('checkbox')).toHaveLength(271);
  });
});
