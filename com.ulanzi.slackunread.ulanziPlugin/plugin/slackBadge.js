import { execFile } from 'child_process';

export const SLACK_BUNDLE_ID = 'com.tinyspeck.slackmacgap';

/**
 * Slack Dock 배지 상태
 *
 * macOS 의 `lsappinfo info -only StatusLabel <app>` 출력 형태:
 *   - 배지 숫자(멘션/DM):      "StatusLabel"={ "label"="3" }
 *   - 안 읽은 채널만 있음:     "StatusLabel"={ "label"="•" }
 *   - 배지 없음:              "StatusLabel"=[ NULL ]  (또는 label 이 빈 문자열)
 *   - Slack 미실행:           출력 없음
 *
 * 반환값 kind
 *   - 'off'   : Slack 이 실행 중이 아님
 *   - 'none'  : 알림 없음
 *   - 'dot'   : 멘션/DM 은 없지만 안 읽은 채널이 있음
 *   - 'count' : 멘션/DM 수 (text 에 표시용 문자열)
 */
export function parseStatusLabel(stdout) {
  const output = (stdout || '').trim();
  if (!output) return { kind: 'off', text: '' };

  const match = output.match(/"label"="([^"]*)"/);
  const label = match ? match[1].trim() : '';
  if (!label) return { kind: 'none', text: '' };

  const count = parseInt(label, 10);
  if (Number.isNaN(count)) return { kind: 'dot', text: '' };
  if (count <= 0) return { kind: 'none', text: '' };

  // Slack 이 "99+" 같은 문자열을 줄 수도 있어 숫자 뒤 접미사는 그대로 살린다
  return { kind: 'count', text: count > 99 ? '99+' : label };
}

export function readSlackBadge() {
  return new Promise(resolve => {
    execFile('lsappinfo', ['info', '-only', 'StatusLabel', 'Slack'], { timeout: 2000 }, (err, stdout) => {
      // lsappinfo 실행 자체가 실패하면 Slack 상태를 알 수 없으므로 off 로 취급
      resolve(err ? { kind: 'off', text: '' } : parseStatusLabel(stdout));
    });
  });
}

export function openSlack() {
  execFile('open', ['-b', SLACK_BUNDLE_ID]);
}

export function isSameBadge(a, b) {
  return !!a && !!b && a.kind === b.kind && a.text === b.text;
}

const SIZE = 196;

// Slack 로고 대신 범용 '#' 글리프를 그린다 (상표 이미지 사용 회피)
function hashGlyph(color, opacity = 1) {
  return `<g stroke="${color}" stroke-width="14" stroke-linecap="round" opacity="${opacity}">`
    + '<line x1="80" y1="52" x2="68" y2="144"/>'
    + '<line x1="128" y1="52" x2="116" y2="144"/>'
    + '<line x1="50" y1="80" x2="148" y2="80"/>'
    + '<line x1="46" y1="116" x2="144" y2="116"/>'
    + '</g>';
}

function frame(body, background = '#1f1f24') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">`
    + `<rect width="${SIZE}" height="${SIZE}" rx="28" fill="${background}"/>`
    + body
    + '</svg>';
}

export function renderSvg(badge) {
  switch (badge.kind) {
    case 'count': {
      const fontSize = badge.text.length >= 3 ? 64 : 88;
      return frame(
        hashGlyph('#ffffff', 0.25)
        + `<text x="98" y="98" text-anchor="middle" dominant-baseline="central" `
        + `font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${fontSize}" fill="#ffffff">${badge.text}</text>`,
        '#e01e5a'
      );
    }
    case 'dot':
      return frame(hashGlyph('#ffffff') + '<circle cx="152" cy="44" r="22" fill="#ecb22e"/>');
    case 'off':
      return frame(
        hashGlyph('#8a8a92', 0.4)
        + '<text x="98" y="172" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" '
        + 'font-weight="700" font-size="30" fill="#8a8a92">Off</text>'
      );
    default:
      return frame(hashGlyph('#8a8a92'));
  }
}

export function renderIconData(badge) {
  return 'data:image/svg+xml;base64,' + Buffer.from(renderSvg(badge)).toString('base64');
}
