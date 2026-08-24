import type {
  EmotionNeedVocabulary,
  VocabularyItem,
  VocabularyGroupId,
  VocabularyKind,
  VocabularyQuery,
} from '../contracts/emotion-vocabulary';
import { VOCABULARY_GROUPS } from './groups';

const normalize = (value: string): string => value.normalize('NFKC').trim().toLocaleLowerCase('ko-KR');

const cloneItem = (item: VocabularyItem): VocabularyItem => {
  if (item.kind === 'emotion') {
    return {
      ...item,
      groups: [...item.groups],
      searchTerms: [...item.searchTerms],
      explorationTags: [...item.explorationTags],
    };
  }

  return {
    ...item,
    groups: [...item.groups],
    searchTerms: [...item.searchTerms],
    explorationTags: [...item.explorationTags],
  };
};

const hasStableId = (kind: VocabularyKind, id: string): boolean =>
  new RegExp(`^${kind}-[a-z0-9]+(?:-[a-z0-9]+)*$`).test(id);
const groupKinds = new Map(VOCABULARY_GROUPS.map((group) => [group.id, group.kind]));

const validateItems = (items: readonly VocabularyItem[]): void => {
  const ids = new Set<string>();

  for (const item of items) {
    const hasInvalidGroup = item.groups.some((group) => groupKinds.get(group) !== item.kind);
    const hasInvalidNeedConnection = item.kind === 'emotion' && ![
      'fulfilled',
      'unfulfilled',
    ].includes(item.needConnection);
    if (
      !item.id.trim() ||
      !item.label.trim() ||
      item.groups.length === 0 ||
      !hasStableId(item.kind, item.id) ||
      hasInvalidGroup ||
      hasInvalidNeedConnection
    ) {
      throw new Error('어휘 항목의 ID, 이름 또는 그룹이 올바르지 않습니다.');
    }

    if (ids.has(item.id)) {
      throw new Error('중복된 어휘 ID가 있습니다.');
    }

    ids.add(item.id);
  }
};

export class InMemoryEmotionNeedVocabulary implements EmotionNeedVocabulary {
  private readonly items: readonly VocabularyItem[];
  private readonly itemsById: ReadonlyMap<string, VocabularyItem>;

  constructor(items: readonly VocabularyItem[]) {
    validateItems(items);
    this.items = items.map(cloneItem);
    this.itemsById = new Map(this.items.map((item) => [item.id, item]));
  }

  search(query: VocabularyQuery): readonly VocabularyItem[] {
    const text = query.text ? normalize(query.text) : '';

    return this.items
      .filter((item) => item.kind === query.kind)
      .filter((item) => !query.group || (item.groups as readonly VocabularyGroupId[]).includes(query.group))
      .filter((item) => query.kind !== 'emotion' || !query.needConnection || (
        item.kind === 'emotion' && item.needConnection === query.needConnection
      ))
      .filter((item) => !query.explorationTag || item.explorationTags.includes(query.explorationTag))
      .filter((item) => {
        if (!text) {
          return true;
        }

        return [item.label, ...item.searchTerms].some((candidate) => normalize(candidate).includes(text));
      })
      .map(cloneItem);
  }

  findById(id: string): VocabularyItem | null {
    const item = this.itemsById.get(id);
    return item ? cloneItem(item) : null;
  }
}
