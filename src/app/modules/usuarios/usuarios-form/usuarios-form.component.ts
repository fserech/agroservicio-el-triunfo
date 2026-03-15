// usuarios-form.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { matArrowBackOutline, matSaveOutline } from '@ng-icons/material-icons/outline';
import { UsuariosService, ToastService } from '../../../core/services/services';

@Component({
  selector: 'app-usuarios-form',
  standalone: true,
  imports: [
    HeaderComponent,CommonModule, ReactiveFormsModule, NgIconComponent],
  providers: [provideIcons({ matArrowBackOutline, matSaveOutline })],
  templateUrl: './usuarios-form.component.html',
  styleUrls: ['./usuarios-form.component.scss']
})
export class UsuariosFormComponent implements OnInit {
  private svc    = inject(UsuariosService);
  private toast  = inject(ToastService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private fb     = inject(FormBuilder);

  form!: FormGroup;
  isEdit = false; saving = false; usuarioId?: number;
  get f() { return this.form.controls; }

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre:   ['', [Validators.required]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email:    ['', [Validators.email]],
      rol:      ['vendedor', [Validators.required]],
      activo:   [true],
      password: ['', [Validators.minLength(6)]],
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nuevo') {
      this.isEdit = true; this.usuarioId = +id;
      this.svc.getAll().subscribe(users => {
        const u = users.find(x => x.id === +id);
        if (u) this.form.patchValue(u);
      });
    } else {
      this.form.get('password')!.setValidators([Validators.required, Validators.minLength(6)]);
      this.form.get('password')!.updateValueAndValidity();
    }
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const data = this.form.value;
    const req  = this.isEdit && this.usuarioId
      ? this.svc.update(this.usuarioId, data)
      : this.svc.create(data);
    req.subscribe({
      next:  () => { this.toast.success(this.isEdit ? 'Usuario actualizado' : 'Usuario creado'); this.router.navigate(['/usuarios']); },
      error: e  => { this.saving = false; this.toast.error(e?.error?.error || 'Error guardando usuario'); }
    });
  }

  cancel(): void { this.router.navigate(['/usuarios']); }
}
