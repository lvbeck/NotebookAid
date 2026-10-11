import { Component, Directive, ElementRef, HostListener, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';

@Component({ selector: 'app-sidebar-tooltip', standalone: true, template: '{{ text }}', host: { class: 'sidebar-tooltip', role: 'tooltip' } })
export class SidebarTooltipComponent { text = ''; }

@Directive({ selector: '[appTooltip]', standalone: true })
export class TooltipDirective implements OnChanges, OnDestroy {
  @Input() appTooltip = '';
  private readonly overlay = inject(Overlay);
  private readonly element = inject(ElementRef<HTMLElement>);
  private ref?: OverlayRef;
  ngOnChanges(): void { this.hide(); }
  @HostListener('mouseenter')
  @HostListener('focus')
  show(): void {
    if (!this.appTooltip || this.ref) return;
    this.ref = this.overlay.create({
      panelClass: 'sidebar-tooltip-overlay',
      positionStrategy: this.overlay.position().flexibleConnectedTo(this.element).withPositions([
        { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 12 }
      ]).withPush(true),
      scrollStrategy: this.overlay.scrollStrategies.close()
    });
    const tooltip = this.ref.attach(new ComponentPortal(SidebarTooltipComponent));
    tooltip.instance.text = this.appTooltip;
    tooltip.changeDetectorRef.detectChanges();
  }
  @HostListener('mouseleave')
  @HostListener('blur')
  @HostListener('click')
  @HostListener('document:keydown.escape')
  hide(): void { this.ref?.dispose(); this.ref = undefined; }
  ngOnDestroy(): void { this.hide(); }
}
