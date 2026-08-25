import { INITIAL_VOCABULARY } from '../../src/core/vocabulary/seed';
import {
  createEmotionSuggestionCatalog,
  MAX_STORY_UTF8_BYTES,
  parseEmotionSuggestionsRequest,
  parseEmotionSuggestionsResponse,
} from './emotion-suggestions-contract';

const catalog = createEmotionSuggestionCatalog(INITIAL_VOCABULARY);

describe('emotion suggestions server contract', () => {
  it('서버에서도 요청 ID와 이야기를 런타임 검증한다', () => {
    expect(
      parseEmotionSuggestionsRequest(
        {
          requestId: 'request-synthetic-1',
          story: '  발표를 기다리며 마음이 복잡했다.  ',
          userSelected: {
            emotionIds: ['emotion-worried'],
            needIds: ['need-safety'],
          },
          ignoredDeviceId: 'synthetic-device',
        },
        catalog,
      ),
    ).toEqual({
      requestId: 'request-synthetic-1',
      story: '발표를 기다리며 마음이 복잡했다.',
      userSelected: {
        emotionIds: ['emotion-worried'],
        needIds: ['need-safety'],
      },
    });
  });

  it.each([
    ['잘못된 request ID', { requestId: '요청 ID', story: '합성 이야기', userSelected: { emotionIds: [], needIds: [] } }],
    ['빈 이야기', { requestId: 'request-1', story: '   ', userSelected: { emotionIds: [], needIds: [] } }],
    ['모르는 감정 ID', { requestId: 'request-1', story: '합성 이야기', userSelected: { emotionIds: ['emotion-unknown'], needIds: [] } }],
    ['중복 욕구 ID', { requestId: 'request-1', story: '합성 이야기', userSelected: { emotionIds: [], needIds: ['need-rest', 'need-rest'] } }],
  ])('%s 요청을 공급자 전송 전에 거부한다', (_label, value) => {
    expect(parseEmotionSuggestionsRequest(value, catalog)).toBeNull();
  });

  it('UTF-8 바이트 한도를 넘는 이야기를 공급자 전송 전에 거부한다', () => {
    const oversizedStory = '가'.repeat(Math.floor(MAX_STORY_UTF8_BYTES / 3) + 1);

    expect(
      parseEmotionSuggestionsRequest(
        {
          requestId: 'request-oversized',
          story: oversizedStory,
          userSelected: { emotionIds: [], needIds: [] },
        },
        catalog,
      ),
    ).toBeNull();
  });

  it('카탈로그에 있고 사용자가 고르지 않은 후보만 수용한다', () => {
    expect(
      parseEmotionSuggestionsResponse(
        {
          emotions: [{ id: 'emotion-tense', reasonCode: 'uncertainty' }],
          needs: [{ id: 'need-rest', reasonCode: 'settling-needed' }],
        },
        catalog,
        { emotionIds: ['emotion-worried'], needIds: ['need-safety'] },
      ),
    ).toEqual({
      emotions: [{ id: 'emotion-tense', reasonCode: 'uncertainty' }],
      needs: [{ id: 'need-rest', reasonCode: 'settling-needed' }],
    });
  });

  it.each([
    ['모르는 ID', { emotions: [{ id: 'emotion-unknown', reasonCode: 'uncertainty' }], needs: [] }],
    ['이미 고른 ID', { emotions: [{ id: 'emotion-worried', reasonCode: 'uncertainty' }], needs: [] }],
    ['중복 ID', { emotions: [{ id: 'emotion-tense', reasonCode: 'uncertainty' }, { id: 'emotion-tense', reasonCode: 'energy-low' }], needs: [] }],
    ['정의되지 않은 이유', { emotions: [{ id: 'emotion-tense', reasonCode: 'diagnosis' }], needs: [] }],
  ])('%s 응답을 앱으로 반환하지 않는다', (_label, value) => {
    expect(
      parseEmotionSuggestionsResponse(value, catalog, {
        emotionIds: ['emotion-worried'],
        needIds: [],
      }),
    ).toBeNull();
  });
});
