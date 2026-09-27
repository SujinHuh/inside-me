# Inside Me 문서 안내

- 상태: 문서 탐색의 단일 원본
- 최종 확인일: 2026-09-27

## 목적

작업을 시작할 때 모든 문서를 처음부터 읽지 않고, 현재 작업에 필요한 원본 문서와 검증 문서를 정확히 찾기 위한 중앙 목차다. 각 문서의 상세 내용을 이 파일에 복사하지 않고 역할과 읽는 조건만 관리한다.

## 작업별 필독 문서

| 하려는 작업 | 먼저 읽을 문서 | 함께 확인할 문서 |
|---|---|---|
| 제품 아이디어·요구사항 변경 | [제품 요구사항](requirements.md) | 관련 [결정 로그](decisions.md), [미결정 질문](open-questions.md), 최근 [제품 로그](product-log.md) |
| 제품 로그 추가·과거 LOG 조회 | [개발 워크플로의 로그 작성 규칙](development-workflow.md#제품-로그-작성-규칙), [현재 제품 로그](product-log.md)의 상단 안내 | 2026-09-07 이전 LOG의 상세 맥락이 필요할 때만 [장문 보관본](archive/product-log-legacy-20260818-20260905.md)에서 해당 ID 검색 |
| 다음 구현 선택·완료 상태 확인 | [구현 계획](implementation-plan.md) | [개발 워크플로](development-workflow.md), [클린 코드 지침](clean-code-guidelines.md) |
| 문서 추가·수정 또는 구현 뒤 최신 상태 점검 | [개발 워크플로](development-workflow.md)의 문서 최신화 게이트 | 이 목차의 문서별 원본 책임, [구현 계획](implementation-plan.md), 관련 요구사항·결정·질문·제품 로그 |
| POC·프로토타입·MVP 단계와 승격 기준 확인 | [제품 개발 단계](product-development-stages.md) | [구현 계획](implementation-plan.md), [UI QA 가이드](ui-qa-guide.md), [실기기 체크리스트](device-validation-checklist.md) |
| 외부에서 폰으로 원격 개발 | [구현 계획](implementation-plan.md)의 현재 실행 환경과 포인터 | [개발 워크플로](development-workflow.md)의 외부·폰 원격 모드 |
| Android 실기기 통합 검증 | [실기기 체크리스트](device-validation-checklist.md) | [구현 계획](implementation-plan.md)의 `IMP-106` |
| 의존성·Node·Expo·빌드 설정 변경 | [의존성 기준](dependencies.md) | [`package.json`](../package.json), [`package-lock.json`](../package-lock.json), [`.nvmrc`](../.nvmrc) |
| 일반 UI 설계·구현·검수 | [Hallmark](references/hallmark.md), [Windows Classic UI](references/windows-classic-ui.md) | [제품 요구사항](requirements.md)의 UI 원칙, [UI QA 근거](references/ui-qa-standards.md) |
| 감정·욕구 탐색 UI | [감정·욕구 목록 정본](references/emotion-needs-vocabulary.md), [A·B·C 시안 비교와 C안 선택 기록](references/emotion-map-candidate-comparison.md) | [버블 감정 지도 참고](references/bubble-emotion-map.md), [UI 상용화 지식재산 위험](references/ui-ip-risk-review.md), [감정 달력 화면 참고](references/emotion-calendar-app-screens.md), `REQ-029`, `DEC-037`, `DEC-055(DEC-064로 대체)`, `DEC-060`, `DEC-061`, `DEC-062`, `DEC-063`, `DEC-064`, `DEC-069(DEC-070으로 대체)`, `DEC-070`, `Q-034`, `Q-035` |
| UI 반응형·상호작용 브라우저 보조 QA | [UI 브라우저 보조 QA 가이드](ui-qa-guide.md) | [UI QA 근거](references/ui-qa-standards.md), [실기기 체크리스트](device-validation-checklist.md), [개발 워크플로](development-workflow.md) |
| AI 공급자·개인정보·비용 결정 | [미결정 질문](open-questions.md)의 `Q-013` | [공급자 비교](references/ai-provider-comparison.md), [3모드 비용 추정](references/ai-mode-cost-estimate.md), `DEC-048`, `DEC-049` |
| AI 응답 계약·합성 평가 | [구현 계획](implementation-plan.md)의 `IMP-204S` | [제품 요구사항](requirements.md)의 AI 원칙, `DEC-037`, `DEC-047`, `DEC-048`, [클린 코드 지침](clean-code-guidelines.md) |
| 자유 음성 실제 구현 재개 | [구현 계획](implementation-plan.md)의 `IMP-301B` | [미결정 질문](open-questions.md)의 `Q-033`, [제품 요구사항](requirements.md)의 REQ-012·016·026, [의존성 기준](dependencies.md), 개인정보 원칙 |
| PR 작성·검수 | [PR 작성 가이드](pull-request-guide.md) | [PR 템플릿](../.github/pull_request_template.md), [개발 워크플로](development-workflow.md)의 Git과 PR 운영 |
| 저장소 전체 강제 규칙 확인 | [AGENTS.md](../AGENTS.md) | 이 목차에서 작업별 원본 선택 |

## 문서별 원본 책임

| 문서 | 원본으로 관리하는 내용 |
|---|---|
| `docs/README.md` | 작업 유형별 필독 문서와 전체 문서 탐색 경로 |
| `docs/product-development-stages.md` | POC→프로토타입→MVP 단계, 현재 기능 분류와 단계별 QA 승격 기준 |
| `README.md` | 저장소 첫 화면의 제품 소개, 현재 상태와 실행 방법 요약 |
| `docs/requirements.md` | 현재 유효한 제품 요구사항과 MVP 범위 |
| `docs/decisions.md` | 선택지, 결정 상태, 트레이드오프와 재검토 조건 |
| `docs/product-log.md` | 프로젝트 상태 변화, 선택·변경 내용과 근거를 관련 원본 ID에 연결하는 추가 전용 색인 |
| `docs/archive/product-log-legacy-20260818-20260905.md` | 2026-08-18~09-05 장문 기록 160개의 보관본. 신규 기록을 추가하지 않으며 과거 LOG의 맥락 확인에만 사용 |
| `docs/open-questions.md` | 사용자 답변이나 프로토타입 검증이 필요한 질문 |
| `docs/implementation-plan.md` | 구현 단계, 실행 상태 원장, 완료 증거와 다음 작업 |
| `docs/development-workflow.md` | 역할, 병렬 실행, 통합, 검증, 제품 로그 작성 규칙, 필요한 문서만 읽는 방법, Git·PR과 인계 방식 |
| `docs/clean-code-guidelines.md` | 계층, 런타임 데이터 경계, 이름·타입과 테스트 구조 기준 |
| `docs/dependencies.md` | Node·npm·Expo와 직접 의존성의 선택 근거·버전·감사 결과 |
| `docs/device-validation-checklist.md` | 최신 `main` 기준 Android 실기기 검증 순서와 실행 결과 |
| `docs/pull-request-guide.md` | PR 제목 type, 한국어 본문과 검증·영향 작성 기준 |
| `docs/ui-qa-guide.md` | 모바일 화면 크기별 브라우저 보조 QA와 사람·실기기 검증 경계 |
| `docs/references/emotion-needs-vocabulary.md` | 사용자 제공 감정·욕구 목록만 관리하는 단일 Markdown 정본 |
| `docs/references/`의 나머지 문서·자산 | 외부 근거, 시각 참고자료와 프로젝트 적용 해석 |
| `../AGENTS.md` | 모든 실행에서 빠지면 안 되는 저장소 강제 규칙과 안전 경계 |

## 기본 읽기 순서

1. 이 문서의 작업별 표에서 현재 작업에 해당하는 행을 고른다.
2. `requirements.md`의 관련 `REQ-*`와 현재 범위를 확인한다.
3. 연결된 `DEC-*`, `Q-*`와 최근 `LOG-*`에서 결정 상태, 변경 이유와 원래 맥락을 확인한다.
4. 구현이면 `implementation-plan.md`의 현재 포인터와 `development-workflow.md`의 실행 게이트를 따른다.
5. 작업 유형별 추가 문서만 읽고, 관련 없는 이력 문서를 전부 다시 해석하지 않는다.

## 외부·원격 모드

사용자가 `외부야`, `외부에서 접속 중이야`처럼 알리면 사용자가 다시 기기 확인이 가능하다고 말할 때까지 폰 원격 모드를 기본으로 유지한다.

- `IMP-102`의 코드와 자동 검증은 완료 상태다. 해당 화면의 실제 Android 확인은 `IMP-106`에 포함해 대기한다.
- `IMP-106`은 Android폰·개발 Mac·Expo QR을 직접 사용할 수 있을 때만 진행한다.
- 원격 모드에서는 문서·순수 로직뿐 아니라 사용자가 명시적으로 승인한 앱 UI 코드와 합성 화면 테스트도 진행할 수 있다. 다만 자동 검증 결과를 실제 화면의 미감·손가락 조작·Android 성공 증거로 바꾸어 기록하지 않는다.
- SQLite schema, Expo 네이티브 설정, 실제 AI·음성·알림처럼 기기·비밀정보·과금에 의존하는 변경은 진행하지 않는다. UI 코드가 바뀌면 실기기 검증 항목을 누적하고 `사용자 실기기 검증 대기`로 남긴다.
- 실제 계정, API 키, 외부 전송과 과금은 별도 사용자 승인이 있어야 한다.

## 중복과 충돌 처리

- 같은 상세 내용을 여러 문서에 복사하지 않고 이 목차에는 위치와 읽는 조건만 적는다.
- 현재 요구는 `requirements.md`, 현재 구현 상태는 `implementation-plan.md`, 실행 방식은 `development-workflow.md`를 우선한다.
- 신규 상태 변화는 `product-log.md`에, 2026-09-07 이전 장문 이력은 [보관본](archive/product-log-legacy-20260818-20260905.md)에 둔다. 과거 LOG의 상세 맥락이 필요할 때만 해당 ID를 검색하고 현재 상태 문서에 과거 브랜치명을 계속 복사하지 않는다.
- 문서가 충돌하면 최신 사용자 지시의 의미를 로그에 요약하고 결정 여부를 확인한 뒤 해당 원본 문서만 갱신한다.
