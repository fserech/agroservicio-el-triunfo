// proveedores-list.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  matSearchOutline, matAddOutline, matRemoveRedEyeOutline,
  matModeEditOutline, matShoppingCartOutline
} from '@ng-icons/material-icons/outline';
import { ProveedoresService, ToastService } from '../../../core/services/services';
import { Proveedor } from '../../../core/models/models';

@Component({
  selector: 'app-proveedores-list',
  standalone: true,
  imports: [
    HeaderComponent,CommonModule, FormsModule, NgIconComponent, DecimalPipe],
  providers: [provideIcons({ matSearchOutline, matAddOutline, matRemoveRedEyeOutline, matModeEditOutline, matShoppingCartOutline })],
  templateUrl: './proveedores-list.component.html',
  styleUrls: ['./proveedores-list.component.scss']
})
export class ProveedoresListComponent implements OnInit {
  private svc    = inject(ProveedoresService);
  private toast  = inject(ToastService);
  private router = inject(Router);

  items: Proveedor[] = [];
  load = false;
  searchText = '';

  get comprasTotal() { return this.items.reduce((a, p) => a + (p.compras_totales || 0), 0); }
  get conCredito()   { return this.items.filter(p => p.plazo_credito > 0).length; }

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.load = true;
    this.svc.getAll(this.searchText).subscribe({
      next:  r => { this.items = r; this.load = false; },
      error: () => { this.load = false; this.toast.error('Error cargando proveedores'); }
    });
  }

  add():              void { this.router.navigate(['/proveedores/nuevo']); }
  view(id: number):   void { this.router.navigate(['/proveedores', id]); }
  edit(id: number):   void { this.router.navigate(['/proveedores', id, 'editar']); }
  nuevaOrden(id: number): void { this.router.navigate(['/compras/nuevo'], { queryParams: { proveedor_id: id } }); }
}
