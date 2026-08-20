import type { EmotionExplorer } from '../../core/contracts/emotion-explorer';
import { SelfExplorationService } from './self-exploration-service';

describe('SelfExplorationService', () => {
  it('자기 선택을 시작할 때는 탐색기를 호출하지 않는다', () => {
    const suggest = jest.fn();
    const service = new SelfExplorationService({ suggest } as EmotionExplorer);
    const userSelected = {
      emotions: [{ id: 'emotion-calm', kind: 'emotion' as const, label: '편안한', source: 'catalog' as const }],
      needs: [{ id: 'need-rest', kind: 'need' as const, label: '휴식', source: 'catalog' as const }],
    };

    const snapshot = service.begin(userSelected);

    expect(suggest).not.toHaveBeenCalled();
    expect(snapshot).toEqual({
      userSelected,
      aiSuggested: { emotions: [], needs: [] },
    });
    expect(snapshot.userSelected).not.toBe(userSelected);
  });

  it('사용자가 보조 후보를 명시적으로 요청한 메서드에서만 탐색기를 호출한다', async () => {
    const suggest = jest.fn().mockResolvedValue({
      ok: true,
      value: { emotions: [], needs: [] },
    });
    const service = new SelfExplorationService({ suggest } as EmotionExplorer);
    const request = {
      story: '합성 테스트 이야기',
      userSelected: { emotions: [], needs: [] },
    };

    await expect(service.requestAssistantSuggestions(request)).resolves.toEqual({
      ok: true,
      value: { emotions: [], needs: [] },
    });
    expect(suggest).toHaveBeenCalledTimes(1);
    expect(suggest).toHaveBeenCalledWith(request);
  });
});
