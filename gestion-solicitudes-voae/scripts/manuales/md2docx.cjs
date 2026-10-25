// Convierte un manual en Markdown a Word (.docx) con portada, índice, tablas, notas e imágenes.
// Uso: node scripts/manuales/md2docx.cjs <manual.md> <salida.docx> "<Título>" "<Subtítulo>" [versión] [fecha]
// Requiere: npm i -D docx
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ImageRun,
  ShadingType, AlignmentType, LevelFormat, BorderStyle, TableOfContents, PageBreak, Footer,
  PageNumber, Header,
} = require('docx');

const [, , mdPath, outPath, titulo, subtitulo, version = '1.0', fecha = '14 de octubre de 2026'] = process.argv;
const path = require('path');
const md = fs.readFileSync(mdPath, 'utf8').replace(/\r/g, '');
const baseDir = path.dirname(path.resolve(mdPath));

// Tamaño de una imagen PNG o JPG (sin librerías)
function tamanoImagen(buf) {
  if (buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), tipo: 'png' };
  let i = 2;
  while (i < buf.length) {
    const marca = buf.readUInt16BE(i); const largo = buf.readUInt16BE(i + 2);
    if (marca >= 0xffc0 && marca <= 0xffc3) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5), tipo: 'jpg' };
    i += 2 + largo;
  }
  return { w: 1200, h: 800, tipo: 'jpg' };
}
const AZUL = '12397A', MENTA = '2FBF8F', GRIS = '52606D';
const ANCHO = 12240 - 2 * 1200; // Carta, márgenes de 1200 DXA

// ---------- texto en línea: **negrita**, *cursiva*, `código` ----------
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const t = m[0];
    if (t.startsWith('**')) out.push(...runs(t.slice(2, -2), { ...base, bold: true }));
    else if (t.startsWith('`')) out.push(new TextRun({ text: t.slice(1, -1), font: 'Consolas', size: 18, color: '9A3412', ...base }));
    else out.push(new TextRun({ text: t.slice(1, -1), italics: true, ...base }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out;
}
const limpiar = (s) => s.replace(/\\\|/g, '|');

// ---------- tablas ----------
function tabla(lineas) {
  const filas = lineas.filter((l, i) => i !== 1).map((l) =>
    limpiar(l.trim().replace(/^\||\|$/g, '').replace(/\\\|/g, '\u0000')).split('|').map((c) => c.replace(/\u0000/g, '|').trim()));
  const n = filas[0].length;
  // anchos proporcionales al largo del texto (con mínimo)
  const largo = Array(n).fill(0);
  const token = Array(n).fill(0);
  filas.forEach((f) => f.forEach((c, i) => {
    largo[i] = Math.max(largo[i], Math.min(c.length, 60));
    const t = Math.max(...c.replace(/[`*]/g, '').split(/\s+/).map((w) => w.length));
    token[i] = Math.max(token[i], Math.min(t, 40));
  }));
  for (let i = 0; i < n; i++) largo[i] = Math.max(largo[i], token[i] * 1.3);
  const total = largo.reduce((a, b) => a + Math.max(b, 8), 0);
  let anchos = largo.map((l) => Math.floor((Math.max(l, 8) / total) * ANCHO));
  anchos[n - 1] += ANCHO - anchos.reduce((a, b) => a + b, 0);
  const borde = { style: BorderStyle.SINGLE, size: 4, color: 'D9E2EC' };
  return new Table({
    width: { size: ANCHO, type: WidthType.DXA },
    columnWidths: anchos,
    rows: filas.map((f, ri) => new TableRow({
      tableHeader: ri === 0,
      cantSplit: true,
      children: f.map((c, ci) => new TableCell({
        width: { size: anchos[ci], type: WidthType.DXA },
        shading: ri === 0 ? { type: ShadingType.CLEAR, color: 'auto', fill: AZUL }
                          : ri % 2 === 0 ? { type: ShadingType.CLEAR, color: 'auto', fill: 'F5F7FA' } : undefined,
        borders: { top: borde, bottom: borde, left: borde, right: borde },
        margins: { top: 60, bottom: 60, left: 90, right: 90 },
        children: [new Paragraph({ spacing: { after: 0 },
          children: runs(c, ri === 0 ? { bold: true, color: 'FFFFFF', size: 18 } : { size: 18 }) })],
      })),
    })),
  });
}

// ---------- recorrido del Markdown ----------
const hijos = [];
const L = md.split('\n');
for (let i = 0; i < L.length; i++) {
  const l = L[i];
  if (!l.trim()) continue;
  if (l.startsWith('```')) {                       // bloque de código
    const cod = [];
    for (i++; i < L.length && !L[i].startsWith('```'); i++) cod.push(L[i]);
    cod.forEach((c, k) => hijos.push(new Paragraph({
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F5F7FA' },
      border: { left: { style: BorderStyle.SINGLE, size: 18, color: MENTA, space: 6 } },
      spacing: { before: k === 0 ? 80 : 0, after: k === cod.length - 1 ? 160 : 0, line: 240 },
      children: [new TextRun({ text: c || ' ', font: 'Consolas', size: 16 })],
    })));
    continue;
  }
  if (l.startsWith('|')) {                         // tabla
    const t = [];
    for (; i < L.length && L[i].startsWith('|'); i++) t.push(L[i]);
    i--;
    hijos.push(tabla(t));
    hijos.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
    continue;
  }
  let m;
  if ((m = l.match(/^!\[(.*?)\]\((.*?)\)/))) {        // imagen: ![pie](ruta)
    const ruta = path.resolve(baseDir, m[2]);
    if (fs.existsSync(ruta)) {
      const buf = fs.readFileSync(ruta); const t = tamanoImagen(buf);
      const anchoPx = Math.min(620, t.w); const altoPx = Math.round((t.h / t.w) * anchoPx);
      hijos.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 40 },
        children: [new ImageRun({ type: t.tipo, data: buf, transformation: { width: anchoPx, height: Math.min(altoPx, 820) },
          altText: { title: m[1], description: m[1], name: path.basename(ruta) } })] }));
    } else {
      hijos.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `[Falta la imagen: ${m[2]}]`, color: 'C00000', italics: true })] }));
    }
    if (m[1]) hijos.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: m[1], italics: true, size: 18, color: GRIS })] }));
    continue;
  }
  if ((m = l.match(/^> (.*)/))) {                   // nota destacada
    hijos.push(new Paragraph({ spacing: { before: 80, after: 160 },
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'EAF7F2' },
      border: { left: { style: BorderStyle.SINGLE, size: 18, color: MENTA, space: 6 } },
      children: runs(m[1]) }));
    continue;
  }
  if ((m = l.match(/^(#{1,3}) (.*)/))) {
    const nivel = m[1].length;
    hijos.push(new Paragraph({
      heading: [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][nivel - 1],
      pageBreakBefore: nivel === 1 && hijos.length > 0 && false,
      children: runs(m[2]),
    }));
    continue;
  }
  if ((m = l.match(/^(\s*)- (.*)/))) {
    hijos.push(new Paragraph({ numbering: { reference: 'vinetas', level: Math.min(Math.floor(m[1].length / 2), 2) },
      spacing: { after: 40 }, children: runs(m[2]) }));
    continue;
  }
  if ((m = l.match(/^(\s*)\d+\. (.*)/))) {
    hijos.push(new Paragraph({ numbering: { reference: 'numeros', level: Math.min(Math.floor(m[1].length / 3), 1) },
      spacing: { after: 40 }, children: runs(m[2]) }));
    continue;
  }
  hijos.push(new Paragraph({ spacing: { after: 120 }, children: runs(l) }));
}

// ---------- portada ----------
const portada = [
  new Paragraph({ spacing: { before: 1800 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'SOLICITUDES DE DISEÑO Y COMUNICACIÓN', color: GRIS, size: 20, characterSpacing: 60 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 },
    children: [new TextRun({ text: 'i', bold: true, size: 96, color: MENTA }), new TextRun({ text: 'Tickets', bold: true, size: 96, color: AZUL })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: titulo, bold: true, size: 56, color: AZUL })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 800 },
    children: [new TextRun({ text: subtitulo, size: 26, color: GRIS })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Vicerrectoría de Orientación y Asuntos Estudiantiles (VOAE)', size: 22 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1200 }, children: [new TextRun({ text: 'Universidad Nacional Autónoma de Honduras (UNAH)', size: 22 })] }),
  ...[['Versión', version], ['Fecha', fecha], ['Elaborado por', 'Jade Miralda y Angie Enamorado']]
    .map(([a, b]) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [new TextRun({ text: a + ': ', bold: true, size: 22, color: AZUL }), new TextRun({ text: b, size: 22 })] })),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Contenido', bold: true, size: 32, color: AZUL })] }),
  ...md.split('\n').filter((l) => /^#{1,2} /.test(l)).map((l) => new Paragraph({
    spacing: { after: l.startsWith('# ') ? 40 : 0, before: l.startsWith('# ') ? 80 : 0 },
    indent: { left: l.startsWith('## ') ? 400 : 0 },
    children: [new TextRun({ text: l.replace(/^#+ /, '').replace(/`/g, ''), bold: l.startsWith('# '), size: l.startsWith('# ') ? 21 : 19, color: l.startsWith('# ') ? AZUL : '334E68' })],
  })),
  new Paragraph({ children: [new PageBreak()] }),
];

const doc = new Document({
  features: { updateFields: true },
  creator: 'VOAE – UNAH',
  title: `iTickets – ${titulo}`,
  styles: {
    default: { document: { run: { font: 'Calibri', size: 21 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, color: 'FFFFFF' },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0,
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: AZUL }, indent: { left: 0 } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, color: AZUL },
        paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C9DAF5', space: 2 } } } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, color: AZUL }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ],
  },
  numbering: { config: [
    { reference: 'vinetas', levels: [0, 1, 2].map((lv) => ({ level: lv, format: LevelFormat.BULLET,
      text: ['•', '◦', '▪'][lv], alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 360 * (lv + 1), hanging: 260 } } } })) },
    { reference: 'numeros', levels: [0, 1].map((lv) => ({ level: lv, format: LevelFormat.DECIMAL,
      text: `%${lv + 1}.`, alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 360 * (lv + 1), hanging: 300 } } } })) },
  ] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: `iTickets · ${titulo}`, size: 16, color: GRIS })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: ['Página ', PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES], size: 16, color: GRIS })] })] }) },
    children: [...portada, ...hijos],
  }],
});

Packer.toBuffer(doc).then((b) => { fs.writeFileSync(outPath, b); console.log('ok', outPath); });
