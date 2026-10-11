import { OnChanges, Component, ElementRef, Input, inject } from '@angular/core';
import { createElement, Paperclip, Eye, Image, ImagePlus, Table2, GripVertical, ChevronUp, Search, Tag, ChevronDown, ChevronLeft, Undo2, Redo2, FileOutput, BookOpen, Files, Pin, Clock3, Trash2, Folder, Plus, FlaskConical, PanelLeftClose, PanelLeftOpen, Maximize2, Minimize2, NotebookPen, Check, ChevronRight, Save, RefreshCw, FolderOpen, Database, Power, FileText, FileInput, ArrowLeftRight, Settings, Info, Bell, X, History, CheckCheck, CircleCheck, CircleX, TriangleAlert } from 'lucide';

const icons = { Paperclip, Eye, Image, ImagePlus, Table2, GripVertical, ChevronUp, Search, Tag, ChevronDown, ChevronLeft, Undo2, Redo2, FileOutput, BookOpen, Files, Pin, Clock3, Trash2, Folder, Plus, FlaskConical, PanelLeftClose, PanelLeftOpen, Maximize2, Minimize2, NotebookPen, Check, ChevronRight, Save, RefreshCw, FolderOpen, Database, Power, FileText, FileInput, ArrowLeftRight, Settings, Info, Bell, X, History, CheckCheck, CircleCheck, CircleX, TriangleAlert };
@Component({ selector: 'app-icon', standalone: true, template: '', host: { 'aria-hidden': 'true' } })
export class IconComponent implements OnChanges {
  @Input() name: keyof typeof icons = 'BookOpen';
  private readonly element = inject(ElementRef<HTMLElement>);
  ngOnChanges(): void {
    this.element.nativeElement.replaceChildren(createElement(icons[this.name], { width: '18', height: '18', 'stroke-width': '1.65' }));
  }
}
