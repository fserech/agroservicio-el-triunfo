// proveedores-form.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { matArrowBackOutline, matSaveOutline } from '@ng-icons/material-icons/outline';
import { ProveedoresService, ToastService } from '../../../core/services/services';

@Component({
  selector: 'app-proveedores-form',
  standalone: true,
  imports: [
    HeaderComponent,CommonModule, ReactiveFormsModule, NgIconComponent],
  providers: [provideIcons({ matArrowBackOutline, matSaveOutline })],
  templateUrl: './proveedores-form.component.html',
  styleUrls: ['./proveedores-form.component.scss']
})
export class ProveedoresFormComponent implements OnInit {
  private svc    = inject(ProveedoresService);
  private toast  = inject(ToastService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private fb     = inject(FormBuilder);

  form!: FormGroup;
  isEdit = false;
  saving = false;
  proveedorId?: number;
  get f() { return this.form.controls; }

  departamentos = [
    'Alta Verapaz','Baja Verapaz','Chimaltenango','Chiquimula','El Progreso',
    'Escuintla','Guatemala','Huehuetenango','Izabal','Jalapa','Jutiapa',
    'Petén','Quetzaltenango','Quiché','Retalhuleu','Sacatepéquez',
    'San Marcos','Santa Rosa','Sololá','Suchitepéquez','Totonicapán','Zacapa'
  ];

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre:         ['', [Validators.required]],
      razon_social:   [''],
      nit:            [''],
      contacto:       [''],
      telefono:       [''],
      email:          ['', [Validators.email]],
      direccion:      [''],
      departamento:   [''],
      categoria:      [''],
      plazo_credito:  [0, [Validators.min(0)]],
      activo:         [true],
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nuevo') {
      this.isEdit = true; this.proveedorId = +id;
      this.svc.getById(+id).subscribe({
        next:  p => this.form.patchValue(p),
        error: () => { this.toast.error('Error cargando proveedor'); this.router.navigate(['/proveedores']); }
      });
    }
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const req = this.isEdit && this.proveedorId
      ? this.svc.update(this.proveedorId, this.form.value)
      : this.svc.create(this.form.value);
    req.subscribe({
      next:  () => { this.toast.success(this.isEdit ? 'Proveedor actualizado' : 'Proveedor creado'); this.router.navigate(['/proveedores']); },
      error: e  => { this.saving = false; this.toast.error(e?.error?.error || 'Error guardando proveedor'); }
    });
  }

  cancel(): void { this.router.navigate(['/proveedores']); }
}
