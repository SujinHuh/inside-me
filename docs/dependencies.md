# Inside Me 의존성 기준

- 작성일: 2026-08-20
- 적용 단계: IMP-002A, IMP-002B, IMP-003A, IMP-003B2
- 패키지 관리자: npm 11.12.1
- Node.js: 24.15.0 LTS
- Expo SDK: 54 (`expo` 54.0.37, lockfile 기준)

## 버전 선택

Expo 공식 문서는 Node.js LTS를 요구하고, 2026-08-20 기준 앱 스토어의 Expo Go와 함께 학습·검증하는 경로에 SDK 54를 선택하도록 안내한다. Android Expo Go QR 검증을 최초 성공선으로 확정한 DEC-029와 맞추기 위해 `default@sdk-54` 템플릿의 버전을 기준으로 고정했다.

- Expo 프로젝트 생성: https://docs.expo.dev/get-started/create-a-project/
- Node.js 릴리스 일정: https://github.com/nodejs/Release/blob/main/schedule.json

## 초기 런타임 패키지

| 범주 | 패키지 | 이유 |
|---|---|---|
| 앱 기반 | `expo`, `react`, `react-native` | Android·웹에서 공유하는 React Native 앱 실행 |
| 라우팅 | `expo-router`, `expo-linking`, `expo-constants` | 파일 기반 라우트와 링크·앱 설정 연결 |
| 화면 기반 | `react-native-safe-area-context`, `react-native-screens`, `expo-status-bar` | 안전 영역, 네이티브 화면, 상태 표시줄 처리 |
| 웹 기반 | `react-dom`, `react-native-web` | 후속 PWA 검증을 위한 Expo 웹 실행 |
| Android 로컬 저장 기반 | `expo-sqlite` 16.0.10 | Expo Go 안에서 구조화된 기록을 기기 DB에 보존하고 후속 repository·마이그레이션 어댑터를 구현 |
| 개발 검증 | `typescript`, `eslint`, `eslint-config-expo`, `@types/react` | 엄격한 타입 검사와 Expo 권고 린트 |
| 계약·화면 테스트 | `jest`, `jest-expo`, `@types/jest`, `@testing-library/react-native`, `react-test-renderer` | Expo 공식 Jest 환경, 공통 계약 회귀와 후속 React Native 화면 상호작용 검증 |

테스트 러너는 [Expo의 Jest 단위 테스트 공식 가이드](https://docs.expo.dev/develop/unit-testing/)를 따른다. React와 renderer의 버전 차이로 렌더링 결과가 달라지지 않도록 `react`와 `react-test-renderer`를 19.1.0으로 정확히 맞췄다. 테스트 패키지는 앱 런타임 번들에 포함되지 않는 개발 의존성이다.

## 라이선스와 데이터 전송

- 초기 패키지는 Expo 공식 SDK 54 템플릿과 Expo Router 필수 구성에서 선택했다. 설치된 직접 의존성은 TypeScript의 Apache-2.0을 제외하면 모두 MIT 라이선스를 사용한다.
- 이 런타임 패키지만으로는 감정 기록이나 음성을 외부 AI·분석 서비스로 전송하지 않는다.
- npm 설치는 npm registry에서 패키지를 다운로드하고, Expo 개발 도구는 버전 확인과 Expo Go 연결을 위해 네트워크를 사용할 수 있다. [Expo CLI 공식 문서](https://docs.expo.dev/more/expo-cli/)에 따르면 CLI는 기본적으로 익명 사용량 텔레메트리를 수집할 수 있으므로 이 저장소의 Expo 명령은 `scripts/expo-cli.cjs`에서 `EXPO_NO_TELEMETRY=1`을 강제한다. 실제 일기 원문은 개발 도구에 넣지 않는다.
- EAS, 외부 AI, 분석, 오류 수집, 계정 로그인은 이 단계에서 추가하지 않았다.
- [`expo-sqlite` SDK 54 공식 문서](https://docs.expo.dev/versions/v54.0.0/sdk/sqlite/)는 Expo Go 포함과 앱 재시작 후 DB 지속성을 명시한다. 패키지와 전이 의존성 `await-lock`은 MIT이며, 기본 로컬 SQLite 사용은 감정 기록을 외부 서비스로 전송하지 않는다.
- Android 네이티브에서는 `SQLiteProvider`로 DB를 열고 WAL·외래 키를 활성화한다. 현재 단계는 저장 기술과 조합 경계만 고정하며 실제 기록 schema·CRUD·마이그레이션은 IMP-101에서 parser와 repository 계약 테스트를 적용한다.
- SQLite 파일은 운영체제 앱 sandbox에 있지만 앱 계층 암호화는 아직 적용하지 않았다. 개인 로컬 도그푸딩 범위에서만 사용하고 외부 배포·기기 위협 모델 확장 전에 암호화와 백업 노출을 다시 검토한다.
- 공식 문서상 웹 SQLite는 alpha이며 WASM·COOP·COEP 설정이 필요하다. Android 첫 흐름을 늦추지 않기 위해 웹 Provider는 현재 영속 저장을 연결하지 않고 후속 PWA 단계에서 별도 어댑터로 검증한다.

Expo CLI를 사용하는 프로젝트 명령은 운영체제별 환경 변수 문법 차이 없이 동일한 정책을 적용하기 위해 작은 Node 래퍼를 사용한다. 이 래퍼는 Expo CLI를 같은 Node 프로세스 버전으로 실행하고 텔레메트리 비활성화 변수만 추가한다. 린트는 Expo CLI를 거치지 않고 캐시 없는 ESLint를 직접 실행한다. 별도 외부 의존성이나 서비스는 추가하지 않는다.

## 2026-08-20 npm audit 결과

- IMP-002에서는 Node 24.15.0·npm 11.12.1에서 `npm ci` 후 `npm audit`을 실행했을 때 18개(중간 9, 높음 9, 치명적 0)가 보고됐다.
- IMP-003A 테스트 개발 의존성 설치 후에는 19개(중간 10, 높음 9, 치명적 0)가 보고됐다. 새 중간 위험을 포함한 경로와 외부 배포 전 해소 가능성은 독립 검수와 SDK 상향 게이트에서 다시 확인한다.
- IMP-003B2에서 `expo-sqlite` 16.0.10을 추가하고 고정 환경에서 `npm ci`한 뒤에도 19개(중간 10, 높음 9, 치명적 0)로 총수와 등급은 늘지 않았다.
- 보고된 경로는 SDK 54의 Expo CLI·Metro·PostCSS·이미지 크기 분석·iOS Xcode 설정 관련 전이 의존성이다. 현재 앱은 외부 입력 파일을 서버에서 번들하거나 외부 사용자에게 배포하지 않는 로컬 개발 단계다.
- npm이 제시한 자동 수정은 `expo` 57로의 주 버전 상향이며 현재 Expo Go SDK 54 검증 결정과 충돌한다. 따라서 `npm audit fix --force`는 실행하지 않았다.
- 위험 수용 범위는 개발자 본인의 로컬 도그푸딩까지다. 외부 배포·신뢰할 수 없는 번들 입력·EAS 도입 전에 SDK 상향 또는 공식 보안 패치 가능성을 다시 검토한다.
