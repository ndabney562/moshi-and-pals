import Phaser from 'phaser';
import { MENU } from './menuTheme';
import { progress, doctorUnlocked } from '../core/progress';
import { settings, saveSettings } from '../core/settings';
import { characterById } from '../data/characters';
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
 * Standardized Floating Pill Top Panel for Title and Sub-menus (matching user PNG mockups).
 * - Left: Floating rounded dark-teal doctor pill with portrait, name, star badge & cyan progress bar
 * - Center: All 5 floating rounded tab pills on Title screen; ONLY active glowing tab pill on sub-screens
 * - Right: Floating rounded dark-teal stats pill (⭐ NPS · 🎓 CME · 💵 $Bank | ⚙️)
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
    fontSize: '14px',
    fontStyle: 'bold',
    color: '#ffffff',
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
  let hoveredTab: string | null = null;

  if (activeTab === 'title') {
    for (const tab of MENU_TABS) {
      const btn = scene.add.text(0, 0, `${tab.icon} ${tab.label}`, {
        fontFamily: MENU.font,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f0fdfa',
        padding: { x: 10, y: 7 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(102);

      btn.on('pointerover', () => { hoveredTab = tab.id; layout(); });
      btn.on('pointerout', () => { if (hoveredTab === tab.id) { hoveredTab = null; layout(); } });
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
    const activeConf = MENU_TABS.find(t => t.id === activeTab) ?? {
      id: activeTab,
      label: activeTab.toUpperCase(),
      icon: '📋',
      targetScene: 'Title',
    };
    activeTabBadge = scene.add.text(0, 0, `${activeConf.icon} ${activeConf.label}`, {
      fontFamily: MENU.font,
      fontSize: '15px',
      fontStyle: '900',
      color: '#082630',
      padding: { x: 20, y: 7 },
    }).setOrigin(0.5).setDepth(102);
  }

  // 3. Stats Badge (Right)
  const p = progress();
  const npsText = scene.add.text(0, 0, `⭐ ${p.nps.toLocaleString()} NPS  ·  🎓 ${p.credits} CME  ·  $${p.bank.toLocaleString()}`, {
    fontFamily: MENU.font,
    fontSize: '13px',
    fontStyle: 'bold',
    color: '#f0fdfa',
  }).setOrigin(1, 0.5).setDepth(102);

  const settingsButton = scene.add.text(0, 0, settings.sound ? '⚙️' : '🔇', {
    fontFamily: MENU.font,
    fontSize: '16px',
    padding: { x: 6, y: 4 },
  }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).setDepth(102);

  settingsButton.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: any) => {
    e?.stopPropagation?.();
    settings.sound = !settings.sound;
    settings.music = settings.sound;
    saveSettings();
    settingsButton.setText(settings.sound ? '⚙️' : '🔇');
  });

  const drawGlassPill = (x: number, y: number, w: number, h: number, r: number, active = false, hover = false) => {
    // Drop shadow
    bar.fillStyle(0x020c12, 0.35).fillRoundedRect(x, y + 2, w, h, r);
    if (active) {
      bar.fillStyle(0x38e8d8, 0.96).fillRoundedRect(x, y, w, h, r);
      bar.lineStyle(2, 0xa5f3fc, 0.95).strokeRoundedRect(x, y, w, h, r);
    } else {
      bar.fillStyle(hover ? 0x164458 : 0x0b2736, 0.88).fillRoundedRect(x, y, w, h, r);
      bar.lineStyle(1.5, hover ? 0x67e8f9 : 0x38bdf8, hover ? 0.85 : 0.48).strokeRoundedRect(x, y, w, h, r);
    }
  };

  const layout = () => {
    const { width: w } = scene.scale;
    const safe = readSafeArea();
    const left = Math.max(12, safe.left + 8);
    const right = w - Math.max(12, safe.right + 8);
    const topBarH = 58;
    const centerY = topBarH / 2 + 2;

    bar.clear();

    // 1. Doctor Pill (Left)
    const docPillX = left;
    const docPillH = 42;
    const docPillY = centerY - docPillH / 2;
    portrait.setPosition(docPillX + 21, centerY).setDisplaySize(28, 32);
    pickInfo.setPosition(docPillX + 41, centerY - 5).setText(selectedDoc.name);

    const docPillW = Math.max(108, 46 + pickInfo.width + 14);
    drawGlassPill(docPillX, docPillY, docPillW, docPillH, 16);
    // Portrait frame border
    bar.lineStyle(1.5, 0x38bdf8, 0.7).strokeRoundedRect(docPillX + 6, centerY - 17, 30, 34, 8);
    // Cyan XP / level bar under doctor name (matching PNG top-left pill)
    const barW = Math.max(36, docPillW - 52);
    bar.fillStyle(0x061822, 0.9).fillRoundedRect(docPillX + 41, centerY + 6, barW, 6, 3);
    bar.fillStyle(0x22d3ee, 0.95).fillRoundedRect(docPillX + 41, centerY + 6, Math.round(barW * 0.68), 6, 3);

    doctorChipHit.setPosition(docPillX + docPillW / 2, centerY).setSize(docPillW, docPillH);

    // 3. Stats Pill (Right)
    if (w < 960) {
      npsText.setFontSize(11).setText(`⭐ ${p.nps} · 🎓 ${p.credits} · $${p.bank}`);
    } else if (w < 1150) {
      npsText.setFontSize(12).setText(`⭐ ${p.nps} · 🎓 ${p.credits} · 💵 $${p.bank}`);
    } else {
      npsText.setFontSize(13).setText(`⭐ ${p.nps.toLocaleString()} NPS  ·  🎓 ${p.credits} CME  ·  💵 $${p.bank.toLocaleString()}`);
    }
    settingsButton.setPosition(right - 6, centerY);
    npsText.setPosition(right - 34, centerY);

    const statsPillW = npsText.width + 48;
    const statsPillH = 40;
    const statsPillX = right - statsPillW;
    drawGlassPill(statsPillX, centerY - statsPillH / 2, statsPillW, statsPillH, 16);
    // Subtle vertical divider before gear icon
    bar.lineStyle(1, 0x38bdf8, 0.35).lineBetween(right - 30, centerY - 11, right - 30, centerY + 11);

    // 2. Center Tab Pills
    if (activeTab === 'title') {
      const navStartX = docPillX + docPillW + 8;
      const navEndX = statsPillX - 8;
      const navAvailW = Math.max(340, navEndX - navStartX);
      const slot = navAvailW / MENU_TABS.length;

      MENU_TABS.forEach((tab, i) => {
        const btn = tabButtons.get(tab.id);
        if (btn) {
          if (slot < 92) {
            btn.setFontSize(10).setPadding(5, 5);
          } else if (slot < 115) {
            btn.setFontSize(11).setPadding(7, 6);
          } else {
            btn.setFontSize(13).setPadding(10, 7);
          }
          const btnX = navStartX + slot * (i + 0.5);
          btn.setPosition(btnX, centerY);
          const pw = Math.min(slot - 4, btn.width + 4);
          const ph = 36;
          drawGlassPill(btnX - pw / 2, centerY - ph / 2, pw, ph, 14, false, hoveredTab === tab.id);
        }
      });
    } else if (activeTabBadge) {
      activeTabBadge.setPosition(w / 2, centerY);
      const pw = activeTabBadge.width + 16;
      const ph = 38;
      drawGlassPill(w / 2 - pw / 2, centerY - ph / 2, pw, ph, 16, true, false);
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
 * Styled as a cream/white 3D pill with left chevron matching the user PNGs,
 * while keeping btn.text === 'BACK' for E2E/smoke test queries.
 */
export function renderBackButton(
  scene: Phaser.Scene,
  onBack?: () => void
): Phaser.GameObjects.Text {
  const safe = readSafeArea();
  const left = Math.max(20, safe.left + 14);
  const bottom = scene.scale.height - Math.max(18, safe.bottom + 10) - 18;

  const pillBg = scene.add.graphics().setDepth(99);

  const btn = scene.add.text(left, bottom, 'BACK', {
    fontFamily: MENU.font,
    fontSize: '18px',
    fontStyle: '900',
    color: '#123740',
    padding: { x: 28, y: 10 },
  }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).setDepth(100);
  (btn as any).__pillBg = pillBg;

  let isHover = false;
  const drawPill = () => {
    const x = btn.x;
    const y = btn.y - btn.height / 2;
    const w = btn.width + 8;
    const h = btn.height;
    pillBg.clear();
    pillBg.fillStyle(0x051821, 0.35).fillRoundedRect(x, y + 3, w, h, 18);
    pillBg.fillStyle(isHover ? 0xffffff : 0xf7f2e7, 0.98).fillRoundedRect(x, y, w, h, 18);
    pillBg.lineStyle(2, isHover ? 0x38bdf8 : 0xd0c8b8, 1).strokeRoundedRect(x, y, w, h, 18);
    // Draw '<' chevron inside left padding of the pill
    const cx = x + 16;
    const cy = btn.y;
    pillBg.lineStyle(2.5, 0x123740, 1);
    pillBg.beginPath();
    pillBg.moveTo(cx + 4, cy - 5);
    pillBg.lineTo(cx - 2, cy);
    pillBg.lineTo(cx + 4, cy + 5);
    pillBg.strokePath();
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      toTitle(scene);
    }
  };

  btn.on('pointerover', () => { isHover = true; drawPill(); });
  btn.on('pointerout', () => { isHover = false; drawPill(); });
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
    const l = Math.max(20, s.left + 14);
    const b = scene.scale.height - Math.max(18, s.bottom + 10) - 18;
    btn.setPosition(l, b);
    drawPill();
  };

  drawPill();
  scene.scale.on('resize', relayout);
  scene.events.once('shutdown', () => {
    scene.scale.off('resize', relayout);
    pillBg.destroy();
  });

  return btn;
}
