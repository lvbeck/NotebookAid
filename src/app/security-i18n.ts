import type { Locale } from './i18n';
import { securityLocales } from './security-locales';
const en = {
  printPreview: 'Print preview', savePdf: 'Save PDF',
  sourcePassword: 'Source notebook master password', print: 'Print', printPdf: 'Print PDF',
  notebookLocked: 'Notebook locked', notebookUnlocked: 'Notebook unlocked',
  showPassword: 'Show password', hidePassword: 'Hide password',
  security: 'Security', master: 'Master password', global: 'Enable master password by default', globalHint: 'Off by default. Each notebook has its own password and recovery key. Changing this default never removes existing protection.',
  inherit: 'Use global default', enabled: 'Enable for this notebook', setup: 'Set up protection', unlock: 'Unlock', lock: 'Lock now', recover: 'Recover access', password: 'Change password', disable: 'Disable master password',
  credential: 'Current password', newPassword: 'New password (at least 10 characters)', repeat: 'Repeat new password', recovery: 'Recovery key', recoveryHint: 'Keep this key separately. It is shown only once. It can reset the password; losing both means losing access. It is not saved with backups.', savedKey: 'I have saved the recovery key',
  cancel: 'Cancel', continue: 'Continue', protect: 'Encrypt note', decrypt: 'Decrypt note', hidden: 'Hide from Thunderbird', visible: 'Show in Thunderbird', locked: 'Locked', unlocked: 'Unlocked', off: 'Not configured',
  boundary: 'Protects the selected note, all its history and attachments. Old backups, exported copies and storage-device remnants cannot be erased by encryption. Decryption writes plaintext to this notebook.',
  auto: 'Locks after 15 minutes of inactivity, on exit or notebook switch. A failed save keeps your edits and postpones locking.',
  remaining: 'Decrypt all encrypted notes, including notes in the recycle bin, before disabling the master password.',
  mismatch: 'Passwords do not match.', bad: 'Incorrect credential or damaged key material.', policy: 'Use a password of 10–1024 characters (maximum 1024 UTF-8 bytes).', failed: 'Operation failed',
  unlockHint: 'Encrypted notes are hidden while locked.', plainExport: 'This export contains plaintext. Store it in a safe location.', confirm: 'Confirm', defaultOn: 'Default enabled: finish setting up this notebook to use encryption.'
};
type Key = keyof typeof en;
const cn: Record<Key, string> = {
  printPreview: '打印预览', savePdf: '保存 PDF',
  sourcePassword: '来源笔记本主密码', print: '打印', printPdf: '打印 PDF',
  notebookLocked: '笔记本已锁定', notebookUnlocked: '笔记本已解锁',
  showPassword: '显示密码', hidePassword: '隐藏密码',
  security: '安全', master: '主密码', global: '默认启用主密码', globalHint: '默认关闭。每个笔记本使用独立密码和恢复密钥。修改默认值不会解除已有保护。', inherit: '使用全局默认', enabled: '为此笔记本启用', setup: '设置主密码', unlock: '解锁', lock: '立即锁定', recover: '恢复访问', password: '修改主密码', disable: '关闭主密码', credential: '当前主密码', newPassword: '新主密码（至少 10 个字符）', repeat: '再次输入新主密码', recovery: '恢复密钥', recoveryHint: '请单独保管，此密钥仅显示一次。它可用于重设主密码；两者均丢失将无法恢复访问。恢复密钥不会随备份保存。', savedKey: '我已保存恢复密钥', cancel: '取消', continue: '继续', protect: '加密笔记', decrypt: '解除笔记加密', hidden: '对 Thunderbird 隐藏', visible: '在 Thunderbird 中显示', locked: '已锁定', unlocked: '已解锁', off: '尚未设置', boundary: '保护所选笔记、全部历史及附件。加密无法清除旧备份、已导出的副本和存储设备残留。解除加密会在此笔记本中写入明文。', auto: '连续 15 分钟无操作、退出或切换笔记本时锁定。保存失败时保留编辑，并暂缓锁定。', remaining: '请先解除所有笔记的加密（包括回收站中的笔记），再关闭主密码。', mismatch: '两次输入的密码不一致。', bad: '密码或恢复密钥不正确，或密钥数据损坏。', policy: '密码需为 10–1024 个字符，UTF-8 编码后不超过 1024 字节。', failed: '操作失败', unlockHint: '锁定时不显示加密笔记。', plainExport: '导出内容为明文，请保存到安全位置。', confirm: '确认', defaultOn: '默认已启用：请完成此笔记本的主密码设置后使用加密。'
};
const hk: Record<Key, string> = {
  printPreview: '列印預覽', savePdf: '儲存 PDF',
  sourcePassword: '來源筆記本主密碼', print: '列印', printPdf: '列印 PDF',
  notebookLocked: '筆記本已鎖定', notebookUnlocked: '筆記本已解鎖',
  showPassword: '顯示密碼', hidePassword: '隱藏密碼',
  security: '保安', master: '主密碼', global: '預設啟用主密碼', globalHint: '預設關閉。每個筆記本使用獨立密碼及復原金鑰。更改預設值不會解除現有保護。', inherit: '使用全域預設', enabled: '為此筆記本啟用', setup: '設定主密碼', unlock: '解鎖', lock: '立即鎖定', recover: '復原存取', password: '更改主密碼', disable: '關閉主密碼', credential: '目前主密碼', newPassword: '新主密碼（至少 10 個字元）', repeat: '再次輸入新主密碼', recovery: '復原金鑰', recoveryHint: '請獨立保管，此金鑰只顯示一次。它可用來重設主密碼；兩者均遺失將無法復原存取。復原金鑰不會隨備份儲存。', savedKey: '我已儲存復原金鑰', cancel: '取消', continue: '繼續', protect: '加密筆記', decrypt: '解除筆記加密', hidden: '對 Thunderbird 隱藏', visible: '在 Thunderbird 中顯示', locked: '已鎖定', unlocked: '已解鎖', off: '尚未設定', boundary: '保護所選筆記、全部歷程及附件。加密無法清除舊備份、已匯出的副本及儲存裝置殘留。解除加密會在此筆記本中寫入明文。', auto: '連續 15 分鐘沒有操作、結束應用程式或切換筆記本時鎖定。儲存失敗時保留編輯，並暫緩鎖定。', remaining: '請先解除所有筆記的加密（包括資源回收筒內的筆記），再關閉主密碼。', mismatch: '兩次輸入的密碼不相符。', bad: '密碼或復原金鑰不正確，或金鑰資料損壞。', policy: '密碼須為 10–1024 個字元，UTF-8 編碼後不超過 1024 位元組。', failed: '操作失敗', unlockHint: '鎖定時不顯示加密筆記。', plainExport: '匯出內容為明文，請儲存至安全位置。', confirm: '確認', defaultOn: '預設已啟用：請完成此筆記本的主密碼設定後使用加密。'
};
export type SecurityKey = Key;
export function securityText(locale: Locale, key: Key): string { return (locale === 'zh-CN' ? cn : locale === 'zh-TW' ? hk : securityLocales[locale] ?? en)[key]; }
