# 이준범 AI 포트폴리오 전면 개편 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이준범의 확인된 연구·개발 이력과 실제 자료를 반영한 반응형 한글 AI 포트폴리오 첫 수정본을 만들고 로컬 브라우저에서 검증한다.

**Architecture:** 기존 정적 HTML/CSS/JavaScript 구조를 유지하고, 핵심 콘텐츠는 `index.html`에 의미론적으로 직접 작성한다. `script.js`는 모바일 메뉴·이미지 확대·연도 표기만 점진적으로 보강하며, Node 내장 기능만 사용한 소스 검증과 Chrome DevTools Protocol 기반 브라우저 스모크 테스트로 검증한다.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript, Node.js 내장 테스트 러너, Chrome headless

**Spec:** `docs/superpowers/specs/2026-09-30-portfolio-redesign-design.md`

## Global Constraints

- React, Next.js, 번들러, 서버 API, 비밀 키를 추가하지 않는다.
- JavaScript가 없어도 핵심 콘텐츠와 프로젝트 상세를 읽을 수 있어야 한다.
- 확인되지 않은 수상·기간·성능·링크를 표시하지 않는다.
- ReSTAR 심사 원고와 figure는 공개하지 않는다.
- 상대 경로만 사용하고 임시 `href="#"`를 만들지 않는다.
- push, merge, GitHub Pages 배포를 수행하지 않는다.

## Review Focus

- 360px 모바일 너비에서 가로 넘침 없이 모든 한글·영문 논문 제목이 줄바꿈되어야 한다. Task 4 브라우저 검사에서 `scrollWidth <= innerWidth`를 검증한다.
- JavaScript가 실패해도 프로젝트 상세는 `<details>`로 열 수 있고 핵심 콘텐츠가 DOM에 남아야 한다. Task 1 소스 검사와 Task 2 마크업으로 고정한다.
- 모바일 메뉴는 키보드와 포인터로 열리고 링크 선택 또는 Escape 후 닫혀야 한다. Task 3 브라우저 스모크 테스트로 검증한다.
- 이미지 확대 dialog는 키보드로 열고 Escape로 닫을 수 있어야 한다. Task 3 브라우저 스모크 테스트로 검증한다.
- 외부 링크와 로컬 자산 경로가 유효하고 가짜 연락처·예시 콘텐츠가 없어야 한다. Task 1 소스 검사로 검증한다.

---

### Task 1: 검증 계약과 실제 자산 준비

**Files:**
- Create: `tests/site.test.mjs`
- Create: `assets/profile-junbeom.jpg`
- Create: `assets/atsc-framework.png`
- Create: `assets/atsc-cases.png`
- Create: `assets/spotu-demo.mp4`

**Interfaces:**
- Consumes: 사용자 제공 JPG, ATSC DOCX 내부 이미지, SpotU MP4
- Produces: HTML에서 참조할 상대 경로 `./assets/<filename>`와 `node --test` 검증 계약

- [ ] **Step 1: `tests/site.test.mjs`에 실패하는 소스 계약 작성**

  `index.html`이 실제 이름·이메일·다섯 프로젝트·확인된 학회 상태를 포함하고 예시 콘텐츠, 빈 링크, 중복 ID, 누락 로컬 자산, alt 없는 이미지가 없음을 단언한다.

- [ ] **Step 2: 실패 확인**

  Run: `node --test tests/site.test.mjs`
  Expected: 기존 예시 콘텐츠와 누락 실제 콘텐츠 때문에 FAIL

- [ ] **Step 3: 사용자 제공 자산을 명시된 파일명으로 복사**

  프로필 JPG와 SpotU MP4를 복사하고, ATSC DOCX의 `word/media/image1.png`, `image2.png`를 framework·cases 파일로 추출한다.

- [ ] **Step 4: 자산 경로 확인**

  Run: `Get-ChildItem assets | Select-Object Name,Length`
  Expected: 네 실제 자산이 0바이트보다 큼

### Task 2: 의미론적 콘텐츠와 정보 구조

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: Task 1의 자산 경로와 설계 문서의 확인된 콘텐츠
- Produces: `#about`, `#projects`, `#publications`, `#experience`, `#activities`, `#contact`; `.menu-toggle`; `.project-details`; `[data-lightbox]`; `#image-dialog`

- [ ] **Step 1: 실제 콘텐츠로 `index.html` 전면 교체**

  헤더·소개·다섯 프로젝트·세 논문/원고·연구 경험·학력/봉사·연락처를 의미론적 HTML로 작성하고 상세는 네이티브 `<details>`로 제공한다.

- [ ] **Step 2: Task 1 소스 검사 실행**

  Run: `node --test tests/site.test.mjs`
  Expected: HTML 콘텐츠·링크·자산 관련 테스트 PASS

- [ ] **Step 3: JavaScript 비활성 가독성 확인**

  Run: `node -e "const h=require('fs').readFileSync('index.html','utf8'); if(!h.includes('<details')||h.includes('hidden>')) process.exit(1)"`
  Expected: exit 0

### Task 3: 시각 체계와 점진적 상호작용

**Files:**
- Modify: `styles.css`
- Modify: `script.js`
- Create: `tests/browser-smoke.mjs`

**Interfaces:**
- Consumes: Task 2의 클래스와 data 속성
- Produces: `setMenu(open: boolean)`, 네이티브 dialog 확대 동작, 데스크톱·모바일 CDP 검사

- [ ] **Step 1: 브라우저 동작 검사를 먼저 작성**

  로컬 정적 서버와 Chrome headless를 실행하고 모바일 메뉴 열기/닫기, 프로젝트 상세 열기, 이미지 dialog 열기/Escape 닫기, 콘솔 오류 수집을 단언한다.

- [ ] **Step 2: 실패 확인**

  Run: `node tests/browser-smoke.mjs`
  Expected: 새 selector 또는 동작이 없어 FAIL

- [ ] **Step 3: `styles.css` 전면 교체**

  아이보리·남색·청록 토큰, 읽기 폭, 세리프/산세리프 위계, 행형 프로젝트 레이아웃, 논문 목록, 경험 타임라인, 반응형 메뉴, focus-visible, reduced-motion, dialog를 구현한다.

- [ ] **Step 4: `script.js`에 점진적 동작 구현**

  `setMenu(open)`으로 aria 상태를 동기화하고 메뉴 링크/Escape/리사이즈 처리, `[data-lightbox]`와 dialog 연결, 현재 연도 표기를 구현한다.

- [ ] **Step 5: 소스 및 브라우저 검사 실행**

  Run: `node --test tests/site.test.mjs; node tests/browser-smoke.mjs`
  Expected: 모든 assertion PASS, 콘솔 error 0

### Task 4: 실제 화면 검토와 문서화

**Files:**
- Create: `screenshots/portfolio-desktop.png`
- Create: `screenshots/portfolio-mobile.png`
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 3의 완성 사이트와 브라우저 스모크 테스트
- Produces: 사용자가 확인할 스크린샷과 로컬 실행 명령

- [ ] **Step 1: 데스크톱 1440×1200과 모바일 390×844 스크린샷 생성**

  Run: `node tests/browser-smoke.mjs`
  Expected: 두 PNG 생성, 각 해상도에서 `scrollWidth <= innerWidth`

- [ ] **Step 2: 스크린샷을 직접 검토**

  프로필 사진 비율, 한글 줄바꿈, 프로젝트 상세, figure 가독성, 모바일 메뉴 겹침을 확인한다.

- [ ] **Step 3: 발견한 시각 문제 수정 후 재검사**

  Run: `node --test tests/site.test.mjs; node tests/browser-smoke.mjs`
  Expected: PASS 및 최신 스크린샷 생성

- [ ] **Step 4: README 갱신**

  `python -m http.server 8000` 실행과 `http://localhost:8000` 접속 방법, 콘텐츠 근거와 비배포 상태를 기록한다.

- [ ] **Step 5: 최종 변경 범위 확인**

  Run: `git status --short; git diff --check; git diff --stat`
  Expected: 계획된 파일만 변경되고 whitespace error 없음
