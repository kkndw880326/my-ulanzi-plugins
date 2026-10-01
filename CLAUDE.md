# CLAUDE.md

## 이 저장소의 성격

이 저장소는 **Ulanzi D200X 스트림덱(Ulanzi Studio)용 개인 플러그인 모음**이다.
별도 설명이 없으면 이 폴더에서 받는 개발 요청은 다음 둘 중 하나로 해석한다.

- 새 Ulanzi Studio 플러그인을 만드는 요청 (예: "키를 누르면 X 하는 기능", "키에 Y 상태를 표시")
- 기존 플러그인(`com.ulanzi.*.ulanziPlugin/`)을 수정하는 요청

Elgato Stream Deck SDK(`@elgato/streamdeck`, `streamDeck.actions` 등)는 사용하지 않는다. 구조는 비슷하지만 manifest 필드, UUID 규칙, API가 서로 다르다.
요청이 기존 플러그인 수정인지 새 플러그인인지 모호하면 먼저 물어본다.

## 플러그인 구조 (참고 구현: `com.ulanzi.slackunread.ulanziPlugin/`)

```
com.ulanzi.{pluginName}.ulanziPlugin/
├── manifest.json          # 플러그인/액션 정의
├── en.json, ko_KR.json    # manifest 의 Name/Description/Actions 다국어
├── package.json           # "type": "module", test 스크립트: node --test test/*.test.js
├── README.md              # 플러그인 설명 (한국어)
├── assets/icons/          # pluginIcon.svg, categoryIcon.svg, actionIcon.svg
├── plugin/
│   ├── app.js             # 진입점 (manifest 의 CodePath). Ulanzi Studio 연결과 이벤트 처리
│   ├── {logic}.js         # 순수 로직 (파싱, 아이콘 생성 등). 테스트 대상
│   └── ulanzi-api/        # 공식 Node SDK 복사본 (수정하지 않음)
└── test/{logic}.test.js   # node:test + node:assert/strict
```

- 새 플러그인을 만들 때는 위 구조와 Slack Unread의 코드 스타일(ESM, `$UD = new UlanziApi()`, `ACTION_CACHES[context]` 패턴, `onAdd/onSetActive/onRun/onClear/onClose` 핸들러)을 그대로 따른다.
- Ulanzi Studio에 의존하는 코드는 `app.js`에 두고, 테스트할 수 있는 순수 로직은 별도 모듈로 분리한다.
- 키 아이콘은 SVG를 생성한 뒤 `$UD.setBaseDataIcon(context, data)`로 그린다.

## 명명 규칙

- 폴더명: `com.ulanzi.{pluginName}.ulanziPlugin`
- 메인 서비스 UUID: `com.ulanzi.ulanzistudio.{pluginName}`. 점으로 구분된 구간이 **정확히 4개**여야 한다.
- 액션 UUID: `com.ulanzi.ulanzistudio.{pluginName}.{actionName}`. 구간이 **5개 이상**이어야 한다.
- `app.js`의 `PLUGIN_UUID`는 manifest의 `UUID`와 일치해야 한다.
- manifest의 `Author`는 `kkndw880326`을 쓴다.

## SDK / 레퍼런스

- Node SDK: [UlanziTechnology/plugin-common-node](https://github.com/UlanziTechnology/plugin-common-node)를 `plugin/ulanzi-api/`에 복사해서 사용한다 (Apache-2.0). 타입은 `plugin/ulanzi-api/apiTypes.d.ts`를 참고한다.
- manifest 레퍼런스: [UlanziDeckPlugin-SDK/manifest.md](https://github.com/UlanziTechnology/UlanziDeckPlugin-SDK/blob/main/manifest.md)
- 대상 플랫폼은 기본적으로 macOS다 (manifest `OS`: `mac`).

## 테스트 / 설치

```bash
cd com.ulanzi.{pluginName}.ulanziPlugin && npm test
scripts/install.sh com.ulanzi.{pluginName}.ulanziPlugin
```

- `install.sh`는 플러그인을 `~/Library/Application Support/Ulanzi/UlanziDeck/Plugins/`로 rsync한다. 반영하려면 Ulanzi Studio를 재시작해야 한다.
- 설치 대상 폴더를 덮어쓰므로, 실행하기 전에 사용자에게 확인한다.

## 새 플러그인을 추가한 뒤

- 루트 `README.md`의 "플러그인 목록" 표에 한 줄 추가한다.
- 플러그인 폴더의 `README.md`에 동작, 키 표시 방식, 개발 방법(파일별 역할)을 적는다.
