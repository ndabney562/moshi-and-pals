import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { sfx } from '../core/sfx';
import { runRng } from '../core/rng';
import { RECORDS_ROOM } from '../data/clinic';
import { FISH, KEY, MAGAZINE_AD, MAGAZINE_HEADLINES, PHONE, RECORDS, STALL, XRAY_FILM } from '../data/miracleCure';
import type { Obstacle } from '../data/rooms';
import type { Player } from '../entities/Player';

/** What the quest needs from the game scene. */
export interface CureHost {
  readonly scene: Phaser.Scene;
  readonly player: Player;
  readonly obstacles: Obstacle[];
  /** Floating text (Fx.number). */
  say(x: number, y: number, text: string, color?: string, size?: number): void;
  /** A HUD banner (GameEvents.SecretFound). */
  banner(title: string, line: string): void;
  /** Pays `cost` Copays, or buzzes and returns false. */
  pay(cost: number): boolean;
  roundActive(): boolean;
  bossRound(): boolean;
  /** Puts the doctor at (x, y), camera and all. */
  teleport(x: number, y: number): void;
  /** Brings in the Last Fax Machine, and clears up what it left behind. */
  spawnFax(): void;
  clearRecords(): void;
  giveIonizer(): void;
  clockOut(): void;
  achieve(id: string): void;
}

/** Something the doctor can USE (the same shape as GameScene's stations). */
export interface CureStation {
  o: Obstacle;
  info(): { verb: string; cost: number; note?: string; hold?: boolean; blocked?: boolean };
  use(time: number): void;
  gone?(): boolean;
}

/** The front of the 1-800 number on the ad: I-O-N on a phone keypad. */
const AD_NUMBER = '466';

/**
 * THE MIRACLE CURE: the secret quest (words in data/miracleCure.ts, numbers in BALANCE.miracleCure).
 * Each step only shows up once the one before it is done, so a normal shift never trips over it:
 * magazine → phone (code half A) → fish + fridge (half B) → X-ray (key seen) → vending B4 (key)
 * → Stall 3, three flushes in a boss round (panel) → Records Room between rounds (the Last Fax Machine)
 * → the Ionizer 9000 → clear one more boss round → CLOCK OUT at the front door: the alternate ending.
 */
export class MiracleCure {
  private readonly cfg = BALANCE.miracleCure;
  /** This shift's code, two halves (seeded, so Today's Shift has the same one for everyone). */
  readonly code: [string, string];
  magazineRead = false;
  codeA = false;
  codeB = false;
  keySeen = false;
  hasKey = false;
  panelOpen = false;
  inRecords = false;
  faxSpawned = false;
  faxDefeated = false;
  ionizer = false;
  canClockOut = false;
  private flushes = 0;
  /** On hold at the front desk: since when (game time), and the next note of hold music. */
  private holdSince?: number;
  private nextNoteAt = 0;
  private note = 0;
  private stenchUntil = 0;
  private readonly fumes: Phaser.GameObjects.Graphics;
  private readonly desk?: Obstacle;
  private readonly microwave?: Obstacle;

  constructor(private readonly host: CureHost, debugStep?: string) {
    const two = () => String(runRng.secret.int(10, 99));
    this.code = [two(), two()];
    this.desk = host.obstacles.find((o) => o.kind === 'desk' && o.label === 'RECEPTION');
    this.microwave = host.obstacles.find((o) => o.kind === 'microwave');
    this.fumes = host.scene.add.graphics().setDepth(12);
    // ?secret=records: everything found and the panel open; ?secret=clockout: ready to clock out
    if (debugStep === 'records' || debugStep === 'clockout') {
      this.magazineRead = this.codeA = this.codeB = this.keySeen = this.hasKey = this.panelOpen = true;
    }
    if (debugStep === 'clockout') {
      this.faxSpawned = this.faxDefeated = this.ionizer = this.canClockOut = true;
    }
  }

  /** Has the key and both halves of the code. */
  get ready(): boolean {
    return this.hasKey && this.codeA && this.codeB;
  }

  get onHold(): boolean {
    return this.holdSince !== undefined;
  }

  get stench(): boolean {
    return this.host.scene.time.now < this.stenchUntil;
  }

  /** The vending machine offers the key in B4 once the X-ray has shown it. */
  get keyForSale(): boolean {
    return this.keySeen && !this.hasKey;
  }

  private sayAtPlayer(text: string, color = '#e8fff9', size = 20): void {
    this.host.say(this.host.player.x, this.host.player.y - 70, text, color, size);
  }

  stations(): CureStation[] {
    const list: CureStation[] = [];
    const h = this.host;
    const free = (verb: string, note: string) => ({ verb, cost: 0, note });
    for (const o of h.obstacles.filter((ob) => ob.kind === 'magTable')) {
      list.push({ o, info: () => free('READ', 'Very old magazines'), use: () => this.readMagazine() });
    }
    if (this.desk) {
      list.push({
        o: this.desk,
        gone: () => !this.magazineRead || this.codeA,
        info: () => {
          if (this.onHold) {
            const left = Math.ceil((this.cfg.holdMs - (h.scene.time.now - (this.holdSince ?? 0))) / 1000);
            return { verb: 'ON HOLD', cost: 0, note: `Stay by the desk. ${left} s`, blocked: true };
          }
          return h.roundActive() ? free('CALL', `Dial 1-800-${AD_NUMBER}-....`) : { verb: 'CALL', cost: 0, note: PHONE.notNow, blocked: true };
        },
        use: (t) => this.call(t),
      });
    }
    if (this.microwave) {
      const o = this.microwave;
      list.push({ o, info: () => ({ verb: 'FISH', cost: this.cfg.fishCost, note: 'Reheat a fish. In the office microwave.' }), use: (t) => this.microwaveFish(t) });
    }
    for (const o of h.obstacles.filter((ob) => ob.kind === 'fridge')) {
      list.push({
        o, gone: () => !this.codeA || this.codeB,
        info: () => (this.stench ? free('READ', 'A sticky note, behind the fridge') : { verb: 'FRIDGE', cost: 0, note: FISH.fridgeHint, blocked: true }),
        use: () => this.readNote(),
      });
    }
    for (const o of h.obstacles.filter((ob) => ob.kind === 'stall')) {
      const three = o.label === 'STALL 3';
      list.push({
        o,
        info: () => {
          if (!three || !this.panelOpen || this.faxDefeated) return free('FLUSH', o.label ?? '');
          return h.roundActive() ? { verb: 'RECORDS', cost: 0, note: STALL.betweenRounds, blocked: true } : free('RECORDS', 'Key + code. Go in?');
        },
        use: (t) => (three && this.panelOpen && !this.faxDefeated ? this.enterRecords() : this.flush(three, t)),
      });
    }
    for (const o of h.obstacles.filter((ob) => ob.kind === 'recordsDoor')) {
      list.push({
        o, gone: () => !this.inRecords,
        info: () => (this.faxDefeated ? free('LEAVE', RECORDS.leave) : { verb: 'LOCKED', cost: 0, note: RECORDS.locked, blocked: true }),
        use: () => this.leaveRecords(),
      });
    }
    for (const o of h.obstacles.filter((ob) => ob.kind === 'door' && ob.label?.startsWith('EXIT'))) {
      list.push({ o, gone: () => !this.canClockOut, info: () => free('CLOCK OUT', 'End your shift. For real.'), use: () => h.clockOut() });
    }
    return list;
  }

  /** 1. THE MAGAZINE: between rounds, the ad on the back page. During a round there's no time to read. */
  private readMagazine(): void {
    sfx.refill();
    if (this.host.roundActive()) {
      this.sayAtPlayer(Phaser.Utils.Array.GetRandom(MAGAZINE_HEADLINES), '#e8fff9', 16);
      return;
    }
    this.magazineRead = true;
    this.host.banner(MAGAZINE_AD.title, MAGAZINE_AD.line(AD_NUMBER));
  }

  /** 2. THE PHONE: call during a round and stay at the desk through the hold music. */
  private call(time: number): void {
    if (this.onHold || !this.host.roundActive()) return;
    this.holdSince = time;
    this.nextNoteAt = time;
    this.sayAtPlayer(PHONE.dial);
  }

  private updateHold(time: number): void {
    if (this.holdSince === undefined || !this.desk) return;
    const p = this.host.player;
    const d = this.desk;
    const away = Math.hypot(Math.max(d.x - p.x, 0, p.x - (d.x + d.w)), Math.max(d.y - p.y, 0, p.y - (d.y + d.h)));
    if (p.dead || away > this.cfg.phoneRange) {
      this.holdSince = undefined;
      sfx.denied();
      this.sayAtPlayer(PHONE.dropped, '#ffb3b3', 18);
      return;
    }
    if (!this.host.roundActive()) {
      this.holdSince = undefined;
      this.sayAtPlayer(PHONE.roundOver, '#ffb3b3', 18);
      return;
    }
    if (time >= this.nextNoteAt) {
      sfx.holdNote(this.note);
      if (this.note % 4 === 0) this.host.say(d.x + d.w / 2, d.y - 20, PHONE.hold[(this.note / 4) % PHONE.hold.length], '#b39ddb', 16);
      this.note++;
      this.nextNoteAt = time + 650;
    }
    if (time - this.holdSince >= this.cfg.holdMs) {
      this.holdSince = undefined;
      this.codeA = true;
      sfx.spotless();
      this.host.banner('CUSTOMER CARE', PHONE.operator(this.code[0]));
    }
  }

  /** 3. THE FISH: pay, ding, and the stench. Behind the fridge a sticky note shows through the steam. */
  private microwaveFish(time: number): void {
    if (!this.host.pay(this.cfg.fishCost)) return;
    this.stenchUntil = time + this.cfg.stenchMs;
    sfx.ding();
    this.host.scene.cameras.main.shake(160, 0.004);
    this.sayAtPlayer(FISH.stench, '#c5e1a5', 30);
    this.host.say(this.host.player.x, this.host.player.y - 40, FISH.zap, '#e8fff9', 16);
  }

  private readNote(): void {
    if (!this.stench || this.codeB) return;
    this.codeB = true;
    sfx.spotless();
    this.host.banner('STICKY NOTE', FISH.fridgeNote(this.code[1]));
  }

  /** 4. THE X-RAY (GameScene calls this on every pulse): the film catches the key in the snack machine. */
  onXray(): void {
    if (!this.codeB || this.keySeen) return;
    this.keySeen = true;
    this.host.scene.time.delayedCall(900, () => this.host.banner(XRAY_FILM.title, XRAY_FILM.line));
  }

  /** The vending machine's extra row while the key is for sale. */
  keyOption(): { id: string; name: string; blurb: string; color: number } {
    return { id: KEY.id, name: `${KEY.name}  $${this.cfg.keyPrice}`, blurb: KEY.blurb, color: 0xffd166 };
  }

  /** Buys the key from B4. Returns false if the doctor can't pay. */
  buyKey(): boolean {
    if (!this.keyForSale || !this.host.pay(this.cfg.keyPrice)) return false;
    this.hasKey = true;
    sfx.cash();
    this.sayAtPlayer(KEY.got, '#ffd166', 24);
    return true;
  }

  /** 5. STALL 3: three flushes in one boss round, with key and code, open the panel. Any other flush is just a flush. */
  private flush(three: boolean, _time: number): void {
    sfx.flush();
    const h = this.host;
    if (three && this.ready && !this.panelOpen) {
      if (h.bossRound() && h.roundActive()) {
        this.flushes++;
        this.sayAtPlayer(STALL.click(this.flushes), '#ffd166', 22);
        if (this.flushes >= this.cfg.flushes) {
          this.panelOpen = true;
          h.scene.cameras.main.shake(260, 0.008);
          h.banner(STALL.open.title, STALL.open.line);
        }
        return;
      }
      this.sayAtPlayer('*click*... nothing. It only works when it is really busy.', '#e8fff9', 18);
      return;
    }
    this.sayAtPlayer(Phaser.Utils.Array.GetRandom(STALL.flush));
  }

  /** 6. THE RECORDS ROOM: in between rounds (the break waits while you're in there). */
  private enterRecords(): void {
    if (this.host.roundActive() || this.inRecords) return;
    this.inRecords = true;
    this.host.teleport(RECORDS_ROOM.arrive.x, RECORDS_ROOM.arrive.y);
    this.host.banner(RECORDS.enter.title, RECORDS.enter.line);
    if (!this.faxSpawned) {
      this.faxSpawned = true;
      this.host.scene.time.delayedCall(1200, () => this.host.spawnFax());
    }
  }

  private leaveRecords(): void {
    if (!this.inRecords || !this.faxDefeated) return;
    this.inRecords = false;
    this.host.clearRecords();
    this.host.teleport(RECORDS_ROOM.back.x, RECORDS_ROOM.back.y);
  }

  /** The Last Fax Machine is down: the Ionizer 9000 is in the doctor's hands. */
  onFaxDefeated(): void {
    this.faxDefeated = true;
    this.ionizer = true;
    this.host.giveIonizer();
    this.host.achieve('miracleCure');
    this.host.scene.time.delayedCall(2300, () => this.host.banner(RECORDS.ionizer.title, RECORDS.ionizer.line));
  }

  onRoundStarted(): void {
    this.flushes = 0;
  }

  /** A boss round cleared with the Ionizer in hand: the front door lets you clock out. */
  onRoundCompleted(wasBoss: boolean): void {
    if (!this.ionizer || !wasBoss || this.canClockOut || this.inRecords) return;
    this.canClockOut = true;
    this.host.banner(RECORDS.clockOutReady.title, RECORDS.clockOutReady.line);
  }

  update(time: number): void {
    this.updateHold(time);
    this.fumes.clear();
    const m = this.microwave;
    if (m && this.stench) {
      // Green fumes rolling off the microwave
      const k = (this.stenchUntil - time) / this.cfg.stenchMs;
      for (let i = 0; i < 6; i++) {
        const a = time / 700 + i;
        this.fumes.fillStyle(0x9ccc65, 0.12 + 0.12 * k)
          .fillCircle(m.x + m.w / 2 + Math.cos(a) * (30 + i * 12), m.y + m.h + 40 + Math.sin(a * 1.3) * (20 + i * 8), 26 + i * 4);
      }
    }
  }

  destroy(): void {
    this.fumes.destroy();
  }
}
