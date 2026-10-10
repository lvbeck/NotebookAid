export class BodyHistory {
  private entries: string[] = [''];
  private cursor = 0;
  reset(value: string): void { this.entries = [value]; this.cursor = 0; }
  push(value: string): void {
    if (this.entries[this.cursor] === value) return;
    this.entries = this.entries.slice(0, this.cursor + 1);
    this.entries.push(value);
    while (this.entries.length > 100 || (this.entries.length > 2 && this.entries.reduce((size, entry) => size + entry.length * 2, 0) > 8 * 1024 * 1024)) this.entries.shift();
    this.cursor = this.entries.length - 1;
  }
  get canUndo(): boolean { return this.cursor > 0; }
  get canRedo(): boolean { return this.cursor < this.entries.length - 1; }
  undo(): string { if (this.canUndo) this.cursor--; return this.entries[this.cursor]!; }
  redo(): string { if (this.canRedo) this.cursor++; return this.entries[this.cursor]!; }
}
