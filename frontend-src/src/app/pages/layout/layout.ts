import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../components/shared/sidebar/sidebar';
import { TopbarComponent } from '../../components/shared/topbar/topbar';
import { ToastComponent } from '../../components/shared/toast/toast';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, ToastComponent],
  templateUrl: './layout.html',
})
export class LayoutComponent {
  sidebarOpen = signal(false);
}
