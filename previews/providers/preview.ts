import Phaser from 'phaser';
import { drawProviderPreview, type PreviewProvider } from '../../src/scenes/providerArt';

const providers: { id: PreviewProvider; note: string }[] = [
  { id: 'janeen', note: 'Long chestnut waves · Cream coat, charcoal scrubs and gold accents' },
  { id: 'amanda', note: 'Long blonde hair with darker roots · White coat and muted navy scrubs' },
  { id: 'dharma', note: 'Swept dark hair · Rectangular glasses, warm shirt and tie under a coat' },
  { id: 'dhiwya', note: 'Long dark hair · Teal shown; scrub color will vary by shift' },
  { id: 'lidiya', note: 'Full brown bob · Light glasses, black fleece and blue stethoscope' },
  { id: 'raj', note: 'Short dark hair and stubble · Blue scrubs, grey sleeves, lowered mask' },
];
class Review extends Phaser.Scene {
  create() {
    for (const p of providers) {
      const g = this.add.graphics();
      drawProviderPreview(g, p.id);
      g.generateTexture(`review-${p.id}`, 96, 96);
      g.destroy();
      const texture = this.textures.get(`review-${p.id}`).getSourceImage() as HTMLCanvasElement;
      const image = document.createElement('canvas');
      image.width = 288; image.height = 288;
      const ctx = image.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(texture, 0, 0, 288, 288);
      const url = image.toDataURL();
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `<h2>${p.id.toUpperCase()}</h2><span class="tag">DRAFT 01</span><div class="art"><img class="hero" alt="${p.id} enlarged sprite" src="${url}"></div><div class="strip"><img class="small" alt="${p.id} small sprite" src="${url}"><div class="size">GAME-SCALE CHECK<br>96 × 96 source texture</div></div><p class="notes">${p.note}</p>`;
      document.getElementById('grid')!.append(card);
    }
    document.documentElement.dataset.ready = 'true';
  }
}
new Phaser.Game({ type: Phaser.CANVAS, width: 96, height: 96, transparent: true, audio: { noAudio: true }, scene: Review, banner: false });
