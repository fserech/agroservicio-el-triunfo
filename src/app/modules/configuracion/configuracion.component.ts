// configuracion.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { matSaveOutline } from '@ng-icons/material-icons/outline';
import { ConfiguracionService, ToastService } from '../../core/services/services';
import { HeaderComponent } from '../../shared/components/header/header.component';

// Tipos explícitos para evitar error TS de 'type' no existe
interface ConfigKey {
  clave:       string;
  label:       string;
  placeholder?: string;
  full?:       boolean;
  type?:       string;
  options?:    { value: string; label: string }[];
}

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent,
    HeaderComponent],
  providers: [provideIcons({ matSaveOutline })],
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.scss']
})
export class ConfiguracionComponent implements OnInit {
  private svc   = inject(ConfiguracionService);
  private toast = inject(ToastService);

  configMap: Record<string, string> = {};
  loading = true;
  saving  = false;

  empresaKeys: ConfigKey[] = [
    { clave: 'empresa_nombre',    label: 'Nombre comercial',   placeholder: 'Agroservicio El Triunfo', full: true },
    { clave: 'empresa_nit',       label: 'NIT',                placeholder: '0000000-0' },
    { clave: 'empresa_telefono',  label: 'Teléfono',           placeholder: '0000-0000' },
    { clave: 'empresa_email',     label: 'Correo electrónico', placeholder: 'info@empresa.gt' },
    { clave: 'empresa_direccion', label: 'Dirección',          placeholder: 'Dirección completa', full: true },
  ];

  sistemaKeys: ConfigKey[] = [
    { clave: 'iva_porcentaje',   label: 'IVA (%)',                  type: 'number' },
    { clave: 'descuento_maximo', label: 'Descuento máximo (%)',     type: 'number' },
    { clave: 'dias_credito',     label: 'Días de crédito por def.', type: 'number' },
    { clave: 'moneda',           label: 'Moneda del sistema',
      options: [
        { value: 'GTQ', label: 'Quetzal (GTQ)' },
        { value: 'USD', label: 'Dólar (USD)'   }
      ]
    },
    { clave: 'metodo_valuacion', label: 'Valuación de inventario',
      options: [
        { value: 'PEPS',     label: 'PEPS (Primero en entrar)' },
        { value: 'UEPS',     label: 'UEPS (Último en entrar)'  },
        { value: 'PROMEDIO', label: 'Costo promedio'           }
      ]
    },
  ];

  ngOnInit(): void {
    this.svc.getAll().subscribe({
      next:  r => { r.forEach(c => this.configMap[c.clave] = c.valor); this.loading = false; },
      error: () => { this.loading = false; this.toast.error('Error cargando configuración'); }
    });
  }

  save(): void {
    this.saving = true;
    const config = Object.entries(this.configMap).map(([clave, valor]) => ({ clave, valor }));
    this.svc.save(config).subscribe({
      next:  () => { this.saving = false; this.toast.success('Configuración guardada'); },
      error: e  => { this.saving = false; this.toast.error(e?.error?.error || 'Error guardando'); }
    });
  }
}
