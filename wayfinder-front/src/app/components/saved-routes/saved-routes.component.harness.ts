import { ComponentHarness } from '@angular/cdk/testing';
import { MatListHarness, MatListItemHarness } from '@angular/material/list/testing';
import { MatButtonHarness } from '@angular/material/button/testing';

export class SavedRoutesHarness extends ComponentHarness {
  static hostSelector = 'app-saved-routes';

  private getList = this.locatorFor(MatListHarness);
  private getListItems = this.locatorForAll(MatListItemHarness);

  private getDeleteButtons = this.locatorForAll(
    MatButtonHarness.with({ selector: '[data-testid="delete-saved-route"]' })
  );

  private getMapButtons = this.locatorForAll(
    MatButtonHarness.with({ selector: '[data-testid="saved-route-to-map"]' })
  );

  /** Alle gespeicherten Routen als Text auslesen */
  async getSavedRoutes(): Promise<string[]> {
    const items = await this.getListItems();
    return Promise.all(items.map(async item => (await item.getText()).trim()));
  }

  /** Klickt auf den Löschen-Button der Route am Index */
  async triggerRemove(index: number): Promise<void> {
    const buttons = await this.getDeleteButtons();
    if (buttons[index]) {
      await buttons[index].click();
    }
  }

  /** Klickt auf den "Auf Karte anzeigen"-Button der Route am Index */
  async triggerShowOnMap(index: number): Promise<void> {
    const buttons = await this.getMapButtons();
    if (buttons[index]) {
      await buttons[index].click();
    }
  }

  /** Gibt alle MatListItemHarness-Instanzen zurück */
  async getListHarnessItems(): Promise<MatListItemHarness[]> {
    return this.getListItems();
  }
}
