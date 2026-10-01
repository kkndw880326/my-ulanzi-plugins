import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

import {
  normalizeFolder, normalizeSettings, buildSessionUrl, shellQuote, buildTerminalScript,
  assertFolder, openSession, openChat, CLAUDE_NEW_CHAT_URL, WEB_NEW_CHAT_URL, folderLabel, wrapLabel, escapeXml, renderSvg, renderIconData,
} from '../plugin/claudeSession.js';

const run = promisify(execFile);

// 공백, 작은따옴표, 명령 치환, 글롭 문자가 모두 들어간 까다로운 폴더 이름
const TRICKY_NAME = `my proj's $(touch pwned) *dir`;

async function makeTempDir(name = 'dir') {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'claudecode-test-'));
  const dir = path.join(base, name);
  await fs.mkdir(dir);
  return { base, dir };
}

test('normalizeFolder: 공백과 끝의 / 를 정리한다', () => {
  assert.equal(normalizeFolder('  /Users/me/proj/ '), '/Users/me/proj');
  assert.equal(normalizeFolder('/Users/me/proj//'), '/Users/me/proj');
  assert.equal(normalizeFolder('/'), '/');
});

test('normalizeFolder: file:// URL 은 경로로 바꾼다', () => {
  assert.equal(normalizeFolder('file:///Users/me/my%20proj/'), '/Users/me/my proj');
});

test('normalizeFolder: 문자열이 아니면 빈 문자열', () => {
  assert.equal(normalizeFolder(undefined), '');
  assert.equal(normalizeFolder(null), '');
  assert.equal(normalizeFolder(42), '');
});

test('normalizeSettings: 알 수 없는 openMode 는 auto', () => {
  assert.deepEqual(normalizeSettings(undefined), { folder: '', openMode: 'auto' });
  assert.deepEqual(normalizeSettings({ folder: '/a/', openMode: 'bogus' }), { folder: '/a', openMode: 'auto' });
  assert.deepEqual(normalizeSettings({ folder: '/a', openMode: 'terminal' }), { folder: '/a', openMode: 'terminal' });
});

test('buildSessionUrl: folder 파라미터로 인코딩되고 그대로 복원된다', () => {
  const folder = '/Users/me/한글 & 특수?#=문자';
  const url = new URL(buildSessionUrl(folder));

  assert.equal(url.protocol, 'claude:');
  assert.equal(url.host, 'code');
  assert.equal(url.pathname, '/new');
  assert.deepEqual(url.searchParams.getAll('folder'), [folder]);
});

test('shellQuote: sh 에서 원래 문자열 그대로 해석된다', async () => {
  for (const value of [TRICKY_NAME, "it's", "''", '$HOME `id` "x" \\ \n end', '']) {
    const { stdout } = await run('/bin/sh', ['-c', `printf %s ${shellQuote(value)}`]);
    assert.equal(stdout, value);
  }
});

test('buildTerminalScript: 지정 폴더에서 셸로 claude 를 실행하고 스스로 지워진다', async () => {
  const { base, dir } = await makeTempDir(TRICKY_NAME);
  try {
    // 실제 claude 대신 받은 인자와 현재 폴더를 출력하는 가짜 셸
    const fakeShell = path.join(base, 'fake-shell');
    await fs.writeFile(fakeShell, '#!/bin/sh\necho "RUN|$PWD|$*"\n', { mode: 0o755 });

    const script = path.join(base, 'session.command');
    await fs.writeFile(script, buildTerminalScript(dir), { mode: 0o700 });

    const { stdout } = await run(script, [], { cwd: base, env: { ...process.env, SHELL: fakeShell, TERM: 'dumb' } });
    const runs = stdout.split('\n').filter(line => line.startsWith('RUN|'));
    assert.deepEqual(runs, [`RUN|${dir}|-lic claude`, `RUN|${dir}|-l`]);
    await assert.rejects(fs.access(script), { code: 'ENOENT' });
    await assert.rejects(fs.access(path.join(dir, 'pwned')), { code: 'ENOENT' });
    await assert.rejects(fs.access(path.join(base, 'pwned')), { code: 'ENOENT' });
  } finally {
    await fs.rm(base, { recursive: true, force: true });
  }
});

test('buildTerminalScript: 폴더가 없으면 claude 를 실행하지 않는다', async () => {
  const { base } = await makeTempDir();
  try {
    const fakeShell = path.join(base, 'fake-shell');
    await fs.writeFile(fakeShell, '#!/bin/sh\necho "RUN|$*"\n', { mode: 0o755 });
    const script = path.join(base, 'session.command');
    await fs.writeFile(script, buildTerminalScript(path.join(base, 'missing')), { mode: 0o700 });

    const result = await run(script, [], { env: { ...process.env, SHELL: fakeShell } }).catch(err => err);
    assert.equal(result.code, 1);
    assert.doesNotMatch(result.stdout, /RUN\|/);
  } finally {
    await fs.rm(base, { recursive: true, force: true });
  }
});

test('assertFolder: 존재하는 절대경로 폴더만 통과', async () => {
  const { base, dir } = await makeTempDir();
  try {
    const file = path.join(base, 'file.txt');
    await fs.writeFile(file, '');

    await assertFolder(dir);
    await assert.rejects(assertFolder(''), /not set/);
    await assert.rejects(assertFolder('relative/dir'), /not absolute/);
    await assert.rejects(assertFolder(path.join(base, 'missing')), { code: 'ENOENT' });
    await assert.rejects(assertFolder(file), /not a directory/);
  } finally {
    await fs.rm(base, { recursive: true, force: true });
  }
});

test('openSession: 폴더가 잘못되면 아무것도 열지 않고 reject', async () => {
  await assert.rejects(openSession({ folder: '', openMode: 'auto' }), /not set/);
  await assert.rejects(openSession({ folder: '/no/such/claudecode-dir', openMode: 'terminal' }), { code: 'ENOENT' });
});

test('openChat: 앱 딥링크로 연다', async () => {
  const opened = [];
  const result = await openChat(async url => { opened.push(url); });

  assert.equal(result, 'app');
  assert.deepEqual(opened, [CLAUDE_NEW_CHAT_URL]);

  const url = new URL(CLAUDE_NEW_CHAT_URL);
  assert.equal(url.protocol, 'claude:');
  assert.equal(url.host, 'claude.ai');
  assert.equal(url.pathname, '/new');
  assert.equal(url.searchParams.get('surface'), 'chat');
});

test('openChat: 딥링크가 실패하면 브라우저로 연다', async () => {
  const opened = [];
  const result = await openChat(async url => {
    opened.push(url);
    if (url.startsWith('claude:')) throw new Error('no application knows how to open URL');
  });

  assert.equal(result, 'browser');
  assert.deepEqual(opened, [CLAUDE_NEW_CHAT_URL, WEB_NEW_CHAT_URL]);
});

test('openChat: 둘 다 실패하면 reject', async () => {
  await assert.rejects(openChat(async () => { throw new Error('open failed'); }), /open failed/);
});

test('folderLabel: 마지막 경로 구간', () => {
  assert.equal(folderLabel('/Users/me/my-ulanzi-plugins'), 'my-ulanzi-plugins');
  assert.equal(folderLabel('/'), '/');
});

test('wrapLabel: 구분자 뒤에서 우선 끊는다', () => {
  assert.deepEqual(wrapLabel('api'), ['api']);
  assert.deepEqual(wrapLabel('my-ulanzi-plugins'), ['my-ulanzi-', 'plugins']);
  assert.deepEqual(wrapLabel('hello world'), ['hello', 'world']);
});

test('wrapLabel: 긴 토큰은 강제로 자른다', () => {
  assert.deepEqual(wrapLabel('abcdefghijklmnop'), ['abcdefghij', 'klmnop']);
});

test('wrapLabel: 줄 수를 넘으면 마지막 줄을 … 로 끝낸다', () => {
  const lines = wrapLabel('aaaaaaaaaa-bbbbbbbbbb-cccccccccc-dddd');
  assert.equal(lines.length, 3);
  assert.ok(lines.every(line => line.length <= 10));
  assert.ok(lines[2].endsWith('…'));
});

test('escapeXml', () => {
  assert.equal(escapeXml(`a&b<c>"d'`), 'a&amp;b&lt;c&gt;&quot;d&apos;');
});

test('renderSvg: 폴더 이름을 표시하고 특수문자를 이스케이프한다', () => {
  const svg = renderSvg('/Users/me/R&D <lab>');

  assert.match(svg, /^<svg [^>]*viewBox="0 0 196 196"/);
  assert.match(svg, />R&amp;D &lt;lab&gt;<\/text>/);
  assert.doesNotMatch(svg, /R&D/);
});

test('renderSvg: 폴더가 없으면 안내 문구를 흐리게 표시', () => {
  const svg = renderSvg('', '폴더 미지정');

  assert.match(svg, />폴더 미지정<\/text>/);
  assert.notEqual(svg, renderSvg('/a/proj'));
});

test('renderIconData: base64 data URL 로 인코딩', () => {
  const data = renderIconData('/a/proj');
  const prefix = 'data:image/svg+xml;base64,';

  assert.ok(data.startsWith(prefix));
  assert.equal(Buffer.from(data.slice(prefix.length), 'base64').toString(), renderSvg('/a/proj'));
});
