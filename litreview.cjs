'use strict';
const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
    VerticalAlign, PageNumber, LevelFormat, Header, Footer, PageBreak, ImageRun
} = require('docx');
const fs = require('fs');

// ── Constants ─────────────────────────────────────────────────────────────────
const BLACK = '000000';
const WHITE = 'FFFFFF';
const DGRAY = '222222';
const MGRAY = '555555';
const LGRAY = 'F4F4F4';
const BORDER = 'CCCCCC';
const CW = 9026; // content width in DXA (A4, 1-inch margins each side)

// ── Border helpers ────────────────────────────────────────────────────────────
const bdrLine = (c = BORDER) => ({ style: BorderStyle.SINGLE, size: 4, color: c });
const bdrNone = () => ({ style: BorderStyle.NONE, size: 0, color: WHITE });
const allBdr = (c = BORDER) => ({ top: bdrLine(c), bottom: bdrLine(c), left: bdrLine(c), right: bdrLine(c) });
const noBdr = () => ({ top: bdrNone(), bottom: bdrNone(), left: bdrNone(), right: bdrNone() });

// ── Font helpers ──────────────────────────────────────────────────────────────
const run = (text, o = {}) => new TextRun({ text, font: 'Times New Roman', size: 24, color: DGRAY, ...o });
const runB = (text, o = {}) => run(text, { bold: true, ...o });
const runI = (text, o = {}) => run(text, { italics: true, ...o });

// ── Paragraph helpers ─────────────────────────────────────────────────────────
function sp(n = 1) {
    const arr = [];
    for (let i = 0; i < n; i++)
        arr.push(new Paragraph({ children: [run('')], spacing: { before: 0, after: 80 } }));
    return arr;
}

function h1(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 480, after: 200 },
        children: [new TextRun({ text, font: 'Times New Roman', size: 36, bold: true, color: BLACK })]
    });
}

function h2(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 320, after: 160 },
        children: [new TextRun({ text, font: 'Times New Roman', size: 30, bold: true, color: BLACK })]
    });
}

function h3(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text, font: 'Times New Roman', size: 26, bold: true, color: BLACK })]
    });
}

function h4(text) {
    return new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text, font: 'Times New Roman', size: 24, bold: true, underline: {}, color: BLACK })]
    });
}

function body(text, opts = {}) {
    return new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 0, after: 160, line: 360 },
        indent: { firstLine: 720 },
        children: [run(text, opts)]
    });
}

function bodyNI(text, opts = {}) {
    return new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 0, after: 160, line: 360 },
        children: [run(text, opts)]
    });
}

function bodyB(text) {
    return body(text, { bold: true });
}

function bullet(text, level = 0) {
    return new Paragraph({
        numbering: { reference: 'bullets', level },
        spacing: { before: 40, after: 80, line: 320 },
        children: [run(text)]
    });
}

function centered(children, spacing = { before: 80, after: 80 }) {
    return new Paragraph({ alignment: AlignmentType.CENTER, spacing, children });
}

function figCaption(text) {
    return new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 200 },
        children: [runI(text, { size: 20, color: MGRAY })]
    });
}

function tocEntry(label, dots, page) {
    return new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [
            run(label),
            run(' ' + dots + ' '),
            run(page, { color: MGRAY })
        ]
    });
}

function tocEntryBold(label, dots, page) {
    return new Paragraph({
        spacing: { before: 80, after: 40 },
        children: [
            runB(label),
            run(' ' + dots + ' '),
            run(page, { color: MGRAY })
        ]
    });
}

// ── Image helper ──────────────────────────────────────────────────────────────
function fig(filename, captionText) {
    const data = fs.readFileSync(`./diagrams/${filename}`);
    const w = data.readUInt32BE(16);
    const h = data.readUInt32BE(20);
    const targetW = 560;
    const targetH = Math.round((h / w) * targetW);
    return [
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 160, after: 80 },
            children: [new ImageRun({ data, transformation: { width: targetW, height: targetH }, type: 'png' })]
        }),
        figCaption(captionText)
    ];
}

// ── Table helpers ─────────────────────────────────────────────────────────────
function hdrCell(text, w) {
    return new TableCell({
        borders: allBdr(),
        width: { size: w, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text, font: 'Times New Roman', size: 20, bold: true, color: BLACK })]
        })]
    });
}

function dataCell(text, w, shade = false) {
    return new TableCell({
        borders: allBdr(),
        width: { size: w, type: WidthType.DXA },
        shading: shade ? { fill: LGRAY, type: ShadingType.CLEAR } : { fill: WHITE, type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        verticalAlign: VerticalAlign.TOP,
        children: [new Paragraph({
            spacing: { before: 0, after: 0, line: 260 },
            children: [new TextRun({ text: String(text), font: 'Times New Roman', size: 20, color: DGRAY })]
        })]
    });
}

function tableRow(cells, widths, isHeader = false, shade = false) {
    return new TableRow({
        tableHeader: isHeader,
        children: cells.map((c, i) => isHeader ? hdrCell(c, widths[i]) : dataCell(c, widths[i], shade))
    });
}

function makeTable(headers, rows, widths) {
    return new Table({
        width: { size: CW, type: WidthType.DXA },
        columnWidths: widths,
        rows: [
            tableRow(headers, widths, true),
            ...rows.map((r, i) => tableRow(r, widths, false, i % 2 !== 0))
        ]
    });
}

// ── Horizontal rule ───────────────────────────────────────────────────────────
function hr() {
    return new Paragraph({
        spacing: { before: 160, after: 160 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER } },
        children: [run('')]
    });
}

// ── Page break ────────────────────────────────────────────────────────────────
function pageBreak() {
    return new Paragraph({ children: [new PageBreak()] });
}

// ── Paper review block ────────────────────────────────────────────────────────
function paperReview(citation, bg, meth, findings, sw) {
    return [
        h3(citation),
        h4('Background and Motivation'),
        body(bg),
        h4('Methodology'),
        body(meth),
        h4('Key Findings and Contributions'),
        body(findings),
        h4('Strengths and Weaknesses'),
        body(sw),
        ...sp(1)
    ];
}

// ═════════════════════════════════════════════════════════════════════════════
// DOCUMENT CHILDREN — built in phases
// ═════════════════════════════════════════════════════════════════════════════
const children = [];

// ── TITLE PAGE ────────────────────────────────────────────────────────────────
children.push(
    centered([run('MPhil in Cybersecurity', { size: 24, color: MGRAY })],
        { before: 1440, after: 120 }),
    centered([runB('LITERATURE REVIEW', { size: 52, color: BLACK })],
        { before: 0, after: 240 }),
    centered([runI(
        'SecureLoop: Extending and Mitigating Security Vulnerability Degradation\nin Human-AI Collaborative Iterative Code Refinement',
        { size: 28, color: DGRAY })],
        { before: 0, after: 960 }),
    centered([run('Total Papers Reviewed: 42', { size: 24 })], { before: 0, after: 100 }),
    centered([run('Programme: MPhil in Cybersecurity', { size: 24 })], { before: 0, after: 100 }),
    centered([run('Date: 28 May 2026', { size: 24 })], { before: 0, after: 100 }),
    pageBreak()
);

// ── TABLE OF CONTENTS ─────────────────────────────────────────────────────────
// children.push(
//     h1('Table of Contents'),
//     ...sp(1),
//     tocEntryBold('Abstract', '........................................................', '3'),
//     ...sp(1),
//     tocEntryBold('1.  Introduction', '..............................................', '4'),
//     tocEntry('1.1  Purpose of the Review', '......................................', '3'),
//     tocEntry('1.2  Background and Motivation', '.................................', '3'),
//     tocEntry('1.3  Central Research Gap', '........................................', '4'),
//     ...sp(1),
//     tocEntryBold('2.  Theme 1: Foundational Studies on AI-Generated Code Security', '..........', '5'),
//     tocEntry('2.1  Overview', '....................................................', '5'),
//     tocEntry('2.2  Individual Paper Reviews', '....................................', '5'),
//     tocEntry('2.3  Thematic Discussion', '..........................................', '9'),
//     ...sp(1),
//     tocEntryBold('3.  Theme 2: The Iterative Feedback Loop', '......................', '10'),
//     tocEntry('3.1  Overview', '....................................................', '10'),
//     tocEntry('3.2  Individual Paper Reviews', '....................................', '10'),
//     tocEntry('3.3  Thematic Discussion', '..........................................', '13'),
//     ...sp(1),
//     tocEntryBold('4.  Theme 3: Mitigation Approaches and Their Limitations', '......', '14'),
//     tocEntry('4.1  Overview', '....................................................', '14'),
//     tocEntry('4.2  Individual Paper Reviews', '....................................', '14'),
//     tocEntry('4.3  Thematic Discussion', '..........................................', '18'),
//     ...sp(1),
//     tocEntryBold('5.  Theme 4: Software Supply Chain Risk', '......................', '19'),
//     tocEntry('5.1  Overview', '....................................................', '19'),
//     tocEntry('5.2  Individual Paper Reviews', '....................................', '19'),
//     tocEntry('5.3  Thematic Discussion', '..........................................', '22'),
//     ...sp(1),
//     tocEntryBold('6.  Theme 5: Evaluation Benchmarks and Datasets', '..............', '23'),
//     tocEntry('6.1  Overview', '....................................................', '23'),
//     tocEntry('6.2  Individual Paper Reviews', '....................................', '23'),
//     tocEntry('6.3  Thematic Discussion', '..........................................', '26'),
//     ...sp(1),
//     tocEntryBold('7.  Theme 6: Systematic Reviews and Policy Literature', '..........', '27'),
//     tocEntry('7.1  Overview', '....................................................', '27'),
//     tocEntry('7.2  Individual Paper Reviews', '....................................', '27'),
//     tocEntry('7.3  Thematic Discussion', '..........................................', '29'),
//     ...sp(1),
//     tocEntryBold('8.  Synthesis and Critical Analysis', '..........................', '30'),
//     tocEntry('8.1  Thematic Convergence', '........................................', '30'),
//     tocEntry('8.2  Contradictions and Debates in the Literature', '................', '30'),
//     tocEntry('8.3  Gaps Identified', '..............................................', '31'),
//     ...sp(1),
//     tocEntryBold('9.  Research Gap Statement', '....................................', '32'),
//     tocEntryBold('10. Research Questions', '..........................................', '33'),
//     tocEntryBold('11. Theoretical and Conceptual Framework', '......................', '34'),
//     tocEntryBold('12. Conclusion', '..................................................', '35'),
//     tocEntryBold('References', '......................................................', '36'),
//     pageBreak()
// );

// // ── LIST OF FIGURES ───────────────────────────────────────────────────────────
// children.push(
//     h1('List of Figures'),
//     ...sp(1),
//     tocEntry('Figure 1: The Feedback Loop Security Degradation Phenomenon', '..........', '4'),
//     tocEntry('Figure 2: DSR Process Model Mapped to This Research', '..................', '34'),
//     tocEntry('Figure 3: The Automation Bias Cycle', '..................................', '17'),
//     tocEntry('Figure 4: Research Gap Positioning Map', '..............................', '32'),
//     tocEntry('Figure 5: Thematic Convergence Towards the Proposed Framework', '........', '30'),
//     tocEntry('Figure 6: Three Core Design Requirements', '............................', '34'),
//     pageBreak()
// );

// // ── LIST OF TABLES ────────────────────────────────────────────────────────────
// children.push(
//     h1('List of Tables'),
//     ...sp(1),
//     tocEntry('Table 1: Structured Summary of All 42 Papers', '........................', '31'),
//     tocEntry('Table 2: Thematic Coverage Matrix', '....................................', '31'),
//     pageBreak()
// );

// ═════════════════════════════════════════════════════════════════════════════
// EXPORT — everything needed by later phases
// ═════════════════════════════════════════════════════════════════════════════
module.exports = {
    children,
    // helpers exported for use in phase files
    h1, h2, h3, h4,
    body, bodyNI, bodyB,
    bullet, sp, hr, pageBreak, fig, figCaption,
    centered, run, runB, runI,
    makeTable, paperReview,
    // docx classes needed in phase files
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
    VerticalAlign, PageNumber, LevelFormat, Header, Footer, PageBreak, ImageRun,
    BLACK, WHITE, DGRAY, MGRAY, LGRAY, BORDER, CW,
    allBdr, noBdr, bdrLine, hdrCell, dataCell, tableRow
};
