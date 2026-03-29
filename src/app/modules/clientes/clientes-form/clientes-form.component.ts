// clientes-form.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { matArrowBackOutline, matSaveOutline } from '@ng-icons/material-icons/outline';
import { ClientesService, EventBusService, ToastService } from '../../../core/services/services';

@Component({
  selector: 'app-clientes-form',
  standalone: true,
  imports: [
    HeaderComponent,CommonModule, ReactiveFormsModule, NgIconComponent],
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
  private eventBus = inject(EventBusService);

  form!: FormGroup;
  isEdit = false;
  saving = false;
  clienteId?: number;

  get f() { return this.form.controls; }

  departamentos = [
    'Alta Verapaz','Baja Verapaz','Chimaltenango','Chiquimula','El Progreso',
    'Escuintla','Guatemala','Huehuetenango','Izabal','Jalapa','Jutiapa',
    'Petén','Quetzaltenango','Quiché','Retalhuleu','Sacatepéquez',
    'San Marcos','Santa Rosa','Sololá','Suchitepéquez','Totonicapán','Zacapa'
  ];

  ngOnInit(): void {
    this.buildForm();
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nuevo') {
      this.isEdit = true; this.clienteId = +id;
      this.svc.getById(+id).subscribe({
        next:  c => this.form.patchValue(c),
        error: () => { this.toast.error('Error cargando cliente'); this.router.navigate(['/clientes']); }
      });
    }
  }

  buildForm(): void {
    this.form = this.fb.group({
      nombre:         ['', [Validators.required, Validators.minLength(2)]],
      tipo:           ['individual'],
      nit:            [''],
      cui:            [''],
      telefono:       [''],
      email:          ['', [Validators.email]],
      direccion:      [''],
      municipio:      [''],
      departamento:   [''],
      credito_maximo: [0, [Validators.min(0)]],
      dias_credito:   [0, [Validators.min(0)]],
      notas:          [''],
      activo:         [true],
    });
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const data = this.form.value;
    const req = this.isEdit && this.clienteId
      ? this.svc.update(this.clienteId, data)
      : this.svc.create(data);

    req.subscribe({
      next:  () => {
        this.toast.success(this.isEdit ? 'Cliente actualizado' : 'Cliente creado exitosamente');
         this.eventBus.emitRefresh();
        this.router.navigate(['/clientes']);
      },
      error: e => {
        this.saving = false;
        this.toast.error(e?.error?.error || 'Error guardando cliente');
      }
    });
  }

  cancel(): void { this.router.navigate(['/clientes']); }
}
