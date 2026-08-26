# Inside Me 문서 안내

- 상태: 문서 탐색의 단일 원본
- 최종 확인일: 2026-08-26

## 목적

작업을 시작할 때 모든 문서를 처음부터 읽지 않고, 현재 작업에 필요한 원본 문서와 검증 문서를 정확히 찾기 위한 중앙 목차다. 각 문서의 상세 내용을 이 파일에 복사하지 않고 역할과 읽는 조건만 관리한다.

## 작업별 필독 문서

| 하려는 작업 | 먼저 읽을 문서 | 함께 확인할 문서 |
|---|---|---|
| 제품 아이디어·요구사항 변경 | [제품 요구사항](requirements.md) | 관련 [결정 로그](decisions.md), [미결정 질문](open-questions.md), 최근 [제품 로그](product-log.md) |
| 다음 구현 선택·완료 상태 확인 | [구현 계획](implementation-plan.md) | [개발 워크플로](development-workflow.md), [클린 코드 지침](clean-code-guidelines.md) |
| POC·프로토타입·MVP 단계와 승격 기준 확인 | [제품 개발 단계](product-development-stages.md) | [구현 계획](implementation-plan.md), [UI QA 가이드](ui-qa-guide.md), [실기기 체크리스트](device-validation-checklist.md) |
| 외부에서 폰으로 원격 개발 | [구현 계획](implementation-plan.md)의 현재 실행 환경과 포인터 | [개발 워크플로](development-workflow.md)의 외부·폰 원격 모드 |
| Android 실기기 통합 검증 | [실기기 체크리스트](device-validation-checklist.md) | [구현 계획](implementation-plan.md)의 `IMP-106` |
| 의존성·Node·Expo·빌드 설정 변경 | [의존성 기준](dependencies.md) | [`package.json`](../package.json), [`package-lock.json`](../package-lock.json), [`.nvmrc`](../.nvmrc) |
| 일반 UI 설계·구현·검수 | [Hallmark](references/hallmark.md), [Windows Classic UI](references/windows-classic-ui.md) | [제품 요구사항](requirements.md)의 UI 원칙, [UI QA 근거](references/ui-qa-standards.md) |
| 감정·욕구 탐색 UI | [감정·욕구 이미지 참고](references/emotion-needs-vocabulary-images.md), [전체 카탈로그 대조](references/emotion-needs-vocabulary-catalog.md), [A·B·C 시안 비교와 C안 선택 기록](references/emotion-map-candidate-comparison.md) | [버블 감정 지도 참고](references/bubble-emotion-map.md), [UI 상용화 지식재산 위험](references/ui-ip-risk-review.md), [감정 달력 화면 참고](references/emotion-calendar-app-screens.md), `REQ-029`, `DEC-037`, `DEC-055`, `DEC-060`, `DEC-061`, `DEC-062`, `DEC-063`, `DEC-064`, `Q-034`, `Q-035` |
| UI 반응형·상호작용 브라우저 보조 QA | [UI 브라우저 보조 QA 가이드](ui-qa-guide.md) | [UI QA 근거](references/ui-qa-standards.md), [실기기 체크리스트](device-validation-checklist.md), [개발 워크플로](development-workflow.md) |
| AI 공급자·개인정보·비용 결정 | [미결정 질문](open-questions.md)의 `Q-013` | [공급자 비교](references/ai-provider-comparison.md), [3모드 비용 추정](references/ai-mode-cost-estimate.md), `DEC-048`, `DEC-049` |
| AI 응답 계약·합성 평가 | [구현 계획](implementation-plan.md)의 `IMP-204S` | [제품 요구사항](requirements.md)의 AI 원칙, `DEC-037`, `DEC-047`, `DEC-048`, [클린 코드 지침](clean-code-guidelines.md) |
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
| `docs/product-log.md` | 사용자 제품 발화와 당시 해석을 보존하는 추가 전용 이력 |
| `docs/open-questions.md` | 사용자 답변이나 프로토타입 검증이 필요한 질문 |
| `docs/implementation-plan.md` | 구현 단계, 실행 상태 원장, 완료 증거와 다음 작업 |
| `docs/development-workflow.md` | 역할, 병렬 실행, 통합, 검증, Git·PR과 인계 방식 |
| `docs/clean-code-guidelines.md` | 계층, 런타임 데이터 경계, 이름·타입과 테스트 구조 기준 |
| `docs/dependencies.md` | Node·npm·Expo와 직접 의존성의 선택 근거·버전·감사 결과 |
| `docs/device-validation-checklist.md` | 최신 `main` 기준 Android 실기기 검증 순서와 실행 결과 |
| `docs/pull-request-guide.md` | PR 제목 type, 한국어 본문과 검증·영향 작성 기준 |
| `docs/ui-qa-guide.md` | 모바일 화면 크기별 브라우저 보조 QA와 사람·실기기 검증 경계 |
| `docs/references/` | 사용자 제공 자료, 외부 근거와 프로젝트 적용 해석 |
| `../AGENTS.md` | 모든 실행에서 빠지면 안 되는 저장소 강제 규칙과 안전 경계 |

## 기본 읽기 순서

1. 이 문서의 작업별 표에서 현재 작업에 해당하는 행을 고른다.
2. `requirements.md`의 관련 `REQ-*`와 현재 범위를 확인한다.
3. 연결된 `DEC-*`, `Q-*`와 최근 `LOG-*`에서 결정 상태와 원래 맥락을 확인한다.
4. 구현이면 `implementation-plan.md`의 현재 포인터와 `development-workflow.md`의 실행 게이트를 따른다.
5. 작업 유형별 추가 문서만 읽고, 관련 없는 이력 문서를 전부 다시 해석하지 않는다.

## 외부·원격 모드

사용자가 `외부야`, `외부에서 접속 중이야`처럼 알리면 사용자가 다시 기기 확인이 가능하다고 말할 때까지 폰 원격 모드를 기본으로 유지한다.

- `IMP-102`의 코드와 자동 검증은 완료 상태다. 해당 화면의 실제 Android 확인은 `IMP-106`에 포함해 대기한다.
- `IMP-106`은 Android폰·개발 Mac·Expo QR을 직접 사용할 수 있을 때만 진행한다.
- 원격 모드에서는 문서, 결정, 순수 로직, 합성 fixture와 런타임에 연결되지 않은 계약 테스트만 진행한다.
- 앱 화면·라우트, SQLite schema, Expo 네이티브 설정, 실제 AI·음성·알림처럼 `IMP-106`의 실기기 범위를 바꾸는 작업은 진행하지 않는다.
- 실제 계정, API 키, 외부 전송과 과금은 별도 사용자 승인이 있어야 한다.

## 중복과 충돌 처리

- 같은 상세 내용을 여러 문서에 복사하지 않고 이 목차에는 위치와 읽는 조건만 적는다.
- 현재 요구는 `requirements.md`, 현재 구현 상태는 `implementation-plan.md`, 실행 방식은 `development-workflow.md`를 우선한다.
- 과거 맥락은 `product-log.md`에서 보존하며 현재 상태 문서에 과거 브랜치명을 계속 복사하지 않는다.
- 문서가 충돌하면 최신 사용자 발화를 로그에 보존하고 결정 여부를 확인한 뒤 해당 원본 문서만 갱신한다.
