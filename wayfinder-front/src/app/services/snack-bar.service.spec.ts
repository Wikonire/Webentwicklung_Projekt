import { TestBed } from '@angular/core/testing';
import { SnackBarService } from './snack-bar.service';
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';

describe('SnackBarService with Jest', () => {
  let service: SnackBarService;
  let snackBarMock: jest.Mocked<MatSnackBar>;
  let afterDismissed$: Subject<any>;

  beforeEach(() => {
    afterDismissed$ = new Subject<void>();

    const matSnackBarMock: Partial<jest.Mocked<MatSnackBar>> = {
      open: jest.fn().mockReturnValue({
        afterDismissed: () => afterDismissed$.asObservable(),
      } as unknown as MatSnackBarRef<any>),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: MatSnackBar, useValue: matSnackBarMock }],
    });

    service = TestBed.inject(SnackBarService);
    snackBarMock = TestBed.inject(MatSnackBar) as jest.Mocked<MatSnackBar>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('info()', () => {
    it('should open snackbar with info styling', () => {
      service.info('Hello');

      expect(snackBarMock.open).toHaveBeenCalledWith(
        'Hello',
        'OK',
        expect.objectContaining({
          duration: 3000,
          panelClass: ['snackbar-info'],
        }),
      );
    });
  });

  describe('error()', () => {
    it('should open snackbar with error styling', () => {
      service.error('Oops');

      expect(snackBarMock.open).toHaveBeenCalledWith(
        'Oops',
        'Fehler',
        expect.objectContaining({
          duration: 5000,
          panelClass: ['snackbar-error'],
        }),
      );
    });
  });

  describe('queue behavior', () => {
    it('should queue multiple messages and show them sequentially', () => {
      service.info('First');
      service.error('Second');

      // nur erste Nachricht sofort geöffnet
      expect(snackBarMock.open).toHaveBeenCalledTimes(1);
      expect(snackBarMock.open).toHaveBeenLastCalledWith(
        'First',
        'OK',
        expect.any(Object),
      );

      // dismiss erst Nachricht
      afterDismissed$.next(undefined);
      afterDismissed$.complete();

      // jetzt zweite Nachricht öffnen
      expect(snackBarMock.open).toHaveBeenCalledTimes(2);
      expect(snackBarMock.open).toHaveBeenLastCalledWith(
        'Second',
        'Fehler',
        expect.any(Object),
      );
    });

    it('should not open snackbar again if one is already open', () => {
      service.info('Message A');
      service.info('Message B');

      expect(snackBarMock.open).toHaveBeenCalledTimes(1);
    });
  });
});
