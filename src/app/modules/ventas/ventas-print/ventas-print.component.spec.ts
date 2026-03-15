import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VentasPrintComponent } from './ventas-print.component';

describe('VentasPrintComponent', () => {
  let component: VentasPrintComponent;
  let fixture: ComponentFixture<VentasPrintComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VentasPrintComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VentasPrintComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
