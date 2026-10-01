import { UlanziApi } from './ulanzi-api/index.js';
import { normalizeSettings, openSession, openChat, renderIconData } from './claudeSession.js';

const PLUGIN_UUID = 'com.ulanzi.ulanzistudio.claudecode';
const SESSION_ACTION_UUID = 'com.ulanzi.ulanzistudio.claudecode.newsession';
const CHAT_ACTION_UUID = 'com.ulanzi.ulanzistudio.claudecode.newchat';

// context -> { action, folder, openMode, active }
// 새 채팅 키는 설정이 없어 folder/openMode 를 쓰지 않는다
const ACTION_CACHES = {};

const $UD = new UlanziApi();

$UD.connect(PLUGIN_UUID);

//키에 액션이 배치됨
$UD.onAdd(jsn => {
  const context = jsn.context;
  if (!ACTION_CACHES[context]) {
    ACTION_CACHES[context] = { action: jsn.uuid, ...normalizeSettings(jsn.param), active: true };
  } else {
    applySettings(jsn);
  }
  render(context);
});

//설정 화면을 열 때 저장된 설정이 전달됨
$UD.onParamFromApp(jsn => {
  applySettings(jsn);
});

//설정 화면에서 값이 바뀜
$UD.onParamFromPlugin(jsn => {
  applySettings(jsn);
});

//페이지 전환 등으로 키의 활성 상태가 바뀜
$UD.onSetActive(jsn => {
  const instance = ACTION_CACHES[jsn.context];
  if (!instance) return;

  instance.active = jsn.active;
  if (jsn.active) render(jsn.context);
});

//키를 누름
$UD.onRun(async jsn => {
  if (!ACTION_CACHES[jsn.context]) $UD.emit('add', jsn);

  const instance = ACTION_CACHES[jsn.context];
  if (instance.action === CHAT_ACTION_UUID) {
    try {
      const openedWith = await openChat();
      $UD.logMessage(`opened new chat with ${openedWith}`, 'info');
    } catch (err) {
      $UD.logMessage(`failed to open new chat: ${err.message}`, 'error');
      $UD.showAlert(jsn.context);
    }
    return;
  }

  try {
    const openedWith = await openSession(instance);
    $UD.logMessage(`opened ${instance.folder} with ${openedWith}`, 'info');
  } catch (err) {
    $UD.logMessage(`failed to open ${instance.folder || '(no folder)'}: ${err.message}`, 'error');
    $UD.showAlert(jsn.context);
  }
});

//키에서 액션이 제거됨
$UD.onClear(jsn => {
  if (jsn.param) {
    for (let i = 0; i < jsn.param.length; i++) {
      delete ACTION_CACHES[jsn.param[i].context];
    }
  }
});

function applySettings(jsn) {
  const instance = ACTION_CACHES[jsn.context];
  // 설정 화면이 아직 아무 값도 보내지 않은 경우({})에는 기존 값을 유지한다
  if (!instance || !jsn.param || Object.keys(jsn.param).length === 0) return;

  Object.assign(instance, normalizeSettings(jsn.param));
  if (instance.active) render(jsn.context);
}

// 새 채팅 키는 manifest 의 고정 아이콘을 그대로 쓴다
function render(context) {
  if (ACTION_CACHES[context].action !== SESSION_ACTION_UUID) return;
  $UD.setBaseDataIcon(context, renderIconData(ACTION_CACHES[context].folder, $UD.t('No folder')));
}
