import Phaser from 'phaser';
import { MENU } from './menuTheme';
import { progress } from '../core/progress';
import { settings, saveSettings } from '../core/settings';
import { characterById } from '../data/characters';
import { doctorUnlocked } from '../core/progress';
import { readSafeArea } from '../core/safeArea';
import { toTitle } from '../core/native';

export type MenuTabId = 'title' | 'providers' | 'locker' | 'board' | 'atlas' | 'leaderboard';

export interface TabConfig {
  id: MenuTabId;
  label: string;
  icon: string;
  targetScene: string;
  sceneData?: any;
}

export const MENU_TABS: TabConfig[] = [
  { id: 'providers', label: 'PROVIDERS', icon: '👥', targetScene: 'Providers' },
  { id: 'locker', label: 'LOCKER', icon: '🧰', targetScene: 'Locker' },
  { id: 'board', label: 'BOARD', icon: '🎓', targetScene: 'Board', sceneData: { tab: 'specialties' } },
  { id: 'atlas', label: 'ATLAS', icon: '🔬', targetScene: 'Board', sceneData: { tab: 'atlas' } },
  { id: 'leaderboard', label: 'LEADERBOARD', icon: '🏆', targetScene: 'Leaderboard' },
];

/**
 * Smooth fade-to-black scene transition.
 * Fades out current camera, switches scene, and new scene fades in.
 */
export function transitionTo(scene: Phaser.Scene, targetScene: string, data?: any): void {
  if ((scene as any).__isTransitioning) return;
  (scene as any).__isTransitioning = true;

  const doSwitch = () => {
    (scene as any).__isTransitioning = false;
    if (targetScene === 'Title') {
      toTitle(scene);
    } else {
      scene.scene.start(targetScene, data);
    }
  };

  if (settings.reducedMotion || !scene.cameras?.main) {
    doSwitch();
    return;
  }

  scene.input.enabled = false;
  scene.cameras.main.fadeOut(150, 0, 0, 0);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, doSwitch);
}

export interface MenuHeaderComponents {
  bar: Phaser.GameObjects.Graphics;
  portrait: Phaser.GameObjects.Image;
  pickInfo: Phaser.GameObjects.Text;
  doctorChipHit: Phaser.GameObjects.Rectangle;
  npsText: Phaser.GameObjects.Text;
  settingsButton?: Phaser.GameObjects.Text;
  tabButtons: Map<string, Phaser.GameObjects.Text>;
  activeTabBadge?: Phaser.GameObjects.Text;
  layout: () => void;
  destroy: () => void;
}

/**
 * Standardized Top Panel header for Title and Sub-menus.
 * - Left: Doctor Avatar + Level Star + Doctor Name (tappable -> Providers)
 * - Center: All 5 tabs on Title screen; ONLY active tab badge on sub-screens.
 * - Right: Standardized stats badges (⭐ NPS · 🎓 CME · 💵 $Bank · ⚙️ Settings)
 */
export function renderMenuTopPanel(
  scene: Phaser.Scene,
  activeTab: MenuTabId,
  tabButtonsOut?: { [key: string]: Phaser.GameObjects.Text }
): MenuHeaderComponents {
  const bar = scene.add.graphics().setDepth(100);
  const selectedDoc = characterById(doctorUnlocked(settings.character) ? settings.character : 'eugene');
  settings.character = selectedDoc.id;

  // 1. Doctor Chip (Left)
  const portrait = scene.add.image(0, 0, 'provider-portraits', selectedDoc.id)
    .setInteractive({ useHandCursor: true })
    .setDepth(102);

  const pickInfo = scene.add.text(0, 0, selectedDoc.name, {
    fontFamily: MENU.font,
    fontSize: '15px',
    fontStyle: 'bold',
    color: '#e8fff9',
  }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).setDepth(102);

  const doctorChipHit = scene.add.rectangle(0, 0, 10, 10, 0xffffff, 0)
    .setInteractive({ useHandCursor: true })
    .setDepth(103);

  const onDoctorChip = () => {
    if (activeTab !== 'providers') {
      transitionTo(scene, 'Providers');
    }
  };
  portrait.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: any) => { e?.stopPropagation?.(); onDoctorChip(); });
  pickInfo.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: any) => { e?.stopPropagation?.(); onDoctorChip(); });
  doctorChipHit.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: any) => { e?.stopPropagation?.(); onDoctorChip(); });

  // 2. Center Navigation Tabs
  const tabButtons = new Map<string, Phaser.GameObjects.Text>();
  let activeTabBadge: Phaser.GameObjects.Text | undefined;

  if (activeTab === 'title') {
    // Render all 5 navigation tabs
    for (const tab of MENU_TABS) {
      const btn = scene.add.text(0, 0, `${tab.icon} ${tab.label}`, {
        fontFamily: MENU.font,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#e8fff9',
        backgroundColor: '#163b40',
        padding: { x: 10, y: 7 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(102);

      btn.on('pointerover', () => btn.setBackgroundColor('#215a61'));
      btn.on('pointerout', () => btn.setBackgroundColor('#163b40'));
      btn.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: any) => {
        e?.stopPropagation?.();
        const data = tab.id === 'leaderboard' ? { returnTo: 'Title' } : tab.sceneData;
        transitionTo(scene, tab.targetScene, data);
      });

      tabButtons.set(tab.id, btn);
      if (tabButtonsOut) {
        tabButtonsOut[`${tab.id}Button`] = btn;
      }
    }
  } else {
    // Render ONLY the active tab badge in the center
    const activeConf = MENU_TABS.find(t => t.id === activeTab) ?? {
      id: activeTab,
      label: activeTab.toUpperCase(),
      icon: '📋',
      targetScene: 'Title',
    };
    activeTabBadge = scene.add.text(0, 0, `${activeConf.icon} ${activeConf.label}`, {
      fontFamily: MENU.font,
      fontSize: '16px',
      fontStyle: '900',
      color: '#0d2b2e',
      backgroundColor: '#80eac8',
      padding: { x: 18, y: 7 },
    }).setOrigin(0.5).setDepth(102);
  }

  // 3. Stats Badge (Right)
  const p = progress();
  const npsText = scene.add.text(0, 0, `⭐ ${p.nps.toLocaleString()} NPS  ·  🎓 ${p.credits} CME  ·  $${p.bank.toLocaleString()}`, {
    fontFamily: MENU.font,
    fontSize: '13px',
    fontStyle: 'bold',
    color: '#e8fff9',
  }).setOrigin(1, 0.5).setDepth(102);

  // Settings cog icon
  const settingsButton = scene.add.text(0, 0, '⚙️', {
    fontFamily: MENU.font,
    fontSize: '18px',
    padding: { x: 6, y: 4 },
  }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).setDepth(102);

  settingsButton.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: any) => {
    e?.stopPropagation?.();
    settings.sound = !settings.sound;
    settings.music = settings.sound;
    saveSettings();
    settingsButton.setText(settings.sound ? '⚙️' : '🔇');
  });

  const layout = () => {
    const { width: w, height: _h } = scene.scale;
    const safe = readSafeArea();
    const left = Math.max(16, safe.left + 12);
    const right = w - Math.max(16, safe.right + 12);
    const topBarH = 64;
    const centerY = topBarH / 2;

    bar.clear();
    // Glassmorphic dark header bar with subtle elevation and border
    bar.fillStyle(0x06181b, 0.90).fillRect(0, 0, w, topBarH);
    bar.lineStyle(1.5, 0x1f4f55, 0.8).lineBetween(0, topBarH, w, topBarH);

    // Doctor Chip layout (Left)
    const docX = left + 14;
    portrait.setPosition(docX, centerY).setDisplaySize(28, 36);
    pickInfo.setPosition(docX + 22, centerY).setText(selectedDoc.name);

    // Chip container bounds for hit detection
    const chipW = 32 + pickInfo.width + 12;
    doctorChipHit.setPosition(docX - 8 + chipW / 2, centerY).setSize(chipW, 44);

    // Right stats layout
    settingsButton.setPosition(right, centerY);
    npsText.setPosition(right - 34, centerY);

    // Compact stats text on narrow screens
    if (w < 1100) {
      npsText.setText(`⭐ ${p.nps}  ·  🎓 ${p.credits}  ·  $${p.bank}`);
    } else {
      npsText.setText(`⭐ ${p.nps.toLocaleString()} NPS  ·  🎓 ${p.credits} CME  ·  $${p.bank.toLocaleString()}`);
    }

    if (activeTab === 'title') {
      // 5 tabs centered
      const navStartX = docX + chipW + 16;
      const navEndX = npsText.x - npsText.width - 24;
      const navAvailW = Math.max(380, navEndX - navStartX);
      const slot = navAvailW / MENU_TABS.length;

      MENU_TABS.forEach((tab, i) => {
        const btn = tabButtons.get(tab.id);
        if (btn) {
          const btnX = navStartX + slot * (i + 0.5);
          btn.setPosition(btnX, centerY);
          // Scale font slightly if tight
          if (slot < 95) {
            btn.setFontSize(11).setPadding(6, 5);
          } else if (slot < 115) {
            btn.setFontSize(12).setPadding(8, 6);
          } else {
            btn.setFontSize(13).setPadding(10, 7);
          }
        }
      });
    } else if (activeTabBadge) {
      // Single active tab badge in exact center
      activeTabBadge.setPosition(w / 2, centerY);
    }
  };

  layout();
  scene.scale.on('resize', layout);
  scene.events.once('shutdown', () => {
    scene.scale.off('resize', layout);
  });

  const destroy = () => {
    scene.scale.off('resize', layout);
    bar.destroy();
    portrait.destroy();
    pickInfo.destroy();
    doctorChipHit.destroy();
    npsText.destroy();
    settingsButton.destroy();
    tabButtons.forEach(b => b.destroy());
    activeTabBadge?.destroy();
  };

  return {
    bar,
    portrait,
    pickInfo,
    doctorChipHit,
    npsText,
    settingsButton,
    tabButtons,
    activeTabBadge,
    layout,
    destroy,
  };
}

/**
 * Standardized Back Button in the bottom-left on all sub-screens.
 * Text property is strictly 'BACK' for test suite compatibility.
 */
export function renderBackButton(
  scene: Phaser.Scene,
  onBack?: () => void
): Phaser.GameObjects.Text {
  const safe = readSafeArea();
  const left = Math.max(24, safe.left + 16);
  const bottom = scene.scale.height - Math.max(20, safe.bottom + 12) - 18;

  const btn = scene.add.text(left, bottom, 'BACK', {
    fontFamily: MENU.font,
    fontSize: '20px',
    fontStyle: 'bold',
    color: '#0d2b2e',
    backgroundColor: '#80eac8',
    padding: { x: 26, y: 12 },
  }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).setDepth(100);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      toTitle(scene);
    }
  };

  btn.on('pointerover', () => btn.setBackgroundColor('#a5f5dc'));
  btn.on('pointerout', () => btn.setBackgroundColor('#80eac8'));
  btn.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: any) => {
    e?.stopPropagation?.();
    handleBack();
  });
  btn.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: any) => {
    e?.stopPropagation?.();
    handleBack();
  });

  const relayout = () => {
    const s = readSafeArea();
    const l = Math.max(24, s.left + 16);
    const b = scene.scale.height - Math.max(20, s.bottom + 12) - 18;
    btn.setPosition(l, b);
  };

  scene.scale.on('resize', relayout);
  scene.events.once('shutdown', () => scene.scale.off('resize', relayout));

  return btn;
}
