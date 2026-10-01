# my-ulanzi-plugins

Ulanzi D200X(Ulanzi Studio)용 개인 플러그인 모음입니다. 플러그인마다 `com.ulanzi.{이름}.ulanziPlugin/` 폴더 하나를 사용합니다.

## 플러그인 목록

| 플러그인 | 설명 | 플랫폼 |
|---|---|---|
| [Slack Unread](com.ulanzi.slackunread.ulanziPlugin/) | Slack Dock 배지(미확인 알림)를 키에 표시하고, 누르면 Slack 을 엽니다 | macOS |

## 설치

```bash
scripts/install.sh com.ulanzi.slackunread.ulanziPlugin
```

`~/Library/Application Support/Ulanzi/UlanziDeck/Plugins/` 로 복사한 뒤 Ulanzi Studio 를 재시작하세요.

## 새 플러그인 추가 규칙

- 폴더명: `com.ulanzi.{pluginName}.ulanziPlugin`
- 메인 서비스 UUID: `com.ulanzi.ulanzistudio.{pluginName}` (점으로 구분된 정확히 4 구간)
- 액션 UUID: `com.ulanzi.ulanzistudio.{pluginName}.{actionName}` (5 구간 이상)
- Node.js SDK 는 [UlanziTechnology/plugin-common-node](https://github.com/UlanziTechnology/plugin-common-node) 를 `plugin/ulanzi-api/` 에 복사해서 사용 (Apache-2.0)
- manifest 레퍼런스: [UlanziDeckPlugin-SDK/manifest.md](https://github.com/UlanziTechnology/UlanziDeckPlugin-SDK/blob/main/manifest.md)
