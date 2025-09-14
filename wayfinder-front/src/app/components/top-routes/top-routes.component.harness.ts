import { ComponentHarness } from '@angular/cdk/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatListHarness, MatListItemHarness } from '@angular/material/list/testing';

export class TopRoutesHarness extends ComponentHarness {
  static hostSelector = 'app-top-routes';

  private getList = this.locatorFor(MatListHarness);
  private getListItems = this.locatorForAll(MatListItemHarness);

  /** Liest alle sichtbaren Top-Routen-Einträge als Text */
  async getTopEntries(): Promise<string[]> {
    const items = await this.getListItems();
    return Promise.all(items.map(async item => (await item.getText()).trim()));
  }

  /** Klickt auf den "Speichern"-Button eines bestimmten Routen-Eintrags */
  async triggerSave(index: number): Promise<void> {
    const items = await this.getListItems();
    if (items[index]) {
      const button = await items[index].getHarness(MatButtonHarness);
      await button.click();
    }
  }

  /** Gibt alle Listeneinträge als MatListItemHarness zurück */
  async getListHarnessItems(): Promise<MatListItemHarness[]> {
    return this.getListItems();
  }

  /** Klickt auf den Button "Liste leeren" */
  async clearList(): Promise<void> {
    const clearButton = await this.locatorFor(
      MatButtonHarness.with({ text: /Liste leeren/i })
    )();
    await clearButton.click();
  }
}
