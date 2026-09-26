import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../services/api';
import { ToastService } from '../../../services/toast';
import { Cliente } from '../../../models';

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './cliente-form.html',
})
export class ClienteFormComponent implements OnInit {
  isEdit = false;
  clienteId: number | null = null;
  saving = signal(false);
  form: Partial<Cliente> = { tipo: 'individual', credito_maximo: 0, dias_credito: 0, activo: true };

  constructor(private api: ApiService, private toast: ToastService, private router: Router, private route: ActivatedRoute) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true; this.clienteId = +id;
      try { this.form = await this.api.get<Cliente>(`/clientes/${id}`); }
      catch(e: any) { this.toast.error(e.message); this.router.navigate(['/clientes']); }
    }
  }

  async save() {
    if (!this.form.nombre?.trim()) { this.toast.warning('El nombre es requerido'); return; }
    this.saving.set(true);
    try {
      if (this.isEdit) { await this.api.put(`/clientes/${this.clienteId}`, this.form); this.toast.success('Cliente actualizado'); }
      else             { await this.api.post('/clientes', this.form);              this.toast.success('Cliente creado'); }
      this.router.navigate(['/clientes']);
    } catch(e: any) { this.toast.error(e.message); }
    finally { this.saving.set(false); }
  }
}
