import type Phaser from 'phaser';

/** Approved provider likenesses, shared with the art review page. */
export type PreviewProvider = 'janeen' | 'amanda' | 'dharma' | 'dhiwya' | 'lidiya' | 'raj' | 'jason';
type Graphics = Phaser.GameObjects.Graphics;
const outline = 0x1b2b30;

function ellipse(g: Graphics, color: number, x: number, y: number, w: number, h: number, border = false) {
  g.fillStyle(color).fillEllipse(x, y, w, h);
  if (border) g.lineStyle(2.2, outline).strokeEllipse(x, y, w, h);
}

function body(g: Graphics, skin: number, top: number, shade: number, under: number, sleeves = top) {
  g.lineStyle(2.6, outline).fillStyle(sleeves)
    .fillRoundedRect(44, 18, 22, 13, 6).strokeRoundedRect(44, 18, 22, 13, 6)
    .fillRoundedRect(46, 60, 30, 13, 6).strokeRoundedRect(46, 60, 30, 13, 6);
  ellipse(g, skin, 68, 24, 12, 12, true);
  ellipse(g, skin, 78, 66, 12, 12, true);
  ellipse(g, top, 41, 46, 46, 78, true);
  ellipse(g, shade, 33, 46, 19, 59);
  ellipse(g, under, 53, 46, 29, 36);
  g.lineStyle(1.5, shade).lineBetween(58, 32, 67, 46).lineBetween(58, 60, 67, 46);
}

function head(g: Graphics, skin: number, highlight: number) {
  ellipse(g, skin, 48, 46, 31, 33, true);
  ellipse(g, highlight, 55, 46, 12, 19);
  ellipse(g, skin, 64, 46, 6, 7);
}

function longHair(g: Graphics, color: number, light: number, straight = false) {
  ellipse(g, color, 32, 46, 40, 61, true);
  for (const y of [22, 32, 44, 56, 68]) ellipse(g, color, 21, y, straight ? 11 : 16, 17);
  g.lineStyle(1.5, light);
  for (const offset of [-10, 0, 10]) {
    g.beginPath().moveTo(37, 28 + offset).lineTo(27, 34 + offset)
      .lineTo(24, 43 + offset).lineTo(18, 51 + offset).strokePath();
  }
}

function crown(g: Graphics, color: number, light: number, long = false) {
  ellipse(g, color, 41, 46, 25, 32);
  ellipse(g, color, 47, 33, 22, 10);
  ellipse(g, color, 47, 59, 22, 10);
  if (long) {
    ellipse(g, color, 36, 28, 14, 15);
    ellipse(g, color, 36, 64, 14, 15);
  }
  g.lineStyle(1.5, light).lineBetween(33, 40, 48, 38).lineBetween(33, 51, 48, 54);
}

function glasses(g: Graphics, color: number) {
  g.fillStyle(0xddebf1, 0.6).lineStyle(1.6, color)
    .fillRoundedRect(57, 35, 7, 10, 2).strokeRoundedRect(57, 35, 7, 10, 2)
    .fillRoundedRect(57, 47, 7, 10, 2).strokeRoundedRect(57, 47, 7, 10, 2);
  g.lineBetween(61, 45, 61, 47).lineBetween(57, 38, 45, 32).lineBetween(57, 54, 45, 60);
}

function stethoscope(g: Graphics, color = 0x344556) {
  g.lineStyle(2.5, color).beginPath().arc(49, 46, 20, -1.15, 1.15, false).strokePath();
  ellipse(g, 0xa7bec9, 66, 58, 6, 6);
}

export function drawProviderPreview(g: Graphics, id: PreviewProvider, scrub = 0x138e91): void {
  if (id === 'janeen') {
    body(g, 0xd7a281, 0xf8f1df, 0xd8ccb9, 0x293546);
    longHair(g, 0x49312a, 0x977052);
    head(g, 0xd7a281, 0xe7b79a);
    crown(g, 0x49312a, 0x9a7358, true);
    // A restrained gold trim and earrings distinguish the proposed Goddess palette.
    g.lineStyle(2, 0xe9c469).lineBetween(57, 24, 64, 32).lineBetween(57, 68, 64, 60);
    ellipse(g, 0xe9c469, 50, 29, 4, 5);
    ellipse(g, 0xe9c469, 50, 63, 4, 5);
  } else if (id === 'amanda') {
    body(g, 0xe6b79b, 0xf2f4f4, 0xcdd6da, 0x324760);
    longHair(g, 0xb49361, 0xe7ca8e, true);
    head(g, 0xe6b79b, 0xf2cdb5);
    crown(g, 0x8e704d, 0xe0bd7f, true);
    g.lineStyle(1.5, 0xe5c88f).lineBetween(31, 28, 18, 23).lineBetween(31, 64, 18, 69);
    stethoscope(g, 0x60768a);
  } else if (id === 'dharma') {
    body(g, 0xad7956, 0xf0f1ed, 0xc9d0cd, 0xe9b6aa);
    g.fillStyle(0x51404d).fillTriangle(60, 42, 60, 50, 71, 46);
    head(g, 0xad7956, 0xc79771);
    crown(g, 0x242422, 0x65605a);
    // Swept fringe and the reference's rectangular glasses.
    ellipse(g, 0x242422, 45, 33, 27, 10);
    glasses(g, 0x443e36);
  } else if (id === 'dhiwya') {
    body(g, 0xb77d55, scrub, 0x175b68, 0x173a4a);
    longHair(g, 0x211d1d, 0x53413b, true);
    head(g, 0xb77d55, 0xce946a);
    crown(g, 0x211d1d, 0x53413b, true);
    ellipse(g, 0xd9bf78, 50, 30, 3, 4);
    ellipse(g, 0xd9bf78, 50, 62, 3, 4);
    stethoscope(g);
  } else if (id === 'lidiya') {
    body(g, 0xc68e6b, 0x30353a, 0x1d2429, 0x202e40);
    // Short, full, softly waved brown bob; black clinic fleece.
    ellipse(g, 0x44352e, 35, 46, 35, 50, true);
    for (const y of [27, 36, 56, 65]) ellipse(g, 0x514037, 36, y, 19, 15);
    head(g, 0xc68e6b, 0xdda783);
    crown(g, 0x44352e, 0x80654f, true);
    glasses(g, 0xc1b6a2);
    stethoscope(g, 0x6d86b3);
    g.lineStyle(1.4, 0x76808a).lineBetween(66, 33, 70, 40);
  } else if (id === 'jason') {
    body(g, 0xd5a17b, 0x823346, 0x552337, 0x632b3c);
    head(g, 0xd5a17b, 0xe8b992);
    crown(g, 0x252323, 0x51423d, true);
    stethoscope(g);
  } else {
    body(g, 0xbb825b, 0x78a8cf, 0x4d799f, 0x536475, 0x737b82);
    head(g, 0xbb825b, 0xd49b73);
    g.lineStyle(3.5, 0x3b322b).beginPath().arc(49, 46, 14, -0.9, 0.9, false).strokePath();
    crown(g, 0x242725, 0x5b5a53);
    // Mask lowered below the face, as in Raj's reference; grey undersleeves.
    g.fillStyle(0x9ed6dd).lineStyle(1.4, 0x527f8c)
      .fillRoundedRect(65, 36, 6, 20, 3).strokeRoundedRect(65, 36, 6, 20, 3);
    g.lineStyle(1, 0xe8eff1).lineBetween(65, 36, 53, 31).lineBetween(65, 56, 53, 61);
    g.fillStyle(0xf2efde).fillRoundedRect(51, 71, 9, 12, 1);
    g.lineStyle(1.5, 0xc85262).lineBetween(54, 79, 57, 79);
  }
}
