// login.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { matLoginOutline, matErrorOutline, matVisibilityOutline, matVisibilityOffOutline } from '@ng-icons/material-icons/outline';
import { AuthService } from '../../../core/services/services';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent],
  providers: [provideIcons({ matLoginOutline, matErrorOutline, matVisibilityOutline, matVisibilityOffOutline })],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);

  form!: FormGroup;
  loading      = false;
  showPassword = false;
  errorMsg     = '';

  ngOnInit(): void {
    if (this.auth.isLoggedIn) { this.router.navigate(['/dashboard']); return; }
    this.form = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(4)]],
    });
  }

  login(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true; this.errorMsg = '';
    const { username, password } = this.form.value;
    this.auth.login(username, password).subscribe({
      next: () => { this.loading = false; this.router.navigate(['/dashboard']); },
      error: e  => { this.loading = false; this.errorMsg = e?.error?.error || 'Error al iniciar sesión'; }
    });
  }
}
