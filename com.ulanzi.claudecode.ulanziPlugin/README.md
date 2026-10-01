# Claude

Claude 데스크톱 앱을 키 하나로 여는 액션 모음입니다.

| 액션 | 동작 | 실패 시 대안 |
|---|---|---|
| 새 Claude Code 세션 | 키마다 지정한 폴더에서 새 Claude Code 세션을 엽니다 (프로젝트별로 키 하나씩) | 터미널에서 `claude` 실행 |
| 새 채팅 | 새 일반 채팅을 엽니다 (설정 없음) | 브라우저에서 `https://claude.ai/new` |

## 새 채팅

`claude://claude.ai/new?surface=chat` 딥링크를 엽니다. 앱의 Dock 메뉴 "New Chat" 이 쓰는 것과 같은 형태입니다. Claude 앱이 없거나 `claude://` 가 등록되지 않아 `open` 이 실패하면 기본 브라우저로 `https://claude.ai/new` 를 엽니다.

## 새 Claude Code 세션

### 설정 (키별)

| 항목 | 설명 |
|---|---|
| 폴더 | 폴더 아이콘을 눌러 선택. 키에는 폴더 이름이 표시됩니다 |
| 열기 방식 | `Claude 앱 (실패 시 터미널)` (기본) / `항상 터미널` |

### 여는 방식

1. **Claude 앱**: `claude://code/new?folder=<경로>` 딥링크를 엽니다. Claude 데스크톱 앱의 Finder 서비스 "New Claude Code Session Here" 가 쓰는 것과 같은 형태입니다.
2. **터미널 (대안)**: 임시 `.command` 파일을 만들어 Terminal 에서 엽니다. 해당 폴더로 이동한 뒤 로그인 셸에서 `claude` 를 실행하고, `claude` 가 끝나도 같은 폴더의 셸이 남습니다. 임시 파일은 실행되자마자 지워집니다. AppleScript 를 쓰지 않으므로 "자동화" 권한 팝업이 뜨지 않습니다.

| 상황 | 동작 |
|---|---|
| Claude 앱이 없거나 `claude://` 가 등록되지 않음 (`open` 실패) | 자동으로 터미널 방식으로 엽니다 |
| 앱은 열리는데 폴더가 지정되지 않음 (앱 업데이트로 딥링크가 바뀐 경우) | 감지할 수 없습니다. 열기 방식을 `항상 터미널` 로 바꿔 주세요 |
| 폴더가 지정되지 않았거나 사라짐 | 아무것도 열지 않고 키에 에러 표시 (`showAlert`) |

딥링크는 공식 문서에 없는 형태라 앱 업데이트로 바뀔 수 있습니다. 실패 원인은 Ulanzi Studio 의 플러그인 로그(`logMessage`)에 남습니다.

### 신뢰 확인 메시지

앱 방식으로 열면 이미 신뢰한 폴더여도 매번 "이 워크스페이스를 신뢰하시겠습니까?" 가 뜹니다. 앱 로그(`~/Library/Logs/Claude/main.log`)를 보면 딥링크로 열 때는 저장된 신뢰를 조회(`checkTrust`)하지 않고 바로 확인을 받은 뒤 저장(`saveTrust`)만 합니다. 외부 딥링크(`src=external`)로 폴더를 지정하면 매번 확인하는 보안 장치로, 플러그인에서 끌 수 없습니다. 확인 없이 바로 열고 싶으면 열기 방식을 `항상 터미널` 로 두세요. CLI 는 한 번 신뢰한 폴더(`~/.claude.json` 의 `hasTrustDialogAccepted`)는 다시 묻지 않습니다.

## 개발

```bash
npm install
npm test
```

- `plugin/app.js` : Ulanzi Studio 연결, 키별 설정 캐시, 액션별 키 이벤트 처리
- `plugin/claudeSession.js` : 세션·채팅 딥링크, 터미널 스크립트 생성, 셸 인용, 키 아이콘 SVG (테스트 대상)
- `property-inspector/newsession/` : 키별 설정 화면 (폴더 선택, 열기 방식)
- `plugin/ulanzi-api/` : 공식 Node SDK 복사본 ([plugin-common-node](https://github.com/UlanziTechnology/plugin-common-node) @ `9e478b2`)
- `libs/` : 설정 화면용 공식 HTML SDK 복사본 ([plugin-common-html](https://github.com/UlanziTechnology/plugin-common-html) @ `0aeb6a2`)
