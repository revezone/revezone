const en = {
  tab: 'Agent',
  open: 'Agent settings',
  backend: 'Agent backend',
  builtin: 'Built-in Agent',
  baseUrl: 'API base URL',
  model: 'Model name',
  key: 'API key',
  keySaved: 'Leave blank to keep the saved key for this address.',
  keyNewAddress: 'Enter a key for the new address if its service requires one.',
  keyEnv: 'The current key comes from the app launch environment.',
  keyOptional: 'Leave blank if your provider does not require a key.',
  keyStorage: 'Secure key storage is unavailable. You can use a key to test the connection.',
  keyRemoving: 'The saved key will be removed when you save.',
  removeKey: 'Remove saved key',
  keepKey: 'Keep key',
  test: 'Test connection',
  save: 'Save',
  saved: 'Agent settings saved.',
  retry: 'Try again',
  loadFailed: 'Could not open Agent settings.',
  testFailed: 'Connection test failed.',
  saveFailed: 'Could not save Agent settings.',
  offline: 'Check the model service or update its settings.',
  cliHelp: (name: string) =>
    `Install and sign in to ${name} before connecting. It can edit the current note or board through Revezone’s preview and history. Community skills use the built-in Agent.`,
  testPassed: (ms: number) => `Connection and tool call verified (${ms} ms).`,
  cliPassed: (ms: number) => `CLI connection verified (${ms} ms).`
};

const zh: typeof en = {
  tab: 'Agent',
  open: 'Agent 设置',
  backend: 'Agent 后端',
  builtin: '内置 Agent',
  baseUrl: 'API 基础地址',
  model: '模型名称',
  key: 'API 密钥',
  keySaved: '留空可继续使用此地址已保存的密钥。',
  keyNewAddress: '新地址需要密钥时，请输入对应的密钥。',
  keyEnv: '当前密钥来自应用启动环境。',
  keyOptional: '服务无需密钥时可留空。',
  keyStorage: '当前无法安全保存密钥。你仍可输入密钥测试连接。',
  keyRemoving: '保存时将移除已保存的密钥。',
  removeKey: '移除已保存的密钥',
  keepKey: '保留密钥',
  test: '测试连接',
  save: '保存',
  saved: '已保存 Agent 设置。',
  retry: '重试',
  loadFailed: '无法打开 Agent 设置。',
  testFailed: '连接测试失败。',
  saveFailed: '无法保存 Agent 设置。',
  offline: '检查模型服务，或更新 Agent 设置。',
  cliHelp: (name) =>
    `连接前请先安装并登录 ${name}。它可以编辑当前笔记或白板，修改支持在 Revezone 中预览和恢复。社区技能使用内置 Agent。`,
  testPassed: (ms) => `连接正常，已验证工具调用（${ms} 毫秒）。`,
  cliPassed: (ms) => `CLI 连接测试通过（${ms} 毫秒）。`
};

const zhTW: typeof en = {
  tab: 'Agent',
  open: 'Agent 設定',
  backend: 'Agent 後端',
  builtin: '內建 Agent',
  baseUrl: 'API 基礎網址',
  model: '模型名稱',
  key: 'API 金鑰',
  keySaved: '留空可繼續使用此網址已儲存的金鑰。',
  keyNewAddress: '新網址需要金鑰時，請輸入對應的金鑰。',
  keyEnv: '目前的金鑰來自應用程式的啟動環境。',
  keyOptional: '服務不需要金鑰時可留空。',
  keyStorage: '目前無法安全儲存金鑰。你仍可輸入金鑰測試連線。',
  keyRemoving: '儲存時將移除已儲存的金鑰。',
  removeKey: '移除已儲存的金鑰',
  keepKey: '保留金鑰',
  test: '測試連線',
  save: '儲存',
  saved: '已儲存 Agent 設定。',
  retry: '重試',
  loadFailed: '無法開啟 Agent 設定。',
  testFailed: '連線測試失敗。',
  saveFailed: '無法儲存 Agent 設定。',
  offline: '檢查模型服務，或更新 Agent 設定。',
  cliHelp: (name) =>
    `連線前請先安裝並登入 ${name}。它可以編輯目前的筆記或白板，修改可在 Revezone 中預覽和復原。社群技能使用內建 Agent。`,
  testPassed: (ms) => `連線正常，已驗證工具呼叫（${ms} 毫秒）。`,
  cliPassed: (ms) => `CLI 連線測試通過（${ms} 毫秒）。`
};

export function getAgentModelStrings(language: string) {
  const locale = language.toLowerCase();
  if (locale === 'zh-tw' || locale === 'zh-hk') return zhTW;
  return locale.startsWith('zh') ? zh : en;
}
