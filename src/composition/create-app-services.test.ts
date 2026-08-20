import { createAppServices } from './create-app-services';

describe('createAppServices', () => {
  it('실제 카탈로그와 로컬 탐색기를 자기 탐색 서비스에 연결한다', async () => {
    const services = createAppServices();
    const selected = {
      emotions: services.vocabulary
        .search({ kind: 'emotion', text: '서운' })
        .filter((item) => item.kind === 'emotion')
        .map((item) => ({ id: item.id, kind: item.kind, label: item.label, source: 'catalog' as const })),
      needs: [],
    };

    const snapshot = services.selfExploration.begin(selected);

    expect(snapshot.aiSuggested).toEqual({ emotions: [], needs: [] });
    await expect(
      services.selfExploration.requestAssistantSuggestions({
        story: '합성 상황에서 서운했어요.',
        userSelected: selected,
      }),
    ).resolves.toEqual({
      ok: true,
      value: {
        emotions: [],
        needs: [
          {
            choice: { id: 'need-respect', kind: 'need', label: '존중', source: 'catalog' },
            reason: '그 순간 존중받고 싶었는지 함께 살펴볼 수 있어요.',
          },
        ],
      },
    });
  });
});
