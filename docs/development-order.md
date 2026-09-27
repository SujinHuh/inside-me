# 개발 순서 — 코드 리뷰 안내

- 기준 확인일: 2026-09-27
- 게시 코드 기준: `main@8b9c304`(PR #27 병합). 앱 구현 이력은 22번까지 포함된다.
- 관련 결정: DEC-074

## 이 문서를 보는 방법

이미 만든 코드를 처음부터 직접 리뷰하기 위한 **개발 이력 색인**이다. 앞으로 무엇을 개발할지와 구현·검증 완료 증거는 [구현 계획](implementation-plan.md#실행-상태-원장)이 원본이다. 이 문서는 그 내용을 복사하지 않고 구현 순서, 병렬 묶음, 코드·테스트 위치와 **사용자 본인의 리뷰 상태**를 관리한다.

번호는 `IMP-*` 번호가 아니라 구현 커밋 순서로 묶은 읽기 순서다. 문서 전용 작업, 의사결정과 실기기 검증은 24개 코드 리뷰 항목 수에 포함하지 않는다. 같은 묶음의 번호는 작업 완료의 선후를 뜻하지 않는다. 번호를 재사용하거나 뒤의 번호를 당겨 바꾸지 않는다.

- **구현 완료**: 해당 구현 조각이 원장의 코드·자동 검증·독립 검수 기준을 충족했다는 뜻이다. Android 실기기 성공이나 실제 OpenAI 연결 완료를 뜻하지 않는다.
- **내가 코드 리뷰 완료**: 사용자가 직접 검토한 뒤 완료를 명시한 경우만 `[x]`로 표시한다. AI의 독립 검수, 테스트 통과, PR 병합으로 대신 체크하지 않는다. 초기값은 전부 `[ ]`(완료 확인 전)이며 실제로 한 번도 읽지 않았다고 단정하는 뜻은 아니다.
- 사용자 리뷰를 완료할 때 해당 칸에 **검토한 SHA와 날짜**를 함께 적는다. 범위·기준이 불명확하면 확인 후 기록한다. 이후 코드가 바뀌어도 이전 리뷰 이력을 지우지 않고 `이전 SHA 리뷰 완료·변경분 재리뷰 대기`로 구분한다.
- 아래 파일 링크는 **이 문서를 열어 본 브랜치의 현재 파일**이다. 이후 수정이 포함될 수 있으므로 처음 만든 코드만 보려면 표의 구현 커밋 diff를 연다. 표의 SHA는 사용자 리뷰 완료 SHA가 아니다.
- 상태 표는 기준 확인일의 요약이다. 구현 상태는 원장과 함께 갱신하며 실시간 GitHub 상태로 해석하지 않는다. 23·24번은 미게시 로컬 이력을 빠뜨리지 않기 위한 별도 표시이고, 이번 문서 변경에 해당 앱 코드를 포함하지 않는다.

## 개발 순서와 개인 리뷰 현황

| 번호 | 구현한 내용 | 작업 ID | 병렬 묶음 | 구현 기준 커밋 | 구현 상태 | 내가 코드 리뷰 완료 |
|---|---|---|---|---|---|---|
| 01 | Expo 앱 실행·라우트·개발 환경 기반 | IMP-002A·002B·002R | — | [ff0c8ab](https://github.com/SujinHuh/inside-me/commit/ff0c8ab), 보완 [7df4957](https://github.com/SujinHuh/inside-me/commit/7df4957) | 구현 완료 | [ ] |
| 02 | 기록·날짜·저장·탐색 공통 계약과 테스트 기반 | IMP-003A | — | [1e76223](https://github.com/SujinHuh/inside-me/commit/1e76223) | 구현 완료 | [ ] |
| 03 | 기록 parser와 라우트·테스트 구조 보강 | IMP-003AR | — | [576476b](https://github.com/SujinHuh/inside-me/commit/576476b) | 구현 완료 | [ ] |
| 04 | 초기 감정·욕구 어휘와 로컬 가짜 탐색기 | IMP-003B1 | — | [2f020fd](https://github.com/SujinHuh/inside-me/commit/2f020fd) | 구현 완료 | [ ] |
| 05 | 앱 서비스 조합과 공통 로딩·실패 화면 | IMP-003B2 | — | [4003aaf](https://github.com/SujinHuh/inside-me/commit/4003aaf) | 구현 완료 | [ ] |
| 06 | 사용자가 고르는 대표 감정 계약 | IMP-100 | P1 선행 계약 | [7791f83](https://github.com/SujinHuh/inside-me/commit/7791f83) | 구현 완료 | [ ] |
| 07 | 하루 한 기록 SQLite 저장·조회·직렬화 | IMP-101 | **P1-A** | [05f35fc](https://github.com/SujinHuh/inside-me/commit/05f35fc) | 구현 완료 | [ ] |
| 08 | 글 입력·감정·욕구·강도 확인과 수정 화면 | IMP-102 | **P1-B** | [05f35fc](https://github.com/SujinHuh/inside-me/commit/05f35fc) | 구현 완료 | [ ] |
| 09 | 달력·날짜 상세·삭제·내보내기 진입 | IMP-103 | **P1-C** | [05f35fc](https://github.com/SujinHuh/inside-me/commit/05f35fc) | 구현 완료 | [ ] |
| 10 | 세 화면·저장·공유 통합과 데이터 안전 검증 | IMP-104·105 | P1 통합·검증 | [05f35fc](https://github.com/SujinHuh/inside-me/commit/05f35fc) | 구현 완료 | [ ] |
| 11 | 외부 AI 최소 전송·응답 검증 경계 | IMP-201 | — | [f77f30b](https://github.com/SujinHuh/inside-me/commit/f77f30b) | 구현 완료 | [ ] |
| 12 | 선택적 AI 도움 동의·실패·재시도 화면 | IMP-202 | — | [efa2347](https://github.com/SujinHuh/inside-me/commit/efa2347) | 구현 완료 | [ ] |
| 13 | 중복 저장·예외·화면 이탈 안전성 | IMP-202R | — | [c6c85f0](https://github.com/SujinHuh/inside-me/commit/c6c85f0) | 구현 완료 | [ ] |
| 14 | AI 예상 비용·예산 예약·정산·취소와 회귀 테스트 | IMP-204A·204B·204R | — | [87350ea](https://github.com/SujinHuh/inside-me/commit/87350ea), 보강 [3350576](https://github.com/SujinHuh/inside-me/commit/3350576) | 구현 완료 | [ ] |
| 15 | 합성 한국어 AI 응답 평가 기반 | IMP-204S | — | [86573ef](https://github.com/SujinHuh/inside-me/commit/86573ef) | 구현 완료 | [ ] |
| 16 | 전체 감정·욕구 카탈로그와 컬러 마음 지도 | IMP-107A·107B·107C | — | [8ae664e](https://github.com/SujinHuh/inside-me/commit/8ae664e) | 구현 완료·탐색 UI는 21~22번으로 발전 | [ ] |
| 17 | OpenAI 서버 계약·Responses 응답·HTTP 경계 | IMP-205A | — | [fe067f1](https://github.com/SujinHuh/inside-me/commit/fe067f1) | 구현 완료·실제 호출 제외 | [ ] |
| 18 | 서버 요청에 예산 예약·정산·중복 방지 연결 | IMP-205B | **P2 내부 분업** | [c7881cd](https://github.com/SujinHuh/inside-me/commit/c7881cd) | 구현 완료·실제 호출 제외 | [ ] |
| 19 | Expo HTTP와 서버 fake의 화면 통합 | IMP-205C | **P3 내부 분업** | [ead41a8](https://github.com/SujinHuh/inside-me/commit/ead41a8) | 구현 완료·테스트 주입 경로 | [ ] |
| 20 | 자유 음성 녹음·전사·삭제의 기기 비의존 상태 흐름 | IMP-301A | — | [c2d68e8](https://github.com/SujinHuh/inside-me/commit/c2d68e8) | 기반 구현 완료·마이크 UI 제외 | [ ] |
| 21 | C안 세 마음 방의 탐색·검색·선택 순수 계약 | IMP-107D | — | [713540c](https://github.com/SujinHuh/inside-me/commit/713540c) | 구현 완료 | [ ] |
| 22 | C안 세 마음 방을 실제 글 기록 화면에 연결 | IMP-107E | — | [f8d038c](https://github.com/SujinHuh/inside-me/commit/f8d038c) | 구현 완료·Android 검증 별도 | [ ] |
| 23 | 기존 C안을 보존하는 개발용 C+1 모션 비교 | IMP-107F | — | 로컬 `da85e64` | 로컬 구현 기록·게시 미완료 | [ ] |
| 24 | 첫 글 기록 화면을 C안 파스텔 표현과 연결 | IMP-107G | — | 미커밋 변경 | 로컬 구현 기록·게시 미완료 | [ ] |

## 병렬 묶음 읽는 순서

P1은 **06 공통 계약 → (07 저장 / 08 글 기록 / 09 달력 병렬) → 10 통합·검증**이다. 07→08→09 순서로 하나씩 개발했다는 뜻이 아니다. 세 작업은 동일 기준 `974a452`에서 나뉘었고 통합 구현 커밋 `05f35fc`에 함께 들어갔다. 개인 리뷰는 셋 중 하나씩 해도 되며 마지막에 10번의 연결을 확인한다.

| 묶음 | 함께 진행한 범위 | 실행 근거 |
|---|---|---|
| P1 (07~09) | A: 저장, B: 글 기록 화면, C: 달력·상세 화면. 공통 계약·통합은 주 에이전트 | [당시 배정·구현 결과](archive/product-log-legacy-20260818-20260905.md#log-20260823-008--imp-101103-병렬-구현-시작) |
| P2 (18 내부) | 공통 계약을 고정한 뒤 서버 조정자 소스와 전용 계약 테스트를 소유 파일별로 분업 | [당시 구현 결과](archive/product-log-legacy-20260818-20260905.md#log-20260825-011--imp-205b-병렬-구현-시작과-공통-계약-고정) |
| P3 (19 내부) | 공통 HTTP 계약 뒤 클라이언트 transport·서버 fake·통합 테스트 분업 | [당시 구현 결과](archive/product-log-legacy-20260818-20260905.md#log-20260825-013--imp-205c-구현-시작) |

`—`는 별도 병렬 묶음으로 확인하지 않았다는 뜻이다. 같은 날짜·커밋이라는 이유만으로 병렬이라고 추정하지 않는다. 20번의 보관 기록에는 조건부 병렬 계획이 있지만 실제 분업 완료를 확정할 근거가 부족해 묶음으로 표시하지 않았다. 구현에 참여하지 않은 서브에이전트의 **독립 검수**는 병렬 **개발**과 구분한다.

## 항목별 코드·테스트와 리뷰 질문

파일은 출발점만 연결한다. 변경 파일 전체는 표의 커밋 diff에서 확인하고, 품질 기준은 [클린 코드 지침](clean-code-guidelines.md)을 따른다. 테스트 경로를 연결한 것은 이번 문서 작업에서 테스트를 다시 실행했다는 뜻이 아니다.

### 01. Expo 기반

- 코드: [package.json](../package.json), [루트 라우트](../app/_layout.tsx). 검증 기준: [의존성 문서](dependencies.md). 당시 전용 기능 테스트 대신 실행·타입·린트·번들 검증을 사용했다.
- 질문: 실행 명령·SDK 버전의 원본이 명확한가? 라우트가 기능 로직을 직접 소유하지 않는가?

### 02. 공통 계약

- 코드: [기록 타입](../src/core/contracts/entry.ts), [저장 포트](../src/core/contracts/entry-repository.ts), [날짜 정책](../src/core/dates/local-date-key-policy.ts). 테스트: [날짜](../src/core/dates/local-date-key-policy.test.ts), [가짜 저장소 CRUD](../src/testing/fakes/in-memory-entry-repository.crud.test.ts).
- 질문: 사용자 선택·AI 제안·최종 확정이 분리되는가? 날짜와 하루 한 기록의 의미가 일치하는가?

### 03. 데이터 경계 보강

- 코드: [parser](../src/core/entries/parse-entry.ts), [라우트 계약](../src/navigation/contracts.ts). 테스트: [저장소 입력 검증](../src/testing/fakes/in-memory-entry-repository.validation.test.ts).
- 질문: 타입 선언만 믿지 않고 외부 값을 검사하는가? 허용 필드만 복사하고 호출자의 객체를 변경하지 않는가?

### 04. 초기 어휘·로컬 탐색기

- 코드: [어휘](../src/core/vocabulary/seed.ts), [결정형 탐색기](../src/infrastructure/exploration/deterministic-emotion-explorer.ts). 테스트: [탐색기](../src/infrastructure/exploration/deterministic-emotion-explorer.test.ts).
- 질문: 후보가 사용자 선택으로 자동 확정되지 않는가? 초기 대표 어휘와 16번의 확장 어휘를 구분해 읽었는가?

### 05. 앱 조합

- 코드: [서비스 조합](../src/composition/create-app-services.ts), [서비스 상태 경계](../src/composition/AppServiceBoundary.tsx). 테스트: [조합](../src/composition/create-app-services.test.ts), [상태 화면](../src/composition/AppServiceBoundary.test.tsx).
- 질문: 기능이 실제 저장 구현을 직접 생성하지 않는가? 준비 중·실패·지원 불가 상태가 구분되는가?

### 06. 대표 감정 계약

- 코드: [기록 계약](../src/core/contracts/entry.ts), [parser](../src/core/entries/parse-entry.ts). 테스트: [계약 타입 검사](../src/core/contracts/entry.typecheck.ts), [런타임 입력 검증](../src/testing/fakes/in-memory-entry-repository.validation.test.ts).
- 질문: 대표 감정은 확정 감정 목록에 속해야 하는가? AI나 첫 항목이 임의로 대표 감정이 되지 않는가?

### 07. P1-A 저장

- 코드: [SQLite 저장소](../src/infrastructure/storage/sqlite-entry-repository.ts), [JSON 직렬화](../src/core/entries/json-entry-serializer.ts). 테스트: [CRUD](../src/infrastructure/storage/sqlite-entry-repository.crud.test.ts), [실패·손상 안전성](../src/infrastructure/storage/sqlite-entry-repository.safety.test.ts).
- 질문: 같은 날짜 저장은 중복 생성 대신 갱신되는가? 트랜잭션 실패·손상 데이터·삭제를 성공처럼 숨기지 않는가?

### 08. P1-B 글 기록

- 코드: [글 기록 화면](../src/features/text-entry/TextEntryFlowScreen.tsx). 테스트: [화면 동작](../src/features/text-entry/TextEntryFlowScreen.test.tsx).
- 질문: 입력→자기 탐색→확정→저장이 이어지는가? 저장 실패 시 글과 감정·욕구 선택을 보존하는가?

### 09. P1-C 달력·상세

- 코드: [달력](../src/features/calendar/CalendarScreen.tsx), [날짜 상세](../src/features/entry-detail/EntryDetailScreen.tsx). 테스트: [달력](../src/features/calendar/CalendarScreen.test.tsx), [상세](../src/features/entry-detail/EntryDetailScreen.test.tsx).
- 질문: 빈 날짜와 조회 오류가 구분되는가? 수정·삭제·내보내기를 사용자가 명시적으로 선택하는가?

### 10. P1 통합·검증

- 코드: [네이티브 조합](../src/composition/AppProviders.native.tsx), [내보내기 조합](../src/composition/share-entry-export.ts), [파일 어댑터](../src/platform/files/expo-export-file-port.native.ts). 테스트: [내보내기](../src/composition/share-entry-export.test.ts), [파일 처리](../src/platform/files/expo-export-file-port.native.test.ts).
- 질문: 저장한 내용을 달력·상세에서 같은 저장소로 읽는가? 공유 성공·취소·실패 뒤 임시 파일을 정리하는가?

### 11. 외부 AI 경계

- 코드: [검증 탐색기](../src/infrastructure/exploration/validated-external-emotion-explorer.ts). 테스트: [응답·실패 검증](../src/infrastructure/exploration/validated-external-emotion-explorer.test.ts).
- 질문: 전송 필드가 최소화되는가? 잘못된 AI 응답과 민감한 내부 오류를 안전하게 거부하는가?

### 12. 선택적 AI 도움 화면

- 코드: [AI 도움 상태](../src/features/text-entry/useAssistantExploration.ts), [안내 패널](../src/features/text-entry/AssistantExplorationPanel.tsx). 테스트: [글 기록 흐름](../src/features/text-entry/TextEntryFlowScreen.test.tsx).
- 질문: 동의 전 전송되지 않는가? 동의 단계 취소·실패·재시도에서 초안이 남는가? 요청 중 취소 버튼까지 구현됐다고 오해하지 않았는가?

### 13. 저장 안전성

- 코드: [글 기록 화면](../src/features/text-entry/TextEntryFlowScreen.tsx). 테스트: [중복 저장·예외·이탈 회귀](../src/features/text-entry/TextEntryFlowScreen.test.tsx).
- 질문: 빠른 중복 호출도 한 번만 저장되는가? 화면 이탈 뒤 늦은 완료가 이동이나 상태 변경을 일으키지 않는가?

### 14. 비용·예산

- 코드: [비용 계산](../src/core/ai-costs/ai-cost-calculator.ts), [예산 관리](../src/core/ai-costs/ai-cost-budget.ts). 테스트: [계산](../src/core/ai-costs/ai-cost-calculator.test.ts), [예산·상태 전이](../src/core/ai-costs/ai-cost-budget.test.ts).
- 질문: 요청별 단가와 예약→정산·취소가 일관적인가? 추정·로컬 차단을 공급자 과금의 완전한 하드 캡으로 표현하지 않는가?

### 15. 합성 AI 평가

- 코드: [합성 평가](../src/testing/ai-evaluation/synthetic-emotion-evaluation.ts). 테스트: [평가 계약](../src/testing/ai-evaluation/synthetic-emotion-evaluation.test.ts).
- 질문: 실제 일기가 아닌 합성 데이터만 사용하는가? 정답 감정 판정이 아닌 스키마·안전 경계를 평가하는가?

### 16. 전체 어휘·지도 확장

- 코드: [어휘 정본 데이터](../src/core/vocabulary/seed.ts), [탐색 그룹](../src/core/vocabulary/groups.ts). 테스트: [어휘](../src/core/vocabulary/seed.test.ts), [그룹](../src/core/vocabulary/groups.test.ts).
- 질문: 감정 161개·욕구 110개가 검색·선택되는가? 목록 [MD 정본](references/emotion-needs-vocabulary.md)과 런타임 ID·기존 저장 호환성을 구분하는가? 당시 지도 UI는 커밋 diff로 보고 현재 C안은 21~22번에서 확인한다.

### 17. OpenAI 서버 경계

- 코드: [요청 계약](../server/ai/emotion-suggestions-contract.ts), [HTTP gateway](../server/ai/openai-responses-http-gateway.ts). 테스트: [계약](../server/ai/emotion-suggestions-contract.test.ts), [gateway](../server/ai/openai-responses-http-gateway.test.ts).
- 질문: 비밀 키가 클라이언트에 들어가지 않는가? 요청·공급자 응답·usage를 실제 호출 없이도 검증하는가?

### 18. P2 서버 예산 조정자

- 코드: [예산 조정자](../server/ai/budgeted-emotion-suggestion-provider.ts). 테스트: [예산·중복·취소](../server/ai/budgeted-emotion-suggestion-provider.test.ts).
- 질문: 호출 이후 취소를 무조건 0원으로 처리하지 않는가? 메모리 내 중복 방지를 서버 재시작까지 보장한다고 과장하지 않는가?

### 19. P3 HTTP fake 통합

- 코드: [클라이언트 transport](../src/infrastructure/exploration/http-external-emotion-explorer-transport.ts), [서버 fake 조합](../server/ai/create-fake-emotion-suggestions-http-handler.ts). 테스트: [HTTP](../src/infrastructure/exploration/http-external-emotion-explorer-transport.test.ts), [화면 통합](../src/composition/http-ai-app-services.test.tsx).
- 질문: 응답 본문 읽기까지 timeout이 적용되는가? 테스트 주입 경로를 기본 앱의 실제 OpenAI 연결로 오해하지 않는가?

### 20. 자유 음성 기반

- 코드: [포트 계약](../src/application/voice-recording/contracts.ts), [세션 상태 흐름](../src/application/voice-recording/free-voice-recording-session.ts). 테스트: [전사·삭제·재시도](../src/application/voice-recording/free-voice-recording-session.test.ts).
- 질문: 임시 오디오 삭제 실패를 성공으로 넘기지 않는가? 마이크 권한·전사 API·음성 UI는 아직 제외라는 경계가 명확한가?

### 21. C안 순수 탐색

- 코드: [탐색 계약·로직](../src/core/emotion-exploration/emotion-exploration.ts). 테스트: [검색·분류·선택](../src/core/emotion-exploration/emotion-exploration.test.ts).
- 질문: 충족감정·미충족감정·욕구를 오가도 선택을 보존하는가? 욕구 8영역과 전체 어휘에 접근할 수 있는가?

### 22. C안 실제 화면

- 코드: [세 마음 방](../src/features/emotion-review/EmotionExplorationRooms.tsx), [글 기록 조합](../src/features/text-entry/TextEntryFlowScreen.tsx). 테스트: [마음 방](../src/features/emotion-review/EmotionExplorationRooms.test.tsx), [전체 글 흐름](../src/features/text-entry/TextEntryFlowScreen.test.tsx).
- 질문: 사용자가 스스로 읽고 선택하는 것이 첫 경로인가? 직접 추가·모름·검색·혼합 선택·접근성 이름이 유지되는가?

### 23. 로컬 C+1 모션 비교

- 위치: 로컬 `codex/c-plus-one-motion-preview@da85e64`의 `src/features/emotion-review/GentleEmotionMotion.tsx`, `EmotionExplorationVariantPicker.tsx`와 모션 테스트. 이 게시 트리에는 없는 파일이므로 존재하지 않는 GitHub 링크를 만들지 않는다. 근거: 보관본 `LOG-20260827-005`, `LOG-20260827-009`.
- 질문: 기존 C안이 기본값인가? 모션 감소 설정과 선택 보존을 지키는가? 해당 로컬 커밋을 확보한 뒤 리뷰하며 Android 체감 검증은 별도다.

### 24. 로컬 첫 글 화면 표현 통일

- 위치: 로컬 `codex/c-plus-one-motion-preview`의 미커밋 `src/features/text-entry/TextEntryFlowScreen.tsx`, 해당 화면 테스트, `src/ui/tokens.ts`, `src/features/emotion-review/EmotionExplorationRooms.tsx`. 같은 이름의 게시 파일에는 이 수정이 포함되지 않는다. 근거: 보관본 `LOG-20260827-008`, `LOG-20260827-009`.
- 질문: 첫 글 작성 영역과 C안의 색·버튼·간격이 이어지는가? 키보드·큰 글자·대비 검증이 구분되는가? 리뷰 대상을 커밋 또는 고정 diff로 확보하기 전에는 완료 표시하지 않는다.

## 이 목록을 다 읽어도 별도로 남는 검증

- Android 저장·복원·수정·삭제 통합 검증: `IMP-106`, [실기기 체크리스트](device-validation-checklist.md).
- 실제 OpenAI 소액 계측·기기 연결: `IMP-204C`, `IMP-205D`, [실행 상태 원장](implementation-plan.md#실행-상태-원장).
- 실제 마이크·전사 연결은 `IMP-301B` 이후 범위다. AI 음성 핑퐁은 별도 후속 범위이며 20번 완료에 포함되지 않는다.

사용자의 코드 리뷰 결과와 수정 요청은 이 문서에서 검토한 기준을 식별하고, 실제 수정·검증 진행은 구현 원장에서 관리한다. 문서 유지 방식은 [개발 순서와 개인 코드 리뷰 기록](development-workflow.md#개발-순서와-개인-코드-리뷰-기록)을 따른다.
