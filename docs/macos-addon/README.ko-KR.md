# macOS용 NotebookAid — Thunderbird 설정

[English](README.en-US.md) | [简体中文](README.zh-CN.md) | [繁體中文（香港）](README.zh-HK.md) | [Deutsch](README.de-DE.md) | [Français](README.fr-FR.md) | [Italiano](README.it-IT.md) | [Español](README.es-ES.md) | [Português (Portugal)](README.pt-PT.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md)

## 앱과 부가 기능 설치

1. Apple M 시리즈 Mac은 arm64, Intel은 x64를 선택하세요. DMG를 열어 NotebookAid.app을 /Applications로 끌어 놓고 한 번 실행하세요. 이 테스트 앱은 임시 서명을 사용하며 Developer ID 서명과 Apple 공증은 없습니다. macOS에서 차단하면 정확한 메시지를 보존하고 시스템 전체 보안을 끄지 마세요.
2. Thunderbird → 부가 기능 및 테마 → 톱니바퀴 → 파일에서 부가 기능 설치에서 같은 산출물에 포함된 NotebookAid.xpi를 선택하세요. Windows 패키지는 필요하지 않습니다. XPI는 압축을 풀지 마세요. 처음 설치할 때는 호환성 이전 도우미가 필요하지 않습니다.
3. Thunderbird 157.0 이상이 필요하며 프로젝트 검증 기준은 157.0.1입니다. 이전 ESR 버전은 검증 범위가 아닙니다.

## 로컬 브리지 등록

앱을 위 경로에 설치한 후 macOS 터미널에서 실행하세요. 별도의 Node.js 설치나 sudo는 필요하지 않습니다.

```sh
ELECTRON_RUN_AS_NODE=1 "/Applications/NotebookAid.app/Contents/MacOS/NotebookAid" "/Applications/NotebookAid.app/Contents/Resources/Register-Bridge-macOS.cjs" "/Applications/NotebookAid.app"
```

성공하면 `NotebookAid bridge registered for the current user.`가 표시됩니다. 등록 파일은 `~/Library/Application Support/Mozilla/NativeMessagingHosts/`에 생성됩니다. 네트워크 포트나 시스템 서비스를 설정하지 않습니다.

## 연결 및 문제 해결

Thunderbird를 종료했다가 다시 열고 NotebookAid에서 테스트 노트북을 연 다음 부가 기능의 다시 연결을 누르세요. 앱 열기 및 백그라운드 시작으로 로컬 앱을 실행할 수 있습니다.

재부팅 후에도 등록이 유지됩니다. 같은 경로에서 앱을 업데이트하면 일반적으로 재등록이 필요하지 않습니다. 앱을 이동하기 전에 원래 앱이 있는 상태에서 위 명령 끝에 `--remove`를 추가하여 실행하고 새 위치에서 다시 등록하세요. 다른 경로를 사용하면 세 앱 경로를 모두 수정하세요. 다른 경로를 가리키는 기존 등록은 거부됩니다. 등록 파일을 함부로 지우지 말고 오류를 보존하세요.

연결되지 않으면 Thunderbird 버전과 앱 경로를 확인하고 두 앱을 다시 실행한 뒤 터미널 및 부가 기능 오류 메시지를 보존하세요. 이 macOS 테스트 버전은 Passkey 앱 잠금을 지원하지 않으므로 Windows 앱 잠금 설정을 복사하지 마세요. 노트북 암호화는 계속 사용할 수 있습니다. 실제 Thunderbird 통합은 사용자 테스트가 필요합니다.

산출물에는 SHA256, DMG/ZIP, 부가 기능 및 설정 가이드가 포함됩니다. 정식 릴리스가 아니며 자동 업데이트는 활성화되지 않았습니다.

## Windows 테스트 다운로드

[EXE / 포터블 ZIP](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml): `NotebookAid-windows-x64-test`. [네이티브 MSI](https://github.com/lvbeck/NotebookAid/actions/workflows/windows-build.yml): `NotebookAid-windows-x64-msi-test`. GitHub에 로그인하여 성공한 실행에서 다운로드하세요. MSI는 현재 사용자/모든 사용자 설치를 지원하고 이름은 NotebookAid로 유지됩니다. 별도 서명 업데이트 채널을 사용하지만 미서명 테스트 버전에는 활성 업데이트 원본이 없습니다. [MSI 가이드](../msi-testing.md)를 참고하세요.
