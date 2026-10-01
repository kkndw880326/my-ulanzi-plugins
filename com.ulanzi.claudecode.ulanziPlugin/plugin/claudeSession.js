import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

/**
 * Claude 데스크톱 앱의 "새 Claude Code 세션" 딥링크
 *
 * 공식 문서에는 없고, 앱 번들(app.asar)의 URL 핸들러와 Finder 서비스
 * "New Claude Code Session Here" 가 쓰는 형태를 그대로 따른다.
 *   claude://code/new?folder=<URL 인코딩된 절대경로>
 * 앱 업데이트로 바뀔 수 있으므로 키별 설정에서 터미널 방식으로 강제할 수 있게 한다.
 */
export const CLAUDE_NEW_SESSION_URL = 'claude://code/new';

// 새 일반 채팅. 앱의 Dock 메뉴 "New Chat" 이 쓰는 딥링크와 같다.
// 앱이 없으면 같은 화면을 브라우저에서 연다.
export const CLAUDE_NEW_CHAT_URL = 'claude://claude.ai/new?surface=chat';
export const WEB_NEW_CHAT_URL = 'https://claude.ai/new';

// 'auto'     : 딥링크로 열고, open 이 실패하면(앱 미설치/스킴 미등록) 터미널로 연다
// 'terminal' : 항상 터미널에서 claude CLI 를 실행한다
export const OPEN_MODES = ['auto', 'terminal'];

/**
 * 폴더 선택 대화상자 결과나 저장된 설정의 경로를 정리한다.
 * file:// URL 로 오는 경우도 대비하고, 끝의 '/' 는 제거한다 (루트 '/' 는 유지).
 */
export function normalizeFolder(value) {
  let folder = typeof value === 'string' ? value.trim() : '';
  if (folder.startsWith('file://')) {
    try {
      folder = fileURLToPath(folder);
    } catch {
      return '';
    }
  }
  if (folder.length > 1) folder = folder.replace(/\/+$/, '');
  return folder;
}

export function normalizeSettings(param) {
  const settings = param || {};
  return {
    folder: normalizeFolder(settings.folder),
    openMode: OPEN_MODES.includes(settings.openMode) ? settings.openMode : 'auto',
  };
}

export function buildSessionUrl(folder) {
  return `${CLAUDE_NEW_SESSION_URL}?folder=${encodeURIComponent(folder)}`;
}

// POSIX 셸 single-quote 인용: ' 는 '\'' 로 바꿔 끼운다
export function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

/**
 * 터미널 대안용 .command 스크립트
 *
 * - 사용자의 로그인 + 인터랙티브 셸(-lic)로 claude 를 실행해야 ~/.zshrc 등의 PATH 가 적용된다
 * - claude 가 끝나도 창이 닫히지 않도록 같은 폴더에서 로그인 셸을 이어서 띄운다
 * - 임시 파일이므로 실행되자마자 스스로 지운다
 */
export function buildTerminalScript(folder) {
  return [
    '#!/bin/sh',
    `cd -- ${shellQuote(folder)} || exit 1`,
    'rm -f -- "$0"',
    'clear',
    '"${SHELL:-/bin/zsh}" -lic claude',
    'exec "${SHELL:-/bin/zsh}" -l',
    '',
  ].join('\n');
}

function run(file, args) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: 10000 }, err => (err ? reject(err) : resolve()));
  });
}

export async function assertFolder(folder) {
  if (!folder) throw new Error('folder is not set');
  if (!path.isAbsolute(folder)) throw new Error(`folder is not absolute: ${folder}`);

  const stat = await fs.stat(folder);
  if (!stat.isDirectory()) throw new Error(`not a directory: ${folder}`);
}

export async function openInApp(folder) {
  await openUrl(buildSessionUrl(folder));
}

export async function openInTerminal(folder) {
  const scriptPath = path.join(os.tmpdir(), `claudecode-${crypto.randomUUID()}.command`);
  await fs.writeFile(scriptPath, buildTerminalScript(folder), { mode: 0o700 });
  try {
    await run('open', ['-a', 'Terminal', scriptPath]);
  } catch (err) {
    await fs.rm(scriptPath, { force: true });
    throw err;
  }
}

/**
 * 설정에 따라 새 세션을 연다. 실제로 연 방식('app' | 'terminal')을 반환한다.
 * 폴더가 잘못됐거나 두 방식 모두 실패하면 reject 한다.
 */
export async function openSession({ folder, openMode }) {
  await assertFolder(folder);

  if (openMode !== 'terminal') {
    try {
      await openInApp(folder);
      return 'app';
    } catch {
      // 앱이 없거나 claude:// 스킴이 등록되지 않음 → 터미널로 대신 연다
    }
  }

  await openInTerminal(folder);
  return 'terminal';
}

function openUrl(url) {
  return run('open', [url]);
}

/**
 * 새 채팅을 연다. 실제로 연 방식('app' | 'browser')을 반환한다.
 * @param {(url: string) => Promise<void>} open 테스트에서 바꿔 끼울 수 있도록 주입받는다
 */
export async function openChat(open = openUrl) {
  try {
    await open(CLAUDE_NEW_CHAT_URL);
    return 'app';
  } catch {
    // 앱이 없거나 claude:// 스킴이 등록되지 않음 → 브라우저로 대신 연다
  }

  await open(WEB_NEW_CHAT_URL);
  return 'browser';
}

export function folderLabel(folder) {
  return path.basename(folder) || folder;
}

/**
 * 키에 들어갈 수 있도록 폴더 이름을 여러 줄로 나눈다.
 * '-', '_', '.', 공백 뒤에서 우선 끊고, 그래도 긴 토큰은 maxChars 단위로 자른다.
 * 줄 수를 넘으면 마지막 줄 끝을 '…' 로 바꾼다.
 */
export function wrapLabel(text, maxChars = 10, maxLines = 3) {
  const tokens = text.match(/[^-_. ]+[-_. ]*|[-_. ]+/g) || [];
  const lines = [];
  let line = '';

  for (let token of tokens) {
    while (token) {
      if ((line + token).length <= maxChars) {
        line += token;
        token = '';
      } else if (line) {
        lines.push(line);
        line = '';
      } else {
        lines.push(token.slice(0, maxChars));
        token = token.slice(maxChars);
      }
    }
  }
  if (line) lines.push(line);

  const trimmed = lines.map(l => l.trimEnd()).filter(Boolean);
  if (trimmed.length > maxLines) {
    trimmed.length = maxLines;
    trimmed[maxLines - 1] = trimmed[maxLines - 1].slice(0, maxChars - 1) + '…';
  }
  return trimmed;
}

export function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const SIZE = 196;
const ACCENT = '#d97757';

// Claude 로고 대신 범용 터미널 프롬프트 '>_' 글리프를 그린다 (상표 이미지 사용 회피)
function promptGlyph(color, opacity = 1) {
  return `<g stroke="${color}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${opacity}">`
    + '<polyline points="66,30 88,48 66,66"/>'
    + '<line x1="98" y1="68" x2="132" y2="68"/>'
    + '</g>';
}

function frame(body, background = '#1f1f24') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">`
    + `<rect width="${SIZE}" height="${SIZE}" rx="28" fill="${background}"/>`
    + body
    + '</svg>';
}

// 글리프 아래 영역(약 y=100~188)에 줄 수에 맞춰 세로 가운데 정렬한다
function textLines(lines, color, fontSize) {
  const top = 116 + (3 - lines.length) * 16;
  return lines.map((line, i) => `<text x="98" y="${top + i * 32}" text-anchor="middle" `
    + `font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${fontSize}" fill="${color}">`
    + `${escapeXml(line)}</text>`).join('');
}

/**
 * @param {string} folder      설정된 폴더 (없으면 빈 문자열)
 * @param {string} emptyText   폴더가 없을 때 표시할 문구 (다국어 처리는 호출하는 쪽에서)
 */
export function renderSvg(folder, emptyText = 'No folder') {
  if (!folder) {
    return frame(promptGlyph('#8a8a92', 0.4) + textLines(wrapLabel(emptyText), '#8a8a92', 26));
  }

  const lines = wrapLabel(folderLabel(folder));
  return frame(promptGlyph(ACCENT) + textLines(lines, '#ffffff', lines.length === 1 ? 30 : 26));
}

export function renderIconData(folder, emptyText) {
  return 'data:image/svg+xml;base64,' + Buffer.from(renderSvg(folder, emptyText)).toString('base64');
}
