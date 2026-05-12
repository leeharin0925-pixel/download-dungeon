# 🏰 Download Dungeon RPG

> 다운로드 폴더 정리를 RPG 게임처럼! 파일을 정리하면 경험치와 레벨을 얻어요.

![offline · local only](https://img.shields.io/badge/offline-local%20only-brightgreen)
![Electron](https://img.shields.io/badge/Electron-36393f?logo=electron)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

## ✨ 기능

- 🔍 **던전 탐색** - 다운로드 폴더 파일 스캔
- 👾 **AI 추천** - 오래된 파일, 임시파일 자동 감지 (외부 API 없음)
- 🗂️ **아이템 정리** - 파일 타입별 자동 분류
- ⚔️ **파일 처치** - 불필요한 파일 선택 삭제
- 🏆 **업적 시스템** - 정리할수록 업적 달성
- 📊 **통계 시각화** - 파일 타입 분포 차트
- 🔔 **알림** - 방치된 파일 알림

## 🔒 보안

- 모든 파일 처리는 **로컬에서만** 진행
- 외부 서버로 파일명/경로/내용 **전송 없음**
- 네트워크 호출 없음

## 🚀 설치 및 실행

### 요구사항
- Node.js 18 이상
- npm

### 설치

```bash
git clone https://github.com/leeharin0925-pixel/download-dungeon.git
cd download-dungeon
npm install
```

### 실행

```bash
npm run dev
```

> ⚠️ 반드시 Electron 창으로 실행해야 다운로드 폴더에 접근할 수 있어요.

## 🎮 사용 방법

1. **다운로드 던전 탐색** 버튼으로 파일 스캔
2. **중복/AI 추천 분석** 버튼으로 불필요한 파일 확인
3. 체크박스로 삭제할 파일 선택 후 **처치**
4. **아이템 정리** 버튼으로 파일 타입별 자동 분류

## 🛠️ 기술 스택

- Electron
- React + TypeScript
- Vite
- electron-vite

## 📁 정리 구조

```
Downloads/
└── DungeonSorted/
    ├── Images/
    ├── Documents/
    ├── Archives/
    ├── Video/
    ├── Audio/
    ├── Code/
    └── Other/
```

---

Made with ❤️ by [@leeharin0925-pixel](https://github.com/leeharin0925-pixel)