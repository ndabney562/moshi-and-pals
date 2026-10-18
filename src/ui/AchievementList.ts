import Phaser from 'phaser';
import { COLORS } from '../config/theme';
import { achievementList } from '../core/achievements';

const font = 'system-ui, -apple-system, sans-serif';

/** The full list of achievements (from the pause menu): unlocked ones lit, the rest as a to-do list. */
export class AchievementList extends Phaser.GameObjects.Container {
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly back: Phaser.GameObjects.Text;
  private readonly rows: { name: Phaser.GameObjects.Text; how: Phaser.GameObjects.Text }[] = [];

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.dim = scene.add.rectangle(0, 0, 10, 10, 0x0d2b2e, 1).setOrigin(0).setInteractive();
    this.title = scene.add.text(0, 0, '', { fontFamily: font, fontSize: '40px', fontStyle: '900', color: COLORS.uiText }).setOrigin(0.5).setShadow(0, 4, '#000', 8);
    this.back = scene.add.text(0, 0, 'BACK', {
      fontFamily: font, fontSize: '26px', fontStyle: 'bold', color: COLORS.uiText, backgroundColor: '#1f4f55', padding: { x: 40, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.setVisible(false));
    this.add([this.dim, this.title, this.back]);
    for (let i = 0; i < achievementList().length; i++) {
      const name = scene.add.text(0, 0, '', { fontFamily: font, fontSize: '19px', fontStyle: '900', color: COLORS.uiText });
      const how = scene.add.text(0, 0, '', { fontFamily: font, fontSize: '14px', fontStyle: 'bold', color: '#9fb8b3' });
      this.rows.push({ name, how });
      this.add([name, how]);
    }
    this.setDepth(110).setVisible(false);
    scene.add.existing(this);
  }

  open(): void {
    const list = achievementList();
    const got = list.filter((a) => a.unlocked).length;
    this.title.setText(`ACHIEVEMENTS  ${got} / ${list.length}`);
    list.forEach(({ def, unlocked }, i) => {
      const r = this.rows[i];
      r.name.setText(`${unlocked ? '🏆' : '🔒'}  ${def.name}`).setColor(unlocked ? '#ffe66d' : '#6f8f8a');
      r.how.setText(def.how).setColor(unlocked ? COLORS.uiText : '#6f8f8a');
    });
    this.layout(this.scene.scale.width, this.scene.scale.height);
    this.setVisible(true);
  }

  layout(width: number, height: number): void {
    this.dim.setSize(width, height);
    this.dim.input?.hitArea.setSize(width, height);
    this.title.setPosition(width / 2, 52);
    this.back.setPosition(width / 2, height - 44);
    const top = 100;
    // Two columns while they fit comfortably, then three
    const cols = (height - top - 100) / Math.ceil(this.rows.length / 2) >= 42 ? 2 : 3;
    const perCol = Math.ceil(this.rows.length / cols);
    const rowH = Math.min(50, (height - top - 100) / perCol);
    const colW = Math.min(560, (width - 120) / cols);
    const left = width / 2 - (colW * cols) / 2;
    this.rows.forEach((r, i) => {
      const x = left + Math.floor(i / perCol) * colW + 20;
      const y = top + (i % perCol) * rowH;
      r.name.setPosition(x, y);
      r.how.setPosition(x + 30, y + 23);
    });
  }
}
