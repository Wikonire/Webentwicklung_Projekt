import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

type SnackMessage = { text: string; type: 'info' | 'error' };

@Injectable({ providedIn: 'root' })
export class SnackBarService {
  private snackBar = inject(MatSnackBar);
  private queue: SnackMessage[] = [];
  private isOpen = false;

  /** Info-Nachricht anzeigen */
  info(message: string): void {
    this.enqueueMessage(message, 'info');
  }

  /** Fehler-Nachricht anzeigen */
  error(message: string): void {
    this.enqueueMessage(message, 'error');
  }

  /** Generische Queue-Logik */
  private enqueueMessage(text: string, type: 'info' | 'error'): void {
    this.queue.push({ text, type });
    this.tryShowNext();
  }

  private tryShowNext(): void {
    if (this.isOpen || this.queue.length === 0) return;

    const { text, type } = this.queue.shift()!;
    this.isOpen = true;

    this.snackBar.open(text, type === 'error' ? 'Fehler' : 'OK', {
      duration: type === 'error' ? 5000 : 3000,
      horizontalPosition: 'start',
      verticalPosition: 'top',
      panelClass: [type === 'error' ? 'snackbar-error' : 'snackbar-info']
    }).afterDismissed().subscribe(() => {
      this.isOpen = false;
      this.tryShowNext();
    });
  }
}
