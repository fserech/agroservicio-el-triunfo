import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { matArrowBackOutline, matSaveOutline } from '@ng-icons/material-icons/outline';
import { ClientesService, ToastService } from '../../../core/services/services';

@Component({
  selector: 'app-clientes-form',
  standalone: true,
  imports: [HeaderComponent, CommonModule, ReactiveFormsModule, NgIconComponent],
  providers: [provideIcons({ matArrowBackOutline, matSaveOutline })],
  templateUrl: './clientes-form.component.html',
  styleUrls: ['./clientes-form.component.scss']
})
export class ClientesFormComponent implements OnInit {
  private svc    = inject(ClientesService);
  private toast  = inject(ToastService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private fb     = inject(FormBuilder);

  form!: FormGroup;
  isEdit    = false;
  saving    = false;
  clienteId?: number;
  get f() { return this.form.controls; }

  departamentos = [
    'Alta Verapaz','Baja Verapaz','Chimaltenango','Chiquimula','El Progreso',
    'Escuintla','Guatemala','Huehuetenango','Izabal','Jalapa','Jutiapa',
    'Petén','Quetzaltenango','Quiché','Retalhuleu','Sacatepéquez',
    'San Marcos','Santa Rosa','Sololá','Suchitepéquez','Totonicapán','Zacapa'
  ];

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre:          ['', [Validators.required]],
      tipo:            ['individual'],
      nit:             [''],
      cui:             [''],
      telefono:        [''],
      email:           ['', [Validators.email]],
      direccion:       [''],
      municipio:       [''],
      departamento:    [''],
      credito_maximo:  [0, [Validators.min(0)]],
      dias_credito:    [0, [Validators.min(0)]],
      notas:           [''],
      activo:          [true],
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nuevo') {
      this.isEdit = true; this.clienteId = +id;
      this.svc.getById(+id).subscribe({
        next:  c => this.form.patchValue(c),
        error: () => { this.toast.error('Error cargando cliente'); this.router.navigate(['/clientes']); }
      });
    }
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const req = this.isEdit && this.clienteId
      ? this.svc.update(this.clienteId, this.form.value)
      : this.svc.create(this.form.value);
    req.subscribe({
      next:  () => { this.toast.success(this.isEdit ? 'Cliente actualizado' : 'Cliente creado'); this.router.navigate(['/clientes']); },
      error: e  => { this.saving = false; this.toast.error(e?.error?.error || 'Error al guardar'); }
    });
  }

  cancel(): void { this.router.navigate(['/clientes']); }
}