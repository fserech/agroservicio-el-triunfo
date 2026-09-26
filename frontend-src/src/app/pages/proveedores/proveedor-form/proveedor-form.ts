import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../services/api';
import { ToastService } from '../../../services/toast';
import { Proveedor } from '../../../models';

@Component({
  selector: 'app-proveedor-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './proveedor-form.html',
})
export class ProveedorFormComponent implements OnInit {
  isEdit = false; id: number | null = null;
  saving = signal(false);
  form: Partial<Proveedor> = { activo: true, plazo_credito: 0, categoria: 'General' };
  categorias = ['Fertilizantes','Agroquímicos','Semillas','Herramientas','Equipos','Veterinaria','Riego','Empaques','General'];

  constructor(private api: ApiService, private toast: ToastService, private router: Router, private route: ActivatedRoute) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true; this.id = +id;
      try {
        const all = await this.api.get<Proveedor[]>('/proveedores');
        this.form = all.find(p => p.id === +id) || this.form;
      } catch(e: any) { this.toast.error(e.message); this.router.navigate(['/proveedores']); }
    }
  }

  async save() {
    if (!this.form.nombre?.trim()) { this.toast.warning('El nombre es requerido'); return; }
    this.saving.set(true);
    try {
      if (this.isEdit) { await this.api.put(`/proveedores/${this.id}`, this.form); this.toast.success('Proveedor actualizado'); }
      else             { await this.api.post('/proveedores', this.form);         this.toast.success('Proveedor creado'); }
      this.router.navigate(['/proveedores']);
    } catch(e: any) { this.toast.error(e.message); }
    finally { this.saving.set(false); }
  }
}
