import Phaser from 'phaser';

/** Menu-only tokens: gameplay contrast and HUD colors remain independent. */
export const MENU = {
  paper: 0xfaf5eb, card: 0xfffcf6, ink: '#123740', muted: '#546b6e',
  mint: '#80eac8', line: 0xd8ded4, teal: '#176c66', amber: '#9b6116',
  font: 'Avenir Next, Trebuchet MS, system-ui, sans-serif',
};

// Atlas art order: Ken wears the dark fleece; Kaya wears the cap and sunglasses.
export const PORTRAITS = ['eugene', 'ken', 'lucien', 'kaya', 'jason', 'dhiwya', 'raj', 'lidiya', 'dharma', 'amanda', 'janeen'];

export const MENU_SPRITE_FRAMES = [
  'tool-squirtBottle', 'tool-lysolFogger', 'tool-bleachSoaker', 'tool-uvWand',
  'tool-peroxideFoamer', 'tool-wipes', 'tool-gelLauncher', 'tool-defib',
  'staff-omar', 'staff-alan', 'staff-donald', 'staff-selina',
  'staff-elaine', 'staff-alexandra', 'germ-basic', 'germ-sprinter',
  'germ-sneezer', 'germ-sporePod', 'germ-duo', 'germ-patientZero',
  'ui-podium',
] as const;

export const MENU_BG_FRAMES = ['bg-providers', 'bg-locker', 'bg-board', 'bg-leaderboard'] as const;
export type MenuBgFrame = typeof MENU_BG_FRAMES[number];

/** Art only the Providers, Locker, Board and Leaderboard screens use: not loaded at boot. */
const MENU_ART = { 'menu-sprites': 'assets/menu-sprites.jpg', 'menu-bgs': 'assets/menu-bgs.jpg' } as const;

/** Queues whatever menu art isn't loaded yet. Menu scenes call it from preload(), so they wait for it. */
export function queueMenuArt(scene: Phaser.Scene): boolean {
  const missing = Object.entries(MENU_ART).filter(([key]) => !scene.textures.exists(key));
  if (!missing.length) return false;
  for (const [key, url] of missing) scene.load.image(key, url);
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => registerMenuFrames(scene));
  return true;
}

/** The title calls this once it's showing: the menu art arrives in the background, before most taps. */
export function preloadMenuArt(scene: Phaser.Scene): void {
  if (queueMenuArt(scene)) scene.load.start();
}

export function registerPortraits(scene: Phaser.Scene): void {
  const texture = scene.textures.get('provider-portraits');
  const source = texture.getSourceImage() as HTMLImageElement;
  const w = source.width / 4, h = source.height / 3;
  PORTRAITS.forEach((id, i) => { if (!texture.has(id)) texture.add(id, 0, Math.round(i % 4 * w), Math.round(Math.floor(i / 4) * h), Math.floor(w), Math.floor(h)); });
  registerMenuFrames(scene);
}

/** Frames of the menu art, once it's loaded (safe to call again). */
export function registerMenuFrames(scene: Phaser.Scene): void {

  if (scene.textures.exists('menu-sprites')) {
    const spriteTex = scene.textures.get('menu-sprites');
    const sw = 200, sh = 190;
    MENU_SPRITE_FRAMES.forEach((id, i) => {
      if (!spriteTex.has(id)) {
        spriteTex.add(id, 0, (i % 4) * sw, Math.floor(i / 4) * sh, sw, sh);
      }
    });
  }

  if (scene.textures.exists('menu-bgs')) {
    const bgTex = scene.textures.get('menu-bgs');
    const bw = 800, bh = 450;
    MENU_BG_FRAMES.forEach((id, i) => {
      if (!bgTex.has(id)) {
        bgTex.add(id, 0, (i % 2) * bw, Math.floor(i / 2) * bh, bw, bh);
      }
    });
  }
}

export function renderMenuBackground(scene: Phaser.Scene, frame: MenuBgFrame): void {
  const w = scene.scale.width;
  const h = scene.scale.height;
  if (scene.textures.exists('menu-bgs') && scene.textures.get('menu-bgs').has(frame)) {
    const bg = scene.add.image(w / 2, h / 2, 'menu-bgs', frame).setDepth(-20);
    bg.setScale(Math.max(w / 800, h / 450));
  } else {
    scene.add.rectangle(w / 2, h / 2, w, h, MENU.paper).setDepth(-20);
  }
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
