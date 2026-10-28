import Phaser from 'phaser';

/** Menu-only tokens: gameplay contrast and HUD colors remain independent. */
export const MENU = {
  paper: 0xfaf5eb, card: 0xfffcf6, ink: '#123740', muted: '#546b6e',
  mint: '#80eac8', line: 0xd8ded4, teal: '#176c66', amber: '#9b6116',
  font: 'Avenir Next, Trebuchet MS, system-ui, sans-serif',
};

export const PORTRAITS = ['eugene', 'kaya', 'lucien', 'ken', 'jason', 'dhiwya', 'raj', 'lidiya', 'dharma', 'amanda', 'janeen'];

export function registerPortraits(scene: Phaser.Scene): void {
  const texture = scene.textures.get('provider-portraits');
  const source = texture.getSourceImage() as HTMLImageElement;
  const w = source.width / 4, h = source.height / 3;
  PORTRAITS.forEach((id, i) => texture.add(id, 0, Math.round(i % 4 * w), Math.round(Math.floor(i / 4) * h), Math.floor(w), Math.floor(h)));
}

export function menuButton(t: Phaser.GameObjects.Text, primary = false): Phaser.GameObjects.Text {
  return t.setFontFamily(MENU.font).setFontStyle('bold').setColor(MENU.ink)
    .setBackgroundColor(primary ? MENU.mint : '#eeeade').setPadding(18, 14)
    .setShadow(0, 0, '#000', 0);
}

/** Phaser also emits resize while refreshing unchanged bounds. Rebuild only
 * after the logical dimensions change, so refreshes cannot restart menus or
 * issue duplicate network requests. */
export function restartOnMenuResize(scene: Phaser.Scene): void {
  let width = scene.scale.width, height = scene.scale.height;
  const relayout = () => {
    if (scene.scale.width === width && scene.scale.height === height) return;
    width = scene.scale.width;
    height = scene.scale.height;
    scene.scene.restart();
  };
  scene.scale.on('resize', relayout);
  scene.events.once('shutdown', () => scene.scale.off('resize', relayout));
}
