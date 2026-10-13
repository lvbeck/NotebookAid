import { Component, Directive, ElementRef, HostListener, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';

@Component({ selector: 'app-sidebar-tooltip', standalone: true, template: '{{ text }}', host: { class: 'sidebar-tooltip', role: 'tooltip' } })
export class SidebarTooltipComponent { text = ''; }

@Directive({ selector: '[appTooltip]', standalone: true })
export class TooltipDirective implements OnChanges, OnDestroy {
  @Input() appTooltip = '';
  private readonly overlay = inject(Overlay);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private ref?: OverlayRef;
  private descriptionId = '';
  ngOnChanges(): void { this.hide(); }
  @HostListener('mouseenter')
  @HostListener('focus')
  show(): void {
    if (!this.appTooltip || this.ref) return;
    this.ref = this.overlay.create({
      panelClass: 'sidebar-tooltip-overlay',
      positionStrategy: this.overlay.position().flexibleConnectedTo(this.element).withPositions([
        { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 12 },
        { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -12 }
      ]).withPush(true),
      scrollStrategy: this.overlay.scrollStrategies.close()
    });
    const tooltip = this.ref.attach(new ComponentPortal(SidebarTooltipComponent));
    this.descriptionId = this.ref.overlayElement.id + '-tooltip';
    tooltip.location.nativeElement.id = this.descriptionId;
    const target = this.element.nativeElement;
    target.setAttribute('aria-describedby', [target.getAttribute('aria-describedby'), this.descriptionId].filter(Boolean).join(' '));
    tooltip.instance.text = this.appTooltip;
    tooltip.changeDetectorRef.detectChanges();
  }
  @HostListener('mouseleave')
  @HostListener('blur')
  @HostListener('click')
  @HostListener('document:keydown.escape')
  hide(): void { const target = this.element.nativeElement; const descriptions = (target.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(value => value && value !== this.descriptionId); if (descriptions.length) target.setAttribute('aria-describedby', descriptions.join(' ')); else target.removeAttribute('aria-describedby'); this.descriptionId = ''; this.ref?.dispose(); this.ref = undefined; }
  ngOnDestroy(): void { this.hide(); }
}
