# Slack Unread

Slack 데스크톱 앱의 Dock 배지를 읽어 키에 미확인 알림 상태를 표시합니다. 키를 누르면 Slack 을 앞으로 가져옵니다.

Slack 토큰이나 API 를 쓰지 않고 macOS `lsappinfo` 로 배지만 읽기 때문에 별도 인증이 필요 없습니다. 대신 Slack 데스크톱 앱이 실행 중이어야 하고, 채널별 상세 정보는 알 수 없습니다.

## 키 표시

| Slack 배지 | 키 |
|---|---|
| 숫자 (멘션/DM) | 빨간 배경에 숫자 (99 초과 시 `99+`) |
| `•` (안 읽은 채널만) | `#` 아이콘 + 노란 점 |
| 없음 | 회색 `#` 아이콘 |
| Slack 미실행 | 흐린 아이콘 + `Off` |

3초마다 폴링하며, 배지가 바뀔 때만 아이콘을 다시 그립니다 (`plugin/app.js` 의 `POLL_INTERVAL_MS`).

## 개발

```bash
npm install
npm test
```

- `plugin/app.js` : Ulanzi Studio 연결, 폴링, 키 이벤트 처리
- `plugin/slackBadge.js` : `lsappinfo` 출력 파싱과 SVG 아이콘 생성 (순수 로직, 테스트 대상)
- `plugin/ulanzi-api/` : 공식 Node SDK 복사본 ([plugin-common-node](https://github.com/UlanziTechnology/plugin-common-node) @ `9e478b2`)
