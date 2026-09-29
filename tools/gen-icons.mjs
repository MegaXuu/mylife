// Génère icon-180/192/512.png « Canopée » : un oiseau de data/oiseaux.js
// perché sur une branche verte, fond crème. Aucun paquet : un petit
// rasteriseur par lignes de balayage (anticrénelage 4×4) + zlib pour le PNG.
// Usage : node gen-icons.mjs <racine du projet> [dossier de sortie]
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import vm from 'node:vm';

const root = process.argv[2], outDir = process.argv[3] || root;
const ctx = {};
vm.createContext(ctx);
vm.runInContext(readFileSync(root + '/data/oiseaux.js', 'utf8') + ';this.OISEAUX = OISEAUX;', ctx);
const BIRD = ctx.OISEAUX.rosalbin;

const BG = '#F3EEE5', PERCH = '#3E6B4F';
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// --- Géométrie : chemins M/L/C/Z absolus → polygones ---
function pathToPolys(d){
  const tok = d.match(/[MLCZ]|-?\d*\.?\d+/g);
  const polys = []; let cur = null, i = 0, x = 0, y = 0, cmd = null;
  const num = () => parseFloat(tok[i++]);
  while(i < tok.length){
    if(/[MLCZ]/.test(tok[i])) cmd = tok[i++];
    if(cmd === 'M'){ x = num(); y = num(); cur = [[x, y]]; polys.push(cur); cmd = 'L'; }
    else if(cmd === 'L'){ x = num(); y = num(); cur.push([x, y]); }
    else if(cmd === 'C'){
      const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x3 = num(), y3 = num();
      for(let k = 1; k <= 24; k++){
        const t = k / 24, u = 1 - t;
        cur.push([u*u*u*x + 3*u*u*t*x1 + 3*u*t*t*x2 + t*t*t*x3, u*u*u*y + 3*u*u*t*y1 + 3*u*t*t*y2 + t*t*t*y3]);
      }
      x = x3; y = y3;
    } else if(cmd === 'Z'){ cmd = null; }
  }
  return polys;
}
const circle = (cx, cy, r) => [Array.from({length: 64}, (_, k) => [cx + r*Math.cos(k*Math.PI/32), cy + r*Math.sin(k*Math.PI/32)])];
function capsule(x1, y1, x2, y2, r){
  // demi-cercle autour de (x2,y2) puis autour de (x1,y1) : un trait à bouts ronds
  const a = Math.atan2(y2 - y1, x2 - x1), p = [];
  for(let k = 0; k <= 16; k++){ const t = a - Math.PI/2 + k*Math.PI/16; p.push([x2 + r*Math.cos(t), y2 + r*Math.sin(t)]); }
  for(let k = 0; k <= 16; k++){ const t = a + Math.PI/2 + k*Math.PI/16; p.push([x1 + r*Math.cos(t), y1 + r*Math.sin(t)]); }
  return [p];
}
function strokeToPolys(d, w){
  const tok = d.match(/[ML]|-?\d*\.?\d+/g); const out = []; let i = 0, px = null, py = null, cmd;
  while(i < tok.length){
    if(/[ML]/.test(tok[i])) cmd = tok[i++];
    const x = parseFloat(tok[i++]), y = parseFloat(tok[i++]);
    if(cmd === 'L' && px !== null) out.push(...capsule(px, py, x, y, w/2));
    px = x; py = y;
  }
  return out;
}

// --- Rasterisation : couverture par lignes de balayage, 4×4 sous-échantillons ---
const SS = 4;
function coverage(polys, W, H, tf){
  const cov = new Float32Array(W * H);
  const edges = [];
  polys.forEach(poly => {
    const pts = poly.map(tf);
    for(let k = 0; k < pts.length; k++){
      const [x1, y1] = pts[k], [x2, y2] = pts[(k + 1) % pts.length];
      if(y1 !== y2) edges.push([x1, y1, x2, y2]);
    }
  });
  for(let sy = 0; sy < H * SS; sy++){
    const yy = (sy + 0.5) / SS, xs = [];
    edges.forEach(([x1, y1, x2, y2]) => {
      if((yy >= y1 && yy < y2) || (yy >= y2 && yy < y1)) xs.push({x: x1 + (yy - y1) * (x2 - x1) / (y2 - y1), dir: y2 > y1 ? 1 : -1});
    });
    xs.sort((a, b) => a.x - b.x);
    let wind = 0;
    for(let k = 0; k < xs.length - 1; k++){
      wind += xs[k].dir;
      if(wind === 0) continue; // règle non nulle
      const a = Math.max(0, xs[k].x * SS), b = Math.min(W * SS, xs[k + 1].x * SS);
      for(let sx = Math.ceil(a - 0.5); sx < b - 0.5; sx++){
        if(sx < 0 || sx >= W * SS) continue;
        cov[Math.floor(sy / SS) * W + Math.floor(sx / SS)] += 1 / (SS * SS);
      }
    }
  }
  return cov;
}

function render(W){
  const img = new Float32Array(W * W * 3);
  const bg = hex(BG);
  for(let p = 0; p < W * W; p++){ img[p*3] = bg[0]; img[p*3+1] = bg[1]; img[p*3+2] = bg[2]; }
  const paint = (cov, col, op) => {
    const c = hex(col);
    for(let p = 0; p < W * W; p++){
      const a = Math.min(1, cov[p]) * (op == null ? 1 : op);
      if(!a) continue;
      img[p*3] += (c[0] - img[p*3]) * a; img[p*3+1] += (c[1] - img[p*3+1]) * a; img[p*3+2] += (c[2] - img[p*3+2]) * a;
    }
  };
  // Mise en page dans un repère 512 : pattes (y = 130 du dessin) sur la branche.
  const k = W / 512, s = 2.6, perchY = 404, cxBird = 57;
  const ox = 256 - cxBird * s, oy = perchY - 130 * s;
  const tf = ([x, y]) => [(ox + x * s) * k, (oy + y * s) * k];
  const id = ([x, y]) => [x * k, y * k];
  // La branche : un trait vert arrondi, le perchoir des cartes de l'app.
  paint(coverage(capsule(104, perchY + 7, 408, perchY + 7, 9), W, W, id), PERCH);
  BIRD.forEach(f => {
    let polys;
    if(f.d != null && f.s) polys = strokeToPolys(f.d, f.w);
    else if(f.d != null) polys = pathToPolys(f.d);
    else polys = circle(f.cx, f.cy, f.r);
    paint(coverage(polys, W, W, tf), f.s || f.f, f.o);
  });
  return img;
}

// --- PNG (RGB 8 bits, sans filtre) ---
const CRC = new Int32Array(256).map((_, n) => { let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = buf => { let c = -1; for(const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(W, img){
  const raw = Buffer.alloc(W * (W * 3 + 1));
  for(let y = 0; y < W; y++){
    raw[y * (W * 3 + 1)] = 0;
    for(let x = 0; x < W * 3; x++) raw[y * (W * 3 + 1) + 1 + x] = Math.max(0, Math.min(255, Math.round(img[y * W * 3 + x])));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(W, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, {level: 9})), chunk('IEND', Buffer.alloc(0))]);
}

[180, 192, 512].forEach(W => {
  writeFileSync(`${outDir}/icon-${W}.png`, png(W, render(W)));
  console.log('icon-' + W + '.png');
});
