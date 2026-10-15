# NotebookAid

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文（香港）](README.zh-HK.md) | [Deutsch](README.de-DE.md) | [Français](README.fr-FR.md) | [Italiano](README.it-IT.md) | [Español](README.es-ES.md) | [Português (Portugal)](README.pt-PT.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md)

**로컬 노트 및 AI 글쓰기 도우미**

*로컬에 기록하고, 차분히 생각하며, 지능의 메아리를 듣다.*

NotebookAid는 선택적 Thunderbird 부가 기능을 제공하는 오픈 소스 데스크톱 노트 앱입니다. 노트북은 선택한 로컬 폴더에 저장됩니다. AI 글쓰기, 요약, 번역은 사용자가 직접 생성을 요청할 때만 선택한 제공업체에 노트 텍스트를 전송합니다.

## 기능

- 지원되는 안전한 범위의 Markdown 및 HTML 서식 편집, TXT, 기본 Quill Delta를 지원합니다. 지원하지 않는 내용은 소스 모드로 보호됩니다.
- 여러 노트북, 하위 폴더, 검색, 태그, 고정 및 최근 노트, 첨부 파일, 자동 저장, 버전 기록, 휴지통.
- 선택적 노트 암호화, 노트북별 마스터 비밀번호와 복구 키, 백업 및 복원, Windows Passkey 앱 잠금.
- 노트북 색상과 표지, 밝은/어두운/시스템 테마, 10개 인터페이스 언어: 영어, 중국어 간체, 중국어 번체(홍콩), 독일어, 프랑스어, 이탈리아어, 스페인어, 포르투갈어(포르투갈), 일본어, 한국어. 시작 가이드와 끌 수 있는 이스터 에그 수집도 제공합니다.
- 로컬 Native Messaging을 통한 Thunderbird 통합 및 ICS 파일의 Tasks 가져오기.
- 선택적 AI 지원: ChatGPT 구독 로그인, Gemini 또는 Claude API 키. 사용 자격과 약관은 제공업체에 따르며 제공업체나 결제 방식을 자동으로 바꾸지 않습니다.

## 테스트 버전 다운로드

현재 테스트 산출물만 제공하며 정식 릴리스는 없습니다. Windows와 macOS는 숫자로만 구성된 버전 번호를 공유합니다. GitHub에 로그인하고 성공한 실행의 Artifacts에서 다운로드하세요.

- [EXE 설치 관리자 / 포터블 ZIP](https://github.com/lvbeck/NotebookAid/actions/runs/38720219079/artifacts/11966390541): `NotebookAid-windows-x64-test`.
- [네이티브 MSI 설치 관리자](https://github.com/lvbeck/NotebookAid/actions/runs/38720219079/artifacts/11966420461): `NotebookAid-windows-x64-msi-test`.
- [macOS 패키지](https://github.com/lvbeck/NotebookAid/actions/runs/38720219074): `NotebookAid-macos-arm64-test` / `NotebookAid-macos-x64-test`.

## 설치 및 제한 사항

먼저 외부 산출물 ZIP의 압축을 푸세요. EXE와 MSI는 별도 산출물이며 현재 사용자 또는 모든 사용자 설치를 지원합니다. 종류를 전환하기 전에 다른 종류를 제거하세요. 제품 이름은 NotebookAid입니다. MSI는 10개 언어 선택을 제공하며 중국어 간체는 Microsoft YaHei를 사용합니다.

macOS는 Apple Silicon arm64 및 Intel x64용 DMG/ZIP, NotebookAid.xpi, 10개 언어의 부가 기능 및 브리지 설정 가이드를 제공합니다. DMG/ZIP에는 Windows 방식 설치 마법사가 없습니다.

패키지는 30일, 검증 보고서는 14일 보관됩니다. 만료되면 최신 성공 실행을 선택하세요. 테스트 전에 노트북을 백업하세요. 프로그램 파일 교체는 데이터 복원이 아닙니다.

## 서명, 업데이트 및 개인정보

Windows 테스트 패키지는 서명되지 않았으며 SignPath Foundation 심사를 기다리고 있습니다. Chrome이 다운로드를 차단할 수 있습니다. 서명이 없다는 이유만으로 오탐이라고 단정할 수 없습니다. 경고를 보존하고 출처와 SHA256을 확인하세요. 시스템 전체 보안을 끄지 마세요.

macOS는 임시 서명을 사용하며 Developer ID 서명 또는 Apple 공증은 없습니다. 실제 Mac, Thunderbird, Keychain 및 AI 계정 테스트는 아직 필요합니다. 이 macOS 테스트 버전은 Passkey 앱 잠금을 지원하지 않습니다. Windows 10도 실제 기기 검증이 필요합니다.

현재 테스트 패키지에는 활성 자동 업데이트 원본이 없습니다. MSI는 별도의 GitHub latest-msi.json 서명 업데이트 채널을 사용하며 확인 후 Windows Installer를 실행합니다. NSIS 업데이트를 설치하지 않습니다. Actions 산출물은 업데이트 피드가 아닙니다. AI 인증, 모델 확인, 승인된 인증 갱신은 네트워크를 사용하며 노트 텍스트는 직접 생성할 때만 전송됩니다.

[MSI](docs/msi-testing.md) · [Windows CI](docs/windows-ci-testing.md) · [macOS](docs/macos-testing.md) · [Privacy](docs/privacy.md) · [Signing](docs/code-signing-policy.md)

## 소스 실행 및 빌드

Node.js 24.x(24.15 이상, CI는 24.21.0)를 사용하세요. Windows에는 PowerShell과 .NET Framework C# 컴파일러가 필요하고 MSI에는 Visual C++ x64 빌드 도구와 Windows SDK도 필요합니다. macOS 패키지는 macOS에서 빌드하세요.

```sh
npm ci
npm run build
npm run test:platform
npm start
```

Windows PowerShell:

```powershell
npm run package
npm run installer
npm run installer:msi
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/Build-TestBundle.ps1
```

`release/installer` · `release/msi` · `release/`

macOS Terminal (Apple Silicon: arm64; Intel: x64):

```sh
node scripts/create-macos-icon.cjs
npm run package:mac -- arm64
npm run installer:mac -- arm64
node scripts/build-macos-addon.cjs
```

`release/macos`

## 문서 및 개발

기술 및 인수 문서 대부분은 중국어입니다. Electron, TypeScript, Angular/CDK, Quill 2.x, SQLite, Native Messaging, Lucide를 사용하며 정확한 버전은 잠금 파일에 기록됩니다. 이전 진행 상태가 현재 인수 승인을 의미하지 않습니다. Explorer 새로 만들기 메뉴는 보류 중이며 Gemini Notebook 동기화는 향후 범위입니다.

[Requirements](docs/requirements.md) · [Architecture](docs/architecture.md) · [Data model](docs/data-model.md) · [API](docs/api-contract.md) · [Plan](docs/implementation-plan.md) · [Acceptance](docs/acceptance.md) · [History](docs/testing-history.md) · [Licenses](docs/sources-and-licenses.md) · [AGENTS.md](AGENTS.md)

## 라이선스 및 연락처

[BSD-3-Clause](LICENSE) · Copyright © 2026 Jin Lu.

[it@live.cn](mailto:it@live.cn)
