# 대소라이브 프론트엔드 규칙

이 파일은 이 저장소의 프론트엔드 작업에 적용한다. 제품 범위와 보안 기준은 `PROJECT_PLAN.md`, 상세 동작은 `DESIGN.md`를 우선한다.

## 기본 원칙

- React, TypeScript, Vite, pnpm을 사용한다.
- 가장 작은 변경으로 현재 요구사항만 구현한다. 미래 기능용 폴더, 추상화, 설정은 만들지 않는다.
- 새 의존성보다 브라우저 API, React 기본 기능, CSS를 먼저 사용한다.
- 범위 밖 리팩터링, 포맷팅, 파일 이동은 하지 않는다.

## 아키텍처: FSD Lite

다음 네 계층만 사용한다.

```text
src/
├── app/       # 앱 초기화, Provider, 라우팅
├── pages/     # 경로 단위 화면 조립
├── features/  # auth, random-chat, support-chat, admin-inquiry
└── shared/    # 둘 이상의 기능에서 재사용하는 UI와 순수 로직
```

- 의존 방향은 `app → pages → features → shared`만 허용한다.
- `shared`는 상위 계층을 참조하지 않고, feature끼리 직접 참조하지 않는다. 여러 feature의 조합은 `pages`에서 한다.
- `pages`는 화면을 조립하고, 통신·상태 전이·도메인 규칙은 해당 feature가 소유한다.
- feature 내부의 `ui`, `model`, `api` 폴더는 관련 파일이 실제로 둘 이상 생길 때만 만든다.
- `random-chat`은 매칭·WebSocket·암호화·메모리 메시지를, `support-chat`은 사용자 문의를, `admin-inquiry`는 관리자 문의를 각각 소유한다.
- 공통 코드가 두 기능 이상에서 실제로 사용될 때만 `shared`로 옮긴다.
- `entities`는 같은 도메인 모델과 규칙이 여러 feature에서 반복될 때, `widgets`는 여러 feature를 조합한 블록이 여러 page에서 재사용될 때만 추가한다.
- 현재 Mock UI는 다음 실제 구현에서 수정하는 부분부터 이 구조로 옮긴다. 구조 변경만을 위한 일괄 이동은 하지 않는다.
- `utils.ts`, 단일 구현 interface, factory, 불필요한 barrel export는 만들지 않는다.

데이터 흐름은 `사용자 입력 → feature model → feature api → 외부 시스템`으로 보내고, 응답은 반대 방향으로 UI에 반영한다. 인증 세션처럼 앱 전체에 필요한 상태만 `app`에서 제공하고, 채팅 연결과 메시지는 해당 feature 안에 둔다.

## React와 TypeScript

- 함수 컴포넌트와 명시적인 `Props` 타입을 사용하고 `React.FC`는 사용하지 않는다.
- 상태는 가장 가까운 컴포넌트에 둔다. 실제 전역 요구가 생기기 전에는 상태 관리 라이브러리를 추가하지 않는다.
- 계산 가능한 값은 state로 중복 저장하지 않는다.
- `useEffect`는 외부 시스템 동기화에만 사용하고 구독·타이머는 정리한다.
- `any` 대신 구체 타입을 사용하며, 외부 입력은 `unknown`으로 받고 경계에서 검증한다.
- 고정된 상태 집합은 `enum`보다 문자열 union을 우선한다.
- 컴포넌트·타입은 `PascalCase`, 함수·변수는 `camelCase`, 진짜 상수만 `UPPER_SNAKE_CASE`를 사용한다.

## UI와 스타일

- 모바일 우선으로 구현하고 AID WebView의 Safe Area와 `100dvh`를 고려한다.
- 기존 디자인 토큰과 plain CSS를 사용한다. Tailwind, CSS-in-JS, UI 라이브러리는 필요성이 확인되기 전에는 추가하지 않는다.
- class 이름은 역할이 드러나는 kebab-case로 작성한다.
- 의미에 맞는 HTML 요소를 사용하고 버튼 `type`, form label, 키보드 조작, 대비, 터치 영역을 지킨다.
- 라이트·다크 모드 모두 깨지지 않게 확인한다.

## 데이터와 보안

- API·WebSocket 처리는 화면 컴포넌트에서 분리하되, 실제 연동 전에는 가짜 service 계층을 만들지 않는다.
- `fetch`, `WebSocket`, Web Crypto API를 우선한다. 캐시 요구가 생기기 전에는 데이터 패칭 라이브러리를 추가하지 않는다.
- 원본 AID 토큰, 랜덤채팅 메시지, 복호화 키를 `localStorage`, 전역 상태, 로그에 넣지 않는다.
- 랜덤채팅과 문의채팅의 데이터 경계를 섞지 않는다. 랜덤채팅은 저장하지 않고, 문의채팅만 별도 저장 대상으로 취급한다.
- 관리자 권한은 클라이언트 표시 여부가 아니라 서버에서 검증한다.

## 검증

- 분기·파서·보안 경계 같은 비단순 로직에는 가장 작은 자동 테스트 하나를 남긴다.
- 작업 후 `pnpm test`와 `pnpm build`를 실행한다.
- UI 변경은 최소 484×872 화면과 관련 경로를 브라우저에서 확인한다.
- AID 실기기, 서버, 두 사용자 통신을 확인하지 않았다면 완료 보고에서 분리해 명시한다.

## 현재 구현 경계

- 현재 hash 기반 이동과 mock 데이터는 프론트 시안 검증용이다.
- AID SDK, 인증, 서버, WebSocket, 암호화는 실제 연동 단계에서 필요한 범위만 추가한다.
- 사용자가 요청하지 않으면 commit, push, PR을 만들지 않는다.
