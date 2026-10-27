import Phaser from 'phaser';
import { CHARACTERS } from '../data/characters';
import { buySecond, doctorUnlocked, hireDoctor, progress, secondUnlocked } from '../core/progress';
import { settings, saveSettings } from '../core/settings';
import { toTitle } from '../core/native';

const font = 'system-ui, sans-serif';
/** One readable provider card at a time, independent of roster length and shared with iOS. */
export class ProvidersScene extends Phaser.Scene {
  private index = 0;
  private confirming = '';
  private content?: Phaser.GameObjects.Container;
  constructor() { super('Providers'); }
  create(): void {
    this.index = Math.max(0,CHARACTERS.findIndex(c=>c.id === settings.character));
    this.confirming=''; this.draw();
    this.scale.on('resize',this.draw,this);
    this.events.once('shutdown',()=>this.scale.off('resize',this.draw,this));
    this.input.keyboard?.on('keydown-ESC',()=>toTitle(this));
    this.input.keyboard?.on('keydown-RIGHT',()=>this.next(1));
    this.input.keyboard?.on('keydown-LEFT',()=>this.next(-1));
  }
  next(direction: number): void { this.index=(this.index+direction+CHARACTERS.length)%CHARACTERS.length; this.confirming=''; this.draw(); }
  select(): void {
    const c=CHARACTERS[this.index];
    if (!doctorUnlocked(c.id)) {
      if (this.confirming !== `hire:${c.id}`) { this.confirming=`hire:${c.id}`; this.draw(); return; }
      if (!hireDoctor(c.id)) return;
    }
    settings.character=c.id; saveSettings(); this.confirming=''; this.draw();
  }
  unlockSecond(): void {
    const c=CHARACTERS[this.index];
    if (!c.second || secondUnlocked(c.id) || !doctorUnlocked(c.id)) return;
    if (this.confirming !== `second:${c.id}`) { this.confirming=`second:${c.id}`; this.draw(); return; }
    buySecond(c.id); this.confirming=''; this.draw();
  }
  private draw(): void {
    this.content?.destroy(true);
    const {width:w,height:h}=this.scale;
    const c=CHARACTERS[this.index];
    const items: Phaser.GameObjects.GameObject[]=[];
    const text=(x:number,y:number,label:string,size=24,color='#e8fff9')=>{
      const t=this.add.text(x,y,label,{fontFamily:font,fontSize:`${size}px`,fontStyle:'bold',color,align:'center',wordWrap:{width:w*.48}}).setOrigin(.5); items.push(t); return t;
    };
    const button=(x:number,y:number,label:string,action:()=>void)=>text(x,y,label,21).setPadding(18,12).setBackgroundColor('#315d64').setInteractive({useHandCursor:true}).on('pointerup',action);
    items.push(this.add.rectangle(0,0,w,h,0x102a31).setOrigin(0));
    text(w/2,42,`PROVIDERS · ${progress().nps.toLocaleString()} NPS`,30,'#ffe66d');
    text(w/2,80,`${this.index+1} / ${CHARACTERS.length} · ${settings.character === c.id ? 'ON SHIFT' : doctorUnlocked(c.id) ? 'AVAILABLE' : 'LOCKED'}`,17);
    items.push(this.add.image(w*.26,h*.44,`${c.id}-held`).setAngle(-90).setScale(Math.min(2.3,h/240)));
    text(w*.7,h*.27,c.name.toUpperCase(),31,'#ffe66d');
    text(w*.7,h*.4,c.blurb,19);
    text(w*.7,h*.54,`Helper output ×${c.helperDamage}\n${c.second ? `SECOND: ${c.second.name}` : 'SECOND: coming in the existing-provider update'}`,17);
    button(w*.25,h-160,'◀ PREV',()=>this.next(-1));
    button(w*.75,h-160,'NEXT ▶',()=>this.next(1));
    const hire=doctorUnlocked(c.id) ? 'SELECT FOR SHIFT' : `${this.confirming === `hire:${c.id}` ? 'CONFIRM HIRE' : 'HIRE'} · ${c.price} NPS`;
    button(w*.3,h-96,hire,()=>this.select()).setAlpha(doctorUnlocked(c.id)||progress().nps>=c.price?1:.5);
    if(c.second) button(w*.72,h-96,secondUnlocked(c.id)?'SECOND UNLOCKED':`${this.confirming === `second:${c.id}`?'CONFIRM':'UNLOCK SECOND'} · ${c.second.price} NPS`,()=>this.unlockSecond()).setAlpha(doctorUnlocked(c.id)&&progress().nps>=c.second.price||secondUnlocked(c.id)?1:.5);
    button(w/2,h-34,'BACK',()=>toTitle(this));
    this.content=this.add.container(0,0,items);
  }
}
