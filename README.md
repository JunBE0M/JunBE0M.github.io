# 이준범 AI 포트폴리오

중앙대학교 AI학과 이준범의 연구·개발 경험을 정리한 GitHub Pages용 정적 포트폴리오입니다. 별도 프레임워크나 빌드 과정 없이 HTML, CSS, JavaScript로 동작합니다.

## 로컬 미리보기

저장소 루트에서 다음 명령을 실행합니다.

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

브라우저에서 `http://127.0.0.1:8000`으로 접속합니다.

## 구조

- `index.html`: 소개, 프로젝트, 논문, 경험, 학력·활동, 연락처
- `styles.css`: 타이포그래피, 레이아웃, 반응형 스타일과 접근성 상태
- `script.js`: 모바일 메뉴, 프로젝트 이미지 확대, 현재 연도 표시
- `assets/`: 프로필 사진, ATSC 연구 이미지, SpotU 시연 영상, favicon
- `tests/site.test.mjs`: 콘텐츠·링크·자산·접근성 소스 검사
- `tests/browser-smoke.mjs`: Chrome 기반 데스크톱·모바일 동작 검사와 스크린샷 생성
- `screenshots/`: 현재 데스크톱·모바일 미리보기

## 콘텐츠 근거

포트폴리오 문구와 다운로드 자료는 사용자 제공 ReSTAR 원고, OAS-MIL arXiv 원고, ATSC 학술대회 원고, SpotU 시연 영상과 사용자 명시 이력을 기준으로 구성했습니다. ReSTAR 익명 심사 원고와 Figure 3을 포함한 제공 자료 3종을 사이트에서 내려받을 수 있으며, 확인되지 않은 수상·CV·LinkedIn·성과 지표는 공개하지 않습니다.

## 검증

```powershell
node --test tests/site.test.mjs
node tests/browser-smoke.mjs
```

브라우저 검사는 1440×1200 데스크톱과 390×844 모바일 화면에서 가로 넘침, 모바일 메뉴, 프로젝트 상세, 이미지 확대 dialog, 로컬 파일 경로와 콘솔 오류를 확인합니다.

현재 변경 사항은 로컬 첫 수정본이며 push, merge, GitHub Pages 배포를 수행하지 않았습니다.
