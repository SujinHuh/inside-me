import type { VocabularyItem } from '../contracts/emotion-vocabulary';
import { InMemoryEmotionNeedVocabulary } from './in-memory-emotion-need-vocabulary';
import { INITIAL_VOCABULARY } from './seed';

describe('InMemoryEmotionNeedVocabulary', () => {
  it('종류·주제·탐색 태그를 함께 적용한다', () => {
    const catalog = new InMemoryEmotionNeedVocabulary(INITIAL_VOCABULARY);

    const results = catalog.search({
      kind: 'emotion',
      group: 'sadness',
      explorationTag: 'uncomfortable',
    });

    expect(results.map((item) => item.id)).toEqual([
      'emotion-sad',
      'emotion-hurt',
      'emotion-disappointed',
    ]);
    expect(results.every((item) => item.kind === 'emotion')).toBe(true);
  });

  it('표시 문구와 보조 검색어를 공백·호환 문자 차이 없이 찾는다', () => {
    const catalog = new InMemoryEmotionNeedVocabulary(INITIAL_VOCABULARY);

    expect(catalog.search({ kind: 'emotion', text: '  섭섭  ' }).map((item) => item.id)).toEqual([
      'emotion-hurt',
    ]);
    expect(catalog.search({ kind: 'need', text: '자존감' }).map((item) => item.id)).toEqual([
      'need-self-respect',
    ]);
  });

  it('같은 ID 조회와 검색 결과가 내부 배열을 참조로 노출하지 않는다', () => {
    const catalog = new InMemoryEmotionNeedVocabulary(INITIAL_VOCABULARY);
    const first = catalog.findById('emotion-hurt');
    const result = catalog.search({ kind: 'emotion', text: '서운' })[0];

    expect(first).not.toBeNull();
    (first?.searchTerms as string[]).push('외부 변경');
    (result.groups as unknown as string[]).push('외부 그룹');

    expect(catalog.findById('emotion-hurt')?.searchTerms).not.toContain('외부 변경');
    expect(catalog.findById('emotion-hurt')?.groups).not.toContain('외부 그룹');
  });

  it('중복 ID나 종류와 맞지 않는 ID 접두어를 거부한다', () => {
    const duplicate = [INITIAL_VOCABULARY[0], INITIAL_VOCABULARY[0]];
    const wrongPrefix = {
      ...INITIAL_VOCABULARY[0],
      id: 'need-wrong-prefix',
    } as VocabularyItem;
    const wrongGroup = {
      ...INITIAL_VOCABULARY[0],
      groups: ['autonomy'],
    } as unknown as VocabularyItem;

    expect(() => new InMemoryEmotionNeedVocabulary(duplicate)).toThrow('중복된 어휘 ID');
    expect(() => new InMemoryEmotionNeedVocabulary([wrongPrefix])).toThrow('ID, 이름 또는 그룹');
    expect(() => new InMemoryEmotionNeedVocabulary([wrongGroup])).toThrow('ID, 이름 또는 그룹');
  });
});
