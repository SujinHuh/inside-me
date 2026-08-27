import type {
  EmotionGroupId,
  EmotionNeedVocabulary,
  NeedConnection,
  NeedGroupId,
  VocabularyGroupId,
  VocabularyItem,
} from '../contracts/emotion-vocabulary';
import { VOCABULARY_GROUPS } from '../vocabulary/groups';

export type EmotionExplorationRoomId = 'fulfilled' | 'unfulfilled' | 'needs';

export type EmotionExplorationErrorCode =
  | 'unknown-room'
  | 'unknown-group'
  | 'room-required'
  | 'group-outside-room'
  | 'unknown-item';

export class EmotionExplorationContractError extends Error {
  constructor(readonly code: EmotionExplorationErrorCode) {
    super(code);
    this.name = 'EmotionExplorationContractError';
  }
}

export interface EmotionExplorationState {
  readonly roomId: EmotionExplorationRoomId | null;
  readonly groupId: VocabularyGroupId | null;
  readonly query: string;
  readonly isAllItemsOpen: boolean;
  readonly selectedItemIds: readonly string[];
}

export type EmotionExplorationAction =
  | { readonly type: 'enter-room'; readonly roomId: EmotionExplorationRoomId }
  | { readonly type: 'enter-group'; readonly groupId: VocabularyGroupId }
  | { readonly type: 'set-query'; readonly query: string }
  | { readonly type: 'clear-query' }
  | { readonly type: 'open-all-items' }
  | { readonly type: 'toggle-selection'; readonly itemId: string }
  | { readonly type: 'back' }
  | { readonly type: 'reset' };

export interface EmotionExplorationRoomSummary {
  readonly id: EmotionExplorationRoomId;
  readonly label: string;
  readonly itemCount: number;
  readonly groupCount: number;
  readonly previewLabels: readonly string[];
}

export interface EmotionExplorationGroupSummary {
  readonly id: VocabularyGroupId;
  readonly label: string;
  readonly itemCount: number;
}

export interface EmotionExplorationSection {
  readonly room: EmotionExplorationRoomSummary;
  readonly group: EmotionExplorationGroupSummary;
  readonly items: readonly VocabularyItem[];
}

interface EmotionExplorationViewBase {
  readonly selectedItemIds: readonly string[];
}

export type EmotionExplorationView = EmotionExplorationViewBase & (
  | {
    readonly mode: 'rooms';
    readonly rooms: readonly EmotionExplorationRoomSummary[];
  }
  | {
    readonly mode: 'groups';
    readonly room: EmotionExplorationRoomSummary;
    readonly groups: readonly EmotionExplorationGroupSummary[];
  }
  | {
    readonly mode: 'items';
    readonly room: EmotionExplorationRoomSummary;
    readonly group: EmotionExplorationGroupSummary;
    readonly items: readonly VocabularyItem[];
  }
  | {
    readonly mode: 'search';
    readonly query: string;
    readonly items: readonly VocabularyItem[];
  }
  | {
    readonly mode: 'all-items';
    readonly sections: readonly EmotionExplorationSection[];
  }
);

interface RoomDefinition {
  readonly id: EmotionExplorationRoomId;
  readonly label: string;
  readonly kind: 'emotion' | 'need';
  readonly needConnection?: NeedConnection;
  readonly groupIds: readonly VocabularyGroupId[];
  readonly previewLabels: readonly string[];
}

const FULFILLED_GROUP_IDS = ['joy', 'calm', 'confidence'] as const satisfies readonly EmotionGroupId[];
const UNFULFILLED_GROUP_IDS = [
  'worry',
  'fear',
  'tension',
  'sadness',
  'loneliness',
  'fatigue',
  'confusion',
  'anger',
] as const satisfies readonly EmotionGroupId[];
const NEED_GROUP_IDS = [
  'autonomy',
  'physical-wellbeing',
  'connection',
  'play',
  'meaning',
  'integrity',
  'peace',
  'growth',
] as const satisfies readonly NeedGroupId[];

const ROOM_DEFINITIONS = [
  {
    id: 'fulfilled',
    label: '충족 감정',
    kind: 'emotion',
    needConnection: 'fulfilled',
    groupIds: FULFILLED_GROUP_IDS,
    previewLabels: [],
  },
  {
    id: 'unfulfilled',
    label: '미충족 감정',
    kind: 'emotion',
    needConnection: 'unfulfilled',
    groupIds: UNFULFILLED_GROUP_IDS,
    previewLabels: [],
  },
  {
    id: 'needs',
    label: '욕구',
    kind: 'need',
    groupIds: NEED_GROUP_IDS,
    previewLabels: [
      '자율성',
      '신체·생존',
      '사회·정서·상호의존',
      '놀이·재미',
      '삶의 의미',
      '진실성',
      '아름다움·평화',
      '자기구현',
    ],
  },
] as const satisfies readonly RoomDefinition[];

const groupsById = new Map(VOCABULARY_GROUPS.map((group) => [group.id, group]));

const findRoomDefinition = (roomId: EmotionExplorationRoomId): RoomDefinition => {
  const room = ROOM_DEFINITIONS.find((candidate) => candidate.id === roomId);
  if (!room) {
    throw new EmotionExplorationContractError('unknown-room');
  }
  return room;
};

const findGroup = (groupId: VocabularyGroupId) => {
  const group = groupsById.get(groupId);
  if (!group) {
    throw new EmotionExplorationContractError('unknown-group');
  }
  return group;
};

const listRoomItems = (
  vocabulary: EmotionNeedVocabulary,
  room: RoomDefinition,
): readonly VocabularyItem[] => room.kind === 'emotion'
  ? vocabulary.search({ kind: 'emotion', needConnection: room.needConnection })
  : vocabulary.search({ kind: 'need' });

const listGroupItems = (
  vocabulary: EmotionNeedVocabulary,
  room: RoomDefinition,
  groupId: VocabularyGroupId,
): readonly VocabularyItem[] => {
  findGroup(groupId);
  if (!room.groupIds.includes(groupId)) {
    throw new EmotionExplorationContractError('group-outside-room');
  }

  return room.kind === 'emotion'
    ? vocabulary.search({
      kind: 'emotion',
      group: groupId as EmotionGroupId,
      needConnection: room.needConnection,
    })
    : vocabulary.search({ kind: 'need', group: groupId as NeedGroupId });
};

const listAllItems = (vocabulary: EmotionNeedVocabulary, text?: string): readonly VocabularyItem[] => [
  ...vocabulary.search({ kind: 'emotion', text }),
  ...vocabulary.search({ kind: 'need', text }),
];

const createRoomSummary = (
  vocabulary: EmotionNeedVocabulary,
  room: RoomDefinition,
): EmotionExplorationRoomSummary => ({
  id: room.id,
  label: room.label,
  itemCount: listRoomItems(vocabulary, room).length,
  groupCount: room.groupIds.length,
  previewLabels: [...room.previewLabels],
});

const createGroupSummary = (
  vocabulary: EmotionNeedVocabulary,
  room: RoomDefinition,
  groupId: VocabularyGroupId,
): EmotionExplorationGroupSummary => ({
  id: groupId,
  label: findGroup(groupId).label,
  itemCount: listGroupItems(vocabulary, room, groupId).length,
});

const createAllItemSections = (
  vocabulary: EmotionNeedVocabulary,
): readonly EmotionExplorationSection[] => ROOM_DEFINITIONS.flatMap((room) => {
  const roomSummary = createRoomSummary(vocabulary, room);
  return room.groupIds.map((groupId) => ({
    room: roomSummary,
    group: createGroupSummary(vocabulary, room, groupId),
    items: listGroupItems(vocabulary, room, groupId),
  }));
});

export const createInitialEmotionExplorationState = (): EmotionExplorationState => ({
  roomId: null,
  groupId: null,
  query: '',
  isAllItemsOpen: false,
  selectedItemIds: [],
});

export const transitionEmotionExploration = (
  state: EmotionExplorationState,
  action: EmotionExplorationAction,
  vocabulary: EmotionNeedVocabulary,
): EmotionExplorationState => {
  switch (action.type) {
    case 'enter-room':
      findRoomDefinition(action.roomId);
      return {
        ...state,
        roomId: action.roomId,
        groupId: null,
        query: '',
        isAllItemsOpen: false,
        selectedItemIds: [...state.selectedItemIds],
      };
    case 'enter-group': {
      if (!state.roomId) {
        throw new EmotionExplorationContractError('room-required');
      }
      const room = findRoomDefinition(state.roomId);
      listGroupItems(vocabulary, room, action.groupId);
      return {
        ...state,
        groupId: action.groupId,
        query: '',
        isAllItemsOpen: false,
        selectedItemIds: [...state.selectedItemIds],
      };
    }
    case 'set-query':
      return {
        ...state,
        query: action.query,
        isAllItemsOpen: false,
        selectedItemIds: [...state.selectedItemIds],
      };
    case 'clear-query':
      return {
        ...state,
        query: '',
        selectedItemIds: [...state.selectedItemIds],
      };
    case 'open-all-items':
      return {
        ...state,
        query: '',
        isAllItemsOpen: true,
        selectedItemIds: [...state.selectedItemIds],
      };
    case 'toggle-selection': {
      if (!vocabulary.findById(action.itemId)) {
        throw new EmotionExplorationContractError('unknown-item');
      }
      const selected = state.selectedItemIds.includes(action.itemId)
        ? state.selectedItemIds.filter((itemId) => itemId !== action.itemId)
        : [...state.selectedItemIds, action.itemId];
      return { ...state, selectedItemIds: selected };
    }
    case 'back':
      if (state.query.trim()) {
        return { ...state, query: '', selectedItemIds: [...state.selectedItemIds] };
      }
      if (state.isAllItemsOpen) {
        return { ...state, isAllItemsOpen: false, selectedItemIds: [...state.selectedItemIds] };
      }
      if (state.groupId) {
        return { ...state, groupId: null, selectedItemIds: [...state.selectedItemIds] };
      }
      if (state.roomId) {
        return { ...state, roomId: null, selectedItemIds: [...state.selectedItemIds] };
      }
      return { ...state, selectedItemIds: [...state.selectedItemIds] };
    case 'reset':
      return createInitialEmotionExplorationState();
  }
};

export const getEmotionExplorationView = (
  state: EmotionExplorationState,
  vocabulary: EmotionNeedVocabulary,
): EmotionExplorationView => {
  const selectedItemIds = [...state.selectedItemIds];
  const query = state.query.trim();

  if (query) {
    return {
      mode: 'search',
      query: state.query,
      items: listAllItems(vocabulary, query),
      selectedItemIds,
    };
  }

  if (state.isAllItemsOpen) {
    return {
      mode: 'all-items',
      sections: createAllItemSections(vocabulary),
      selectedItemIds,
    };
  }

  if (!state.roomId) {
    return {
      mode: 'rooms',
      rooms: ROOM_DEFINITIONS.map((room) => createRoomSummary(vocabulary, room)),
      selectedItemIds,
    };
  }

  const room = findRoomDefinition(state.roomId);
  const roomSummary = createRoomSummary(vocabulary, room);
  if (!state.groupId) {
    return {
      mode: 'groups',
      room: roomSummary,
      groups: room.groupIds.map((groupId) => createGroupSummary(vocabulary, room, groupId)),
      selectedItemIds,
    };
  }

  return {
    mode: 'items',
    room: roomSummary,
    group: createGroupSummary(vocabulary, room, state.groupId),
    items: listGroupItems(vocabulary, room, state.groupId),
    selectedItemIds,
  };
};
