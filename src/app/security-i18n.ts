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
export function securityText(locale: Locale, key: Key): string { return (locale === 'ja' ? ja : locale === 'ko' ? ko : locale === 'zh-CN' ? cn : locale === 'zh-TW' ? hk : securityLocales[locale] ?? en)[key]; }

const ko = {
  printPreview: "인쇄 미리 보기", savePdf: "PDF 저장",
  sourcePassword: "원본 노트북 마스터 비밀번호", print: "인쇄", printPdf: "PDF 인쇄",
  notebookLocked: "노트북 잠김", notebookUnlocked: "노트북 잠금 해제됨",
  showPassword: "비밀번호 표시", hidePassword: "비밀번호 숨기기",
  security: "보안", master: "마스터 비밀번호", global: "기본적으로 마스터 비밀번호 사용", globalHint: "기본적으로 꺼져 있습니다. 각 노트북에는 별도의 비밀번호와 복구 키가 있습니다. 기본값 변경은 기존 보호를 제거하지 않습니다.",
  inherit: "전역 기본값 사용", enabled: "이 노트북에서 사용", setup: "보호 설정", unlock: "잠금 해제", lock: "지금 잠그기", recover: "접근 복구", password: "비밀번호 변경", disable: "마스터 비밀번호 해제",
  credential: "현재 비밀번호", newPassword: "새 비밀번호(10자 이상)", repeat: "새 비밀번호 다시 입력", recovery: "복구 키", recoveryHint: "이 키는 한 번만 표시됩니다. 비밀번호를 재설정할 수 있으므로 별도로 보관하세요. 둘 다 잃으면 접근할 수 없습니다. 백업에는 저장되지 않습니다.", savedKey: "복구 키를 저장했습니다",
  cancel: "취소", continue: "이어 쓰기", protect: "노트 암호화", decrypt: "노트 암호화 해제", hidden: "Thunderbird에서 숨기기", visible: "Thunderbird에 표시", locked: "잠김", unlocked: "잠금 해제됨", off: "설정되지 않음",
  boundary: "선택한 노트와 모든 버전 및 첨부 파일을 보호합니다. 이전 백업, 내보낸 사본, 저장 장치의 잔여 데이터는 암호화로 지울 수 없습니다. 암호화를 해제하면 평문을 씁니다.",
  auto: "15분간 활동이 없거나 앱 종료 또는 노트북 전환 시 잠깁니다. 저장 실패 시 편집 내용을 유지하고 잠금을 연기합니다.",
  remaining: "마스터 비밀번호를 해제하기 전에 휴지통을 포함한 모든 암호화된 노트의 암호화를 해제하세요.",
  mismatch: "비밀번호가 일치하지 않습니다.", bad: "자격 증명이 올바르지 않거나 키 자료가 손상되었습니다.", policy: "10–1024자(UTF-8 최대 1024바이트)의 비밀번호를 사용하세요.", failed: "작업 실패",
  unlockHint: "잠긴 상태에서는 암호화된 노트가 숨겨집니다.", plainExport: "내보낸 파일은 평문을 포함합니다. 안전한 위치에 보관하세요.", confirm: "확인", defaultOn: "기본적으로 사용됩니다. 암호화를 사용하려면 이 노트북의 보호 설정을 완료하세요."
};

const ja = {
  printPreview: "印刷プレビュー", savePdf: "PDF を保存",
  sourcePassword: "元のノートブックのマスターパスワード", print: "印刷", printPdf: "PDF を印刷",
  notebookLocked: "ノートブックはロックされています", notebookUnlocked: "ノートブックをロック解除しました",
  showPassword: "パスワードを表示", hidePassword: "パスワードを隠す",
  security: "セキュリティ", master: "マスターパスワード", global: "マスターパスワードを既定で有効にする", globalHint: "既定は無効です。各ノートブックは独自のパスワードと復旧キーを持ちます。既定値を変えても既存の保護は解除しません。",
  inherit: "全体の既定値を使用", enabled: "このノートブックで有効にする", setup: "保護を設定", unlock: "ロック解除", lock: "今すぐロック", recover: "アクセスを復旧", password: "パスワードを変更", disable: "マスターパスワードを無効にする",
  credential: "現在のパスワード", newPassword: "新しいパスワード（10 文字以上）", repeat: "新しいパスワードを再入力", recovery: "復旧キー", recoveryHint: "このキーは一度だけ表示します。パスワードをリセットできるため別に保管してください。両方失うとアクセスできません。バックアップには保存しません。", savedKey: "復旧キーを保存しました",
  cancel: "キャンセル", continue: "続きを書く", protect: "ノートを暗号化", decrypt: "ノートを復号", hidden: "Thunderbird に表示しない", visible: "Thunderbird に表示", locked: "ロック中", unlocked: "ロック解除済み", off: "未設定",
  boundary: "選択したノートとすべての履歴・添付ファイルを保護します。古いバックアップ、エクスポート済みコピー、ストレージの残存データは暗号化で消去できません。復号すると平文を書き込みます。",
  auto: "15 分間操作がない場合、終了時、ノートブック切り替え時にロックします。保存失敗時は編集を保持してロックを延期します。",
  remaining: "マスターパスワードを無効にする前に、ごみ箱を含むすべてのノートを復号してください。",
  mismatch: "パスワードが一致しません。", bad: "認証情報が正しくないかキーが破損しています。", policy: "10～1024 文字（UTF-8 で最大 1024 バイト）のパスワードを使用してください。", failed: "操作に失敗しました",
  unlockHint: "ロック中は暗号化されたノートを隠します。", plainExport: "このエクスポートは平文を含みます。安全な場所へ保存してください。", confirm: "確認", defaultOn: "既定で有効です。このノートブックの設定を完了すると暗号化を利用できます。"
};
