import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {

  title: string = '';
  description: string = '';
  @Input() set headerTitle(title: string) { this.title = title; }
  @Input() set headerDescription(description: string) { this.description = description; }


}