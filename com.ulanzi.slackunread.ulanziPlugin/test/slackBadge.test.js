import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseStatusLabel, isSameBadge, renderSvg, renderIconData } from '../plugin/slackBadge.js';

test('parseStatusLabel: Slack 미실행이면 off', () => {
  assert.deepEqual(parseStatusLabel(''), { kind: 'off', text: '' });
  assert.deepEqual(parseStatusLabel('\n'), { kind: 'off', text: '' });
  assert.deepEqual(parseStatusLabel(undefined), { kind: 'off', text: '' });
});

test('parseStatusLabel: 배지가 없으면 none', () => {
  assert.deepEqual(parseStatusLabel('"StatusLabel"=[ NULL ]'), { kind: 'none', text: '' });
  assert.deepEqual(parseStatusLabel('"StatusLabel"={ "label"="" }'), { kind: 'none', text: '' });
  assert.deepEqual(parseStatusLabel('"StatusLabel"={ "label"="0" }'), { kind: 'none', text: '' });
});

test('parseStatusLabel: 안 읽은 채널만 있으면 dot', () => {
  assert.deepEqual(parseStatusLabel('"StatusLabel"={ "label"="•" }'), { kind: 'dot', text: '' });
});

test('parseStatusLabel: 숫자 배지는 count', () => {
  assert.deepEqual(parseStatusLabel('"StatusLabel"={ "label"="3" }\n'), { kind: 'count', text: '3' });
  assert.deepEqual(parseStatusLabel('"StatusLabel"={ "label"="42" }'), { kind: 'count', text: '42' });
  assert.deepEqual(parseStatusLabel('"StatusLabel"={ "label"="99+" }'), { kind: 'count', text: '99+' });
});

test('parseStatusLabel: 99 초과는 99+ 로 자른다', () => {
  assert.deepEqual(parseStatusLabel('"StatusLabel"={ "label"="150" }'), { kind: 'count', text: '99+' });
});

test('isSameBadge', () => {
  assert.equal(isSameBadge({ kind: 'count', text: '3' }, { kind: 'count', text: '3' }), true);
  assert.equal(isSameBadge({ kind: 'count', text: '3' }, { kind: 'count', text: '4' }), false);
  assert.equal(isSameBadge({ kind: 'dot', text: '' }, null), false);
});

test('renderSvg: 상태별로 다른 아이콘을 만든다', () => {
  const kinds = ['off', 'none', 'dot', 'count'];
  const svgs = kinds.map(kind => renderSvg({ kind, text: kind === 'count' ? '7' : '' }));

  assert.equal(new Set(svgs).size, kinds.length);
  for (const svg of svgs) assert.match(svg, /^<svg [^>]*viewBox="0 0 196 196"/);
  assert.match(svgs[3], />7<\/text>/);
  assert.match(svgs[0], />Off<\/text>/);
});

test('renderIconData: base64 data URL 로 인코딩', () => {
  const badge = { kind: 'count', text: '5' };
  const data = renderIconData(badge);
  const prefix = 'data:image/svg+xml;base64,';

  assert.ok(data.startsWith(prefix));
  assert.equal(Buffer.from(data.slice(prefix.length), 'base64').toString(), renderSvg(badge));
});
