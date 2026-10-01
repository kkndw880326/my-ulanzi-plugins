const ACTION_UUID = 'com.ulanzi.ulanzistudio.claudecode.newsession';

const form = document.querySelector('#property-inspector');
const folderInput = document.querySelector('#folder');
const folderInfo = document.querySelector('#folder_info');

$UD.connect(ACTION_UUID);

$UD.onConnected(() => {
  //연결되면 설정 항목을 보여준다
  document.querySelector('.uspi-wrapper').classList.remove('hidden');

  document.querySelector('#folder_picker').addEventListener('click', () => {
    $UD.selectFolderDialog();
  });

  form.addEventListener('change', saveSettings);
});

//저장된 설정 불러오기 (두 이벤트 모두 받아서 누락을 막는다)
$UD.onAdd(jsn => {
  if (jsn && jsn.param) loadSettings(jsn.param);
});

$UD.onParamFromApp(jsn => {
  if (jsn && jsn.param) loadSettings(jsn.param);
});

//폴더 선택 대화상자 결과. 취소하면 path 가 비어 있다
$UD.onSelectdialog(jsn => {
  if (!jsn || !jsn.path) return;

  folderInput.value = jsn.path;
  renderFolder();
  saveSettings();
});

function loadSettings(params) {
  Utils.setFormValue(params, form);
  renderFolder();
}

function saveSettings() {
  $UD.sendParamFromPlugin(Utils.getFormValue(form));
}

function renderFolder() {
  const folder = folderInput.value;
  folderInfo.textContent = folder || $UD.t('Choose a folder');
  folderInfo.title = folder;
}
