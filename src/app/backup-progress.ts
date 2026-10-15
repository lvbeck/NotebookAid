import { Component, Injectable, OnDestroy, inject, signal } from '@angular/core';
import { Preferences } from './preferences';
import { IconComponent } from './icon.component';
import type { BackupJob, BackupProgress } from '../../shared/backup';
import type { Locale } from './i18n';

const text: Record<Locale, string[]> = {ja: ["ノートブックをバックアップ中", "ノートを検証中", "ファイルを走査中", "チェックサムを計算中", "ファイルをコピー中", "バックアップを検証中", "バックアップ完了", "バックアップに失敗しました", "バックアップの一貫性を保つため、ノートブックへの書き込みを一時停止しています。"], ko: ["노트북 백업 중", "노트 검증 중", "파일 검색 중", "체크섬 계산 중", "파일 복사 중", "백업 검증 중", "백업 완료", "백업 실패", "백업의 일관성을 유지하기 위해 노트북 쓰기가 일시 중지됩니다."],
  en: ['Backing up notebook', 'Validating notes', 'Scanning files', 'Calculating checksums', 'Copying files', 'Verifying backup', 'Backup complete', 'Backup failed', 'Notebook writes are paused to keep the backup consistent.'],
  de: ['Notizbuch wird gesichert', 'Notizen werden geprüft', 'Dateien werden erfasst', 'Prüfsummen werden berechnet', 'Dateien werden kopiert', 'Sicherung wird geprüft', 'Sicherung abgeschlossen', 'Sicherung fehlgeschlagen', 'Schreibvorgänge sind für eine konsistente Sicherung pausiert.'],
  fr: ['Sauvegarde du carnet', 'Validation des notes', 'Analyse des fichiers', 'Calcul des sommes de contrôle', 'Copie des fichiers', 'Vérification de la sauvegarde', 'Sauvegarde terminée', 'Échec de la sauvegarde', 'Les écritures sont suspendues pour garantir une sauvegarde cohérente.'],
  it: ['Backup del taccuino', 'Verifica delle note', 'Scansione dei file', 'Calcolo delle somme di controllo', 'Copia dei file', 'Verifica del backup', 'Backup completato', 'Backup non riuscito', 'Le scritture sono sospese per garantire un backup coerente.'],
  es: ['Copia de seguridad del cuaderno', 'Validando notas', 'Analizando archivos', 'Calculando sumas de comprobación', 'Copiando archivos', 'Verificando la copia', 'Copia completada', 'La copia falló', 'Se pausa la escritura para garantizar una copia coherente.'],
  'pt-PT': ['Cópia de segurança do caderno', 'A validar notas', 'A analisar ficheiros', 'A calcular somas de verificação', 'A copiar ficheiros', 'A verificar a cópia', 'Cópia concluída', 'Falha na cópia', 'A escrita está suspensa para garantir uma cópia consistente.'],
  'zh-CN': ['正在后台备份笔记本', '校验笔记', '扫描文件', '计算校验值', '复制文件', '验证备份', '备份完成', '备份失败', '为保证备份一致性，暂时暂停笔记本写入。'],
  'zh-TW': ['正在背景備份筆記本', '驗證筆記', '掃描檔案', '計算校驗值', '複製檔案', '驗證備份', '備份完成', '備份失敗', '為確保備份一致性，暫時暫停筆記本寫入。'],
};
const phases: BackupProgress['phase'][] = ['validating', 'scanning', 'hashing', 'copying', 'verifying', 'complete', 'failed'];

@Injectable({ providedIn: 'root' })
export class BackupProgressService implements OnDestroy {
  readonly job = signal<BackupJob | null>(null);
  private received = false;
  private readonly stop = window.notebookAid.library.onBackupProgress(value => { this.received = true; this.job.set(value); });
  constructor() { void window.notebookAid.library.backupProgress().then(result => { if (result.ok && !this.received) this.job.set(result.value); }).catch(() => {}); }
  active(): boolean { return !!this.job(); }
  ngOnDestroy(): void { this.stop(); }
}
@Component({ selector: 'app-backup-progress', standalone: true, imports: [IconComponent], styles: [':host { display:contents; } .backup-progress-banner { display:flex;align-items:center;flex-wrap:wrap;gap:12px;padding:12px 24px;border-bottom:1px solid var(--line);background:var(--surface);color:var(--accent);font-size:14px; } progress { width:200px;max-width:100%;accent-color:var(--accent); } small { color:var(--muted); }'], template: `
  @if (progress.job(); as job) { <div class="backup-progress-banner" data-testid="backup-progress"><app-icon name="Save" /><span role="status">{{ label(0) }} · {{ label(phases.indexOf(job.progress.phase) + 1) }}</span><progress max="100" [attr.value]="percent()" [attr.aria-label]="label(0)"></progress>@if(percent() !== null){<span>{{ percent() }}%</span>}<small>{{ label(8) }}</small></div> }
` })
export class BackupProgressComponent {
  readonly progress = inject(BackupProgressService); readonly prefs = inject(Preferences); readonly phases = phases;
  label(index: number): string { return text[this.prefs.locale()][index]!; }
  percent(): number | null { const value = this.progress.job()?.progress; return value?.total == null ? null : value.total === 0 ? 100 : Math.max(0, Math.min(100, Math.floor(value.completed / value.total * 100))); }
}
