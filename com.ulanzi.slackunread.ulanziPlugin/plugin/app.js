import { UlanziApi } from './ulanzi-api/index.js';
import { readSlackBadge, openSlack, isSameBadge, renderIconData } from './slackBadge.js';

const PLUGIN_UUID = 'com.ulanzi.ulanzistudio.slackunread';
const POLL_INTERVAL_MS = 3000;

// context -> { active }
const ACTION_CACHES = {};

let lastBadge = null;
let pollTimer = null;

const $UD = new UlanziApi();

$UD.connect(PLUGIN_UUID);

//키에 액션이 배치됨
$UD.onAdd(jsn => {
  const context = jsn.context;
  if (!ACTION_CACHES[context]) {
    ACTION_CACHES[context] = { active: true };
  }
  if (lastBadge) render(context);
  startPolling();
});

//페이지 전환 등으로 키의 활성 상태가 바뀜
$UD.onSetActive(jsn => {
  const instance = ACTION_CACHES[jsn.context];
  if (!instance) return;

  instance.active = jsn.active;
  // 비활성 동안 갱신이 누락됐을 수 있으므로 다시 보일 때 현재 상태로 그린다
  if (jsn.active && lastBadge) render(jsn.context);
});

//키를 누름
$UD.onRun(jsn => {
  if (!ACTION_CACHES[jsn.context]) $UD.emit('add', jsn);
  openSlack();
});

//키에서 액션이 제거됨
$UD.onClear(jsn => {
  if (jsn.param) {
    for (let i = 0; i < jsn.param.length; i++) {
      delete ACTION_CACHES[jsn.param[i].context];
    }
  }
  if (Object.keys(ACTION_CACHES).length === 0) stopPolling();
});

$UD.onClose(() => {
  stopPolling();
});

function render(context) {
  $UD.setBaseDataIcon(context, renderIconData(lastBadge));
}

async function poll() {
  const badge = await readSlackBadge();
  if (isSameBadge(badge, lastBadge)) return;

  lastBadge = badge;
  for (const context of Object.keys(ACTION_CACHES)) {
    if (ACTION_CACHES[context].active) render(context);
  }
}

function startPolling() {
  if (pollTimer) return;
  poll();
  pollTimer = setInterval(poll, POLL_INTERVAL_MS);
}

function stopPolling() {
  clearInterval(pollTimer);
  pollTimer = null;
}
