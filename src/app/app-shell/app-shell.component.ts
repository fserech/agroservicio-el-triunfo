// app-shell.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { matLogoutOutline } from '@ng-icons/material-icons/outline';
import { AuthService } from '../core/services/services';
import { SidebarComponent } from '../shared/components/sidebar/sidebar.component';
import { ToastComponent } from '../shared/components/toast/toast.component';
import { Usuario } from '../core/models/models';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, NgIconComponent, SidebarComponent, ToastComponent],
  providers: [provideIcons({ matLogoutOutline })],
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss']
})
export class AppShellComponent implements OnInit {
  private auth = inject(AuthService);
  user?: Usuario | null;

  ngOnInit(): void { this.user = this.auth.user; }
  logout(): void { this.auth.logout(); }
}
