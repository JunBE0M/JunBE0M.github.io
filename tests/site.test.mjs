import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = resolve(root, "index.html");
const html = readFileSync(htmlPath, "utf8");

test("portfolio materials are downloadable and ReSTAR has a project figure", () => {
  const downloadPaths = [
    "./assets/documents/restar-paper.pdf",
    "./assets/documents/oas-mil-paper.pdf",
    "./assets/documents/atsc-paper.docx",
  ];

  const anchors = [...html.matchAll(/<a\b[^>]*>/gi)].map((match) => match[0]);
  for (const path of downloadPaths) {
    const anchor = anchors.find((candidate) => candidate.includes(`href="${path}"`));
    assert.ok(anchor, `Missing download link: ${path}`);
    assert.match(anchor, /\sdownload(?:=|\s|>)/i, `Download attribute is required: ${path}`);
    assert.ok(existsSync(resolve(root, path.replace(/^\.\//, ""))), `Missing download file: ${path}`);
  }

  const restarProject = html.match(/<article\b[^>]*id="project-restar"[\s\S]*?<\/article>/i)?.[0] ?? "";
  assert.ok(restarProject.includes("./assets/restar-framework.png"), "ReSTAR project figure is missing");
  assert.match(restarProject, /data-lightbox/i, "ReSTAR figure should open in the image dialog");
  assert.ok(existsSync(resolve(root, "assets/restar-framework.png")), "ReSTAR figure file is missing");
});

test("research internships are listed with dates and lab links", () => {
  for (const value of [
    "서울대학교 학부생 연구인턴",
    "2026.02–2026.07",
    "https://imsilab.github.io/imsi/",
    "중앙대학교 학부생 연구인턴",
    "2026.08–현재",
    "https://sites.google.com/view/vig-lab/home",
  ]) {
    assert.ok(html.includes(value), `Missing internship detail: ${value}`);
  }
});

test("채용 담당자가 확인된 기본 정보와 연락처를 볼 수 있다", () => {
  for (const value of [
    "이준범",
    "중앙대학교 AI학과",
    "2027년 2월 졸업 예정",
    "Computer Vision",
    "Multimodal AI",
    "junbeom.lee02@gmail.com",
    "https://github.com/JunBE0M",
  ]) {
    assert.match(html, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("대표 프로젝트와 검증된 연구 상태가 빠짐없이 표시된다", () => {
  for (const value of [
    "ReSTAR",
    "자율주행 경로 예측",
    "SpotU",
    "MRI 기반 PNI 예측",
    "3D 편집 연구",
    "AAAI 2027",
    "심사 중",
    "제7회 한국인공지능학술대회",
    "게재 수락",
    "APCCAS 2026",
    "Poster 수락",
  ]) {
    assert.ok(html.includes(value), `공개 콘텐츠에 '${value}'가 있어야 합니다.`);
  }
});

test("예시 이력과 임시 링크가 공개 화면에 남지 않는다", () => {
  const forbidden = [
    "연구 질문을 검증 가능한 실험으로 옮깁니다.",
    "문제와 역할이 보이는 작업",
    "함께 풀 문제를 이야기해 주세요.",
    "AI Engineer 신입 포지션과 연구 협업에 열려 있습니다.",
    "Medical Image Classification",
    "Korean Review Sentiment Model",
    "Experiment Tracking Pipeline",
    "Efficient Fine-Tuning for Domain-Specific Language Models",
    "Survey: Multimodal Retrieval-Augmented Generation",
    "AI Hackathon",
    "Dean's List",
    "your.email@example.com",
    "linkedin.com",
  ];

  for (const value of forbidden) {
    assert.ok(!html.toLowerCase().includes(value.toLowerCase()), `'${value}'를 제거해야 합니다.`);
  }
  assert.doesNotMatch(html, /href\s*=\s*["']#["']/i);
});

test("문서 ID와 이미지 대체 텍스트가 접근 가능하게 구성된다", () => {
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/gi)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "중복된 id가 없어야 합니다.");

  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  assert.ok(images.length >= 3, "프로필과 실제 프로젝트 이미지를 사용해야 합니다.");
  for (const image of images) {
    assert.match(image, /\salt=["'][^"']+["']/i, `대체 텍스트가 필요합니다: ${image}`);
  }
});

test("공개 문서가 참조하는 모든 로컬 파일이 존재한다", () => {
  const expectedAssets = [
    "./assets/profile-junbeom.jpg",
    "./assets/atsc-framework.png",
    "./assets/atsc-cases.png",
    "./assets/spotu-demo.mp4",
  ];

  for (const asset of expectedAssets) {
    assert.ok(html.includes(asset), `${asset}를 페이지에서 사용해야 합니다.`);
  }

  const localReferences = [
    ...html.matchAll(/\s(?:src|href)=["'](\.\/[^"']+)["']/gi),
  ].map((match) => match[1]);

  for (const reference of localReferences) {
    const target = resolve(root, reference.replace(/^\.\//, ""));
    assert.ok(existsSync(target), `로컬 파일이 없습니다: ${reference}`);
    assert.ok(statSync(target).size > 0, `로컬 파일이 비어 있습니다: ${reference}`);
  }
});

test("내부 링크의 목적지가 존재하고 새 창 링크가 안전하게 구성된다", () => {
  const ids = new Set([...html.matchAll(/\sid=["']([^"']+)["']/gi)].map((match) => match[1]));
  const anchors = [...html.matchAll(/<a\b[^>]*>/gi)].map((match) => match[0]);

  for (const anchor of anchors) {
    const href = anchor.match(/\shref=["']([^"']+)["']/i)?.[1];
    assert.ok(href, `모든 링크에 목적지가 필요합니다: ${anchor}`);

    if (href.startsWith("#")) {
      assert.ok(ids.has(href.slice(1)), `내부 링크 목적지가 없습니다: ${href}`);
    }

    if (/\starget=["']_blank["']/i.test(anchor)) {
      assert.match(anchor, /\srel=["'][^"']*noreferrer[^"']*["']/i);
    }
  }
});
