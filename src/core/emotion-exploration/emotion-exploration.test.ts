import { InMemoryEmotionNeedVocabulary } from '../vocabulary/in-memory-emotion-need-vocabulary';
import { INITIAL_VOCABULARY } from '../vocabulary/seed';
import {
  createInitialEmotionExplorationState,
  EmotionExplorationContractError,
  getEmotionExplorationView,
  transitionEmotionExploration,
  type EmotionExplorationAction,
  type EmotionExplorationErrorCode,
  type EmotionExplorationRoomId,
  type EmotionExplorationState,
} from './emotion-exploration';

const vocabulary = new InMemoryEmotionNeedVocabulary(INITIAL_VOCABULARY);

const act = (
  state: EmotionExplorationState,
  action: EmotionExplorationAction,
): EmotionExplorationState => transitionEmotionExploration(state, action, vocabulary);

const expectContractError = (
  operation: () => unknown,
  expectedCode: EmotionExplorationErrorCode,
): void => {
  try {
    operation();
    throw new Error('예상한 계약 오류가 발생하지 않았습니다.');
  } catch (error) {
    expect(error).toBeInstanceOf(EmotionExplorationContractError);
    expect((error as EmotionExplorationContractError).code).toBe(expectedCode);
  }
};

describe('C안 감정·욕구 자기 탐색 계약', () => {
  it('첫 화면에 세 마음 방과 욕구 8개 영역을 누락 없이 보여 준다', () => {
    const view = getEmotionExplorationView(createInitialEmotionExplorationState(), vocabulary);

    expect(view.mode).toBe('rooms');
    if (view.mode !== 'rooms') return;
    expect(view.rooms.map(({ id, label, itemCount, groupCount }) => ({ id, label, itemCount, groupCount }))).toEqual([
      { id: 'fulfilled', label: '충족 감정', itemCount: 70, groupCount: 3 },
      { id: 'unfulfilled', label: '미충족 감정', itemCount: 91, groupCount: 8 },
      { id: 'needs', label: '욕구', itemCount: 110, groupCount: 8 },
    ]);
    expect(view.rooms[2]?.previewLabels).toEqual([
      '자율성',
      '신체·생존',
      '사회·정서·상호의존',
      '놀이·재미',
      '삶의 의미',
      '진실성',
      '아름다움·평화',
      '자기구현',
    ]);
  });

  it('세 방의 모든 묶음을 거치면 271개 정본 어휘에 중복·누락 없이 도달한다', () => {
    const reachedItemIds: string[] = [];

    for (const roomId of ['fulfilled', 'unfulfilled', 'needs'] as const) {
      const roomState = act(createInitialEmotionExplorationState(), { type: 'enter-room', roomId });
      const groupsView = getEmotionExplorationView(roomState, vocabulary);
      expect(groupsView.mode).toBe('groups');
      if (groupsView.mode !== 'groups') continue;

      for (const group of groupsView.groups) {
        const groupState = act(roomState, { type: 'enter-group', groupId: group.id });
        const itemsView = getEmotionExplorationView(groupState, vocabulary);
        expect(itemsView.mode).toBe('items');
        if (itemsView.mode === 'items') {
          reachedItemIds.push(...itemsView.items.map((item) => item.id));
        }
      }
    }

    expect(reachedItemIds).toHaveLength(271);
    expect(new Set(reachedItemIds).size).toBe(271);
  });

  it('현재 방과 묶음에 갇히지 않고 271개 전체를 검색한다', () => {
    let state = createInitialEmotionExplorationState();
    state = act(state, { type: 'enter-room', roomId: 'fulfilled' });
    state = act(state, { type: 'enter-group', groupId: 'joy' });
    state = act(state, { type: 'toggle-selection', itemId: 'emotion-happy' });
    state = act(state, { type: 'set-query', query: '휴식' });

    const view = getEmotionExplorationView(state, vocabulary);
    expect(view.mode).toBe('search');
    if (view.mode !== 'search') return;
    expect(view.items.map((item) => item.id)).toContain('need-rest');
    expect(view.items.every((item) => item.label.includes('휴식') || item.searchTerms.some((term) => term.includes('휴식')))).toBe(true);
    expect(view.selectedItemIds).toEqual(['emotion-happy']);

    state = act(state, { type: 'back' });
    const restoredView = getEmotionExplorationView(state, vocabulary);
    expect(restoredView.mode).toBe('items');
    expect(restoredView.selectedItemIds).toEqual(['emotion-happy']);
  });

  it('방을 바꿔도 충족·미충족 감정과 욕구의 혼합 선택을 유지한다', () => {
    let state = createInitialEmotionExplorationState();
    state = act(state, { type: 'enter-room', roomId: 'fulfilled' });
    state = act(state, { type: 'toggle-selection', itemId: 'emotion-happy' });
    state = act(state, { type: 'enter-room', roomId: 'unfulfilled' });
    state = act(state, { type: 'toggle-selection', itemId: 'emotion-anxious' });
    state = act(state, { type: 'enter-room', roomId: 'needs' });
    state = act(state, { type: 'toggle-selection', itemId: 'need-rest' });

    expect(state.selectedItemIds).toEqual(['emotion-happy', 'emotion-anxious', 'need-rest']);
    const view = getEmotionExplorationView(state, vocabulary);
    expect(view.selectedItemIds).toEqual(['emotion-happy', 'emotion-anxious', 'need-rest']);
  });

  it('전체 목록 271개를 세 방과 19개 묶음 순서로 열고 이전 탐색 문맥으로 돌아간다', () => {
    let state = act(createInitialEmotionExplorationState(), { type: 'enter-room', roomId: 'needs' });
    state = act(state, { type: 'enter-group', groupId: 'physical-wellbeing' });
    state = act(state, { type: 'open-all-items' });

    const allItemsView = getEmotionExplorationView(state, vocabulary);
    expect(allItemsView.mode).toBe('all-items');
    if (allItemsView.mode === 'all-items') {
      expect(allItemsView.sections.map(({ room, group }) => `${room.id}:${group.id}`)).toEqual([
        'fulfilled:joy',
        'fulfilled:calm',
        'fulfilled:confidence',
        'unfulfilled:worry',
        'unfulfilled:fear',
        'unfulfilled:tension',
        'unfulfilled:sadness',
        'unfulfilled:loneliness',
        'unfulfilled:fatigue',
        'unfulfilled:confusion',
        'unfulfilled:anger',
        'needs:autonomy',
        'needs:physical-wellbeing',
        'needs:connection',
        'needs:play',
        'needs:meaning',
        'needs:integrity',
        'needs:peace',
        'needs:growth',
      ]);
      const allItemIds = allItemsView.sections.flatMap((section) => section.items.map((item) => item.id));
      expect(allItemIds).toHaveLength(271);
      expect(new Set(allItemIds).size).toBe(271);
      expect(allItemsView.sections.every((section) => section.group.itemCount === section.items.length)).toBe(true);
    }

    state = act(state, { type: 'back' });
    const restoredView = getEmotionExplorationView(state, vocabulary);
    expect(restoredView.mode).toBe('items');
    if (restoredView.mode === 'items') expect(restoredView.group.id).toBe('physical-wellbeing');
  });

  it('선택 토글과 전체 초기화가 입력 상태를 변경하지 않고 새 상태를 반환한다', () => {
    const initial = createInitialEmotionExplorationState();
    const selected = act(initial, { type: 'toggle-selection', itemId: 'emotion-happy' });
    const deselected = act(selected, { type: 'toggle-selection', itemId: 'emotion-happy' });

    expect(initial.selectedItemIds).toEqual([]);
    expect(selected.selectedItemIds).toEqual(['emotion-happy']);
    expect(deselected.selectedItemIds).toEqual([]);

    const explored = act(selected, { type: 'enter-room', roomId: 'fulfilled' });
    expect(act(explored, { type: 'reset' })).toEqual(createInitialEmotionExplorationState());
  });

  it('런타임의 잘못된 방·묶음·선택을 안정적인 오류 코드로 구분한다', () => {
    expectContractError(
      () => act(createInitialEmotionExplorationState(), {
        type: 'enter-room',
        roomId: 'missing' as EmotionExplorationRoomId,
      }),
      'unknown-room',
    );
    expectContractError(
      () => act(createInitialEmotionExplorationState(), { type: 'enter-group', groupId: 'joy' }),
      'room-required',
    );

    const fulfilledRoom = act(createInitialEmotionExplorationState(), {
      type: 'enter-room',
      roomId: 'fulfilled',
    });

    expectContractError(
      () => act(fulfilledRoom, {
        type: 'enter-group',
        groupId: 'missing' as 'joy',
      }),
      'unknown-group',
    );
    expectContractError(
      () => act(fulfilledRoom, { type: 'enter-group', groupId: 'anger' }),
      'group-outside-room',
    );
    expectContractError(
      () => act(fulfilledRoom, { type: 'toggle-selection', itemId: 'need-missing' }),
      'unknown-item',
    );
  });
});
