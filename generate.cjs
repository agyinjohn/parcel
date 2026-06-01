const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
    LevelFormat, VerticalAlign, PageNumber, PageBreak, ImageRun
} = require('docx');
const fs = require('fs');

// Helper: load image and return an ImageRun centred at ~6in wide
function fig(filename, captionText) {
    const data = fs.readFileSync(`./diagrams/${filename}`);
    // Parse PNG dimensions from header (bytes 16-24)
    const w = data.readUInt32BE(16);
    const h = data.readUInt32BE(20);
    const targetW = 550; // points-ish, docx uses px at 96dpi
    const targetH = Math.round((h / w) * targetW);
    return [
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 160, after: 80 },
            children: [
                new ImageRun({
                    data,
                    transformation: { width: targetW, height: targetH },
                    type: "png",
                })
            ]
        }),
        italic(captionText),
    ];
}

const border = { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorders = {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

function h1(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 120 },
        children: [new TextRun({ text, bold: true, size: 28, font: "Arial" })]
    });
}

function h2(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
        children: [new TextRun({ text, bold: true, size: 24, font: "Arial" })]
    });
}

function h3(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text, bold: true, italics: true, size: 22, font: "Arial" })]
    });
}

function para(text, options = {}) {
    return new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 80, after: 80, line: 276 },
        children: [new TextRun({ text, size: 22, font: "Arial", ...options })]
    });
}

function italic(text) {
    return new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 80, after: 80, line: 276 },
        children: [new TextRun({ text, size: 22, font: "Arial", italics: true })]
    });
}

function boldPara(text) {
    return new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 80, after: 80 },
        children: [new TextRun({ text, size: 22, font: "Arial", bold: true })]
    });
}

function bullet(text) {
    return new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text, size: 22, font: "Arial" })]
    });
}

function spacer() {
    return new Paragraph({ children: [new TextRun("")], spacing: { before: 80, after: 80 } });
}

function highlightBox(text) {
    return new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [9026],
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        borders,
                        width: { size: 9026, type: WidthType.DXA },
                        shading: { fill: "EAF4FB", type: ShadingType.CLEAR },
                        margins: { top: 120, bottom: 120, left: 180, right: 180 },
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.JUSTIFIED,
                                children: [new TextRun({ text, size: 22, font: "Arial", italics: true })]
                            })
                        ]
                    })
                ]
            })
        ]
    });
}

// Synthesis table rows helper
function makeTableRow(cells, isHeader = false) {
    return new TableRow({
        children: cells.map((c, i) => new TableCell({
            borders,
            width: { size: Math.floor(9026 / cells.length), type: WidthType.DXA },
            shading: isHeader ? { fill: "2E75B6", type: ShadingType.CLEAR } : { fill: "FFFFFF", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
                children: [new TextRun({ text: c, size: 20, font: "Arial", bold: isHeader, color: isHeader ? "FFFFFF" : "000000" })]
            })]
        }))
    });
}

function simpleTable(headers, rows) {
    return new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: headers.map(() => Math.floor(9026 / headers.length)),
        rows: [
            makeTableRow(headers, true),
            ...rows.map(r => makeTableRow(r, false))
        ]
    });
}

// Big synthesis matrix — 7 cols
function matrixRow(cells, isHeader = false) {
    const widths = [2200, 700, 750, 900, 950, 950, 750, 826];
    return new TableRow({
        children: cells.map((c, i) => new TableCell({
            borders,
            width: { size: widths[i] || 800, type: WidthType.DXA },
            shading: isHeader ? { fill: "2E75B6", type: ShadingType.CLEAR } : { fill: "FFFFFF", type: ShadingType.CLEAR },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [new Paragraph({
                children: [new TextRun({ text: c, size: 18, font: "Arial", bold: isHeader, color: isHeader ? "FFFFFF" : "000000" })]
            })]
        }))
    });
}

const matrixHeaders = ["Paper", "Year", "DSR", "AI Code Security", "Human-AI Collab", "Automation Bias", "HITL/Framework", "Regulatory"];
const matrixData = [
    ["Peffers et al.", "2007", "✓✓", "", "", "", "", ""],
    ["Hevner et al.", "2004", "✓✓", "", "", "", "", ""],
    ["Alexei", "2022", "✓", "", "", "", "", ""],
    ["Pearce et al.", "2022", "", "✓✓", "", "", "", ""],
    ["Siddiq & Santos", "2022", "", "✓", "", "", "", ""],
    ["Perry et al.", "2023", "", "✓✓", "", "✓✓", "", ""],
    ["Hamza et al.", "2023", "", "", "✓✓", "", "", ""],
    ["Negri-Ribalta et al.", "2024", "", "✓✓", "", "", "", ""],
    ["Liu et al.", "2024", "", "✓", "", "", "", ""],
    ["Majdinasab et al.", "2024", "", "✓", "", "", "", ""],
    ["Wang et al.", "2024", "", "✓✓", "", "", "", ""],
    ["Fragiadakis et al.", "2024", "", "", "✓✓", "", "", ""],
    ["Cabrero-Daniel et al.", "2024", "", "", "✓", "", "", ""],
    ["Mohsin et al. (SOC)", "2024", "", "", "✓", "", "✓✓", ""],
    ["Horowitz & Kahn", "2024", "", "", "", "✓✓", "", ""],
    ["CSET", "2024", "", "✓", "", "✓✓", "", "✓"],
    ["EU AI Act", "2024", "", "", "", "", "", "✓✓"],
    ["AutoSafeCoder", "2024", "", "✓", "", "", "✓", ""],
    ["HICSS-57 Study", "2024", "✓", "", "", "", "✓", ""],
    ["Shukla et al.", "2025", "", "✓✓", "✓", "", "✓✓", ""],
    ["Mohsin et al. (CodingCare)", "2025", "", "✓", "", "", "✓", ""],
    ["Abbasi et al.", "2025", "", "", "✓✓", "", "", ""],
    ["Bobba", "2025", "", "", "✓✓", "", "", ""],
    ["Akinsanya", "2025", "✓", "", "", "", "✓✓", "✓"],
    ["Alebachew & Brown", "2025", "", "", "", "✓", "", ""],
    ["Expertise Gap Study", "2025", "", "", "✓✓", "", "", ""],
    ["Veracode", "2025", "", "✓", "", "", "", "✓✓"],
    ["RAG Secure Code", "2025", "", "✓", "", "", "✓", ""],
    ["Chan (SHAPR)", "2026", "✓✓", "", "✓", "", "", ""],
    ["Blain & Noiseux", "2026", "", "✓✓", "", "", "", ""],
    ["Sonar Survey", "2026", "", "", "", "✓✓", "✓", "✓"],
    ["WitnessAI", "2026", "", "", "", "", "✓", "✓✓"],
    ["THIS RESEARCH", "2025+", "✓✓", "✓✓", "✓✓", "✓", "✓✓", "✓✓"],
];

const doc = new Document({
    numbering: {
        config: [
            {
                reference: "bullets",
                levels: [{
                    level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
                    style: { paragraph: { indent: { left: 720, hanging: 360 } } }
                }]
            }
        ]
    },
    styles: {
        default: { document: { run: { font: "Arial", size: 22 } } },
        paragraphStyles: [
            {
                id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: 28, bold: true, font: "Arial", color: "2E75B6" },
                paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 }
            },
            {
                id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: 24, bold: true, font: "Arial", color: "2E75B6" },
                paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 1 }
            },
            {
                id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: 22, bold: true, italics: true, font: "Arial", color: "1F4E79" },
                paragraph: { spacing: { before: 160, after: 60 }, outlineLevel: 2 }
            }
        ]
    },
    sections: [{
        properties: {
            page: {
                size: { width: 11906, height: 16838 },
                margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
            }
        },
        children: [

            // ── TITLE PAGE ──
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 720, after: 240 },
                children: [new TextRun({ text: "Literature Review", bold: true, size: 36, font: "Arial", color: "2E75B6" })]
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 120, after: 120 },
                children: [new TextRun({ text: "A Human-AI Collaborative Security Intervention Framework for Mitigating Vulnerability Degradation in Iterative LLM-Assisted Code Refinement", italics: true, size: 26, font: "Arial" })]
            }),
            spacer(),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 240, after: 80 },
                children: [new TextRun({ text: "MPhil Research | Department of Computer Science", size: 22, font: "Arial" })]
            }),
            spacer(),

            // ── ABSTRACT ──
            new Paragraph({
                spacing: { before: 320, after: 80 },
                children: [new TextRun({ text: "Abstract", bold: true, size: 26, font: "Arial", color: "2E75B6" })]
            }),
            para("The integration of Large Language Models (LLMs) into software development workflows has introduced a significant and underexplored security risk: the non-linear accumulation of vulnerabilities through iterative, conversational code refinement. Empirical evidence demonstrates that unmediated LLM-assisted refinement produces a 37.6% increase in critical vulnerabilities across just five iterations. This phenomenon, termed feedback loop security degradation, highlights a gap: no designed artefact currently exists to operationalise structured human oversight within these workflows."),
            para("This paper addresses that gap through a Design Science Research (DSR) methodology, proposing and evaluating a Human-AI Collaborative Security Intervention Framework (HACSIF). Grounded in six converging literature streams — empirical AI code security, human-AI collaboration, automation bias, Human-in-the-Loop (HITL) design, existing security frameworks, and regulatory governance — the framework operationalises three core design requirements: structured trigger criteria defining when human intervention must occur; role-differentiated review protocols specifying who reviews what; and cognitively feasible review processes designed to counter automation bias."),
            para("The framework aligns with the EU AI Act Article 14, OWASP LLM Top 10, NIST AI Risk Management Framework, and SLSA supply chain standards. Evaluation follows the controlled experimental methodology of Shukla, Joshi, and Syed (2025), measuring vulnerability accumulation across multi-iteration conditions with and without framework intervention."),
            spacer(),
            new Paragraph({
                spacing: { before: 80, after: 160 },
                children: [
                    new TextRun({ text: "Keywords: ", bold: true, size: 22, font: "Arial" }),
                    new TextRun({ text: "LLM security, iterative code refinement, human-in-the-loop, Design Science Research, automation bias, AI-assisted development, vulnerability accumulation, EU AI Act", italics: true, size: 22, font: "Arial" })
                ]
            }),

            // ── 1. INTRODUCTION ──
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1.0  Introduction")] }),
            para("The integration of Large Language Models (LLMs) into software development has fundamentally reshaped how code is written, reviewed, and iteratively refined. Tools such as GitHub Copilot, ChatGPT, and Claude are now used by over 80% of developers in their daily workflows (GitHub, 2024). While these tools offer significant productivity gains, the security implications of their use — particularly within iterative, conversational development loops — remain substantially underexplored."),
            para("The most pressing challenge is not merely that AI-generated code contains vulnerabilities in isolation, but that these vulnerabilities compound and accumulate as developers engage in multi-turn refinement cycles. Shukla, Joshi, and Syed (2025) provide the first systematic empirical evidence of this phenomenon, which they term 'feedback loop security degradation', demonstrating a 37.6% increase in critical vulnerabilities after just five iterations of LLM-assisted code refinement without human intervention. Their findings challenge the assumption that iterative AI refinement improves code quality and point to the need for structured human oversight mechanisms."),
            para("This literature review maps the current state of knowledge across six interconnected themes and establishes the scholarly basis for a Design Science Research (DSR) artefact — specifically a Human-AI Collaborative Security Intervention Framework — that addresses a confirmed gap in the literature."),
            spacer(),
            highlightBox("Central Research Gap: No designed, evaluated artefact exists that operationalises human-AI collaboration to mitigate security degradation specifically within iterative LLM-assisted code refinement workflows. This review confirms this gap across six independent literature streams and positions the proposed DSR artefact as the first to address it."),
            spacer(),
            ...fig("fig1_feedback_loop.png", "Figure 1: The Feedback Loop Security Degradation Phenomenon (Shukla et al., 2025)"),

            // ── 2. DSR ──
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2.0  Design Science Research as the Methodological Lens")] }),
            para("Design Science Research (DSR) is a well-established research paradigm in Information Systems that seeks to extend human and organisational capabilities through the creation and evaluation of innovative artefacts (Hevner et al., 2004). Rather than seeking to explain or predict phenomena, DSR aims to prescribe solutions by producing constructs, models, methods, or instantiations that address real-world problems with rigour and relevance."),
            para("The most widely adopted DSR process model is that of Peffers et al. (2007), which defines six phases: problem identification and motivation, definition of objectives, design and development, demonstration, evaluation, and communication. This model has guided dozens of cybersecurity-specific DSR studies. Alexei (2022) employed the Peffers model to develop a cybersecurity framework for Higher Education Institutions in Moldova. A HICSS-57 study (2024) used DSR iterations to derive design principles for a cybersecurity readiness assessment tool."),
            para("A critical dimension of DSR is artefact evaluation. Hevner et al. (2004) identify seven guidelines for DSR, with evaluation being among the most demanding. Venable et al. (2012) extend this with a comprehensive framework distinguishing formative from summative evaluation, and naturalistic from artificial contexts. Pastor et al. (2024) further propose a dual-cycle DSR model distinguishing the design cycle from the empirical validation cycle. Chan (2026) introduces the SHAPR framework, which operationalises human-AI collaborative research through structured DSR in AI-assisted development environments."),
            spacer(),
            ...fig("fig2_dsr_process.png", "Figure 2: DSR Process Model (Peffers et al., 2007) Mapped to This Research"),

            // ── 3. AI CODE SECURITY ──
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3.0  Security Vulnerabilities in AI-Generated Code")] }),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.1  Foundational Evidence of Vulnerability Introduction")] }),
            para("The empirical study of security vulnerabilities in AI-generated code has grown substantially since 2022. Pearce et al. (2022) conducted one of the earliest and most influential evaluations, examining approximately 1,689 programs generated by GitHub Copilot across 89 scenarios covering 18 CWE categories. Their findings revealed that roughly 40% of generated programs contained security vulnerabilities, with particularly elevated rates in C code (~50%) compared to Python (~39%)."),
            para("Perry et al. (2023) expanded on this through a controlled user study showing that participants using AI tools produced significantly less secure code while simultaneously rating their own code as more secure — a dynamic the authors term a 'false sense of security.' Majdinasab et al. (2024) replicated Pearce et al.'s Copilot study at IEEE SANER, confirming elevated vulnerability rates in more recent model versions. A comprehensive systematic review by Negri-Ribalta et al. (2024), synthesising 19 studies, confirmed broad scholarly consensus: AI models do not produce safe code despite mitigation efforts. Blain and Noiseux (2026), using formal verification via Z3 SMT solver across 3,500 code artefacts from seven LLMs, concluded that AI-generated code is 'broken by default' in security-critical domains."),
            spacer(),
            simpleTable(
                ["Paper", "Method", "Data Type", "Key Finding", "Limitation"],
                [
                    ["Pearce et al. (2022)", "Copilot evaluation", "Code / CWEs", "~40% of outputs contained vulnerabilities", "Single-shot only; no iterative analysis"],
                    ["Perry et al. (2023)", "Controlled user study", "Developer behaviour", "AI users wrote less secure but more confident code", "Lab setting; limited ecological validity"],
                    ["Negri-Ribalta et al. (2024)", "Systematic review (19 studies)", "Multi-source", "No AI model produces safe code consistently", "Heterogeneous study designs"],
                    ["Blain & Noiseux (2026)", "Formal verification (Z3 SMT)", "7 LLMs / 3,500 artefacts", "'Broken by default' in security-critical domains", "Formal methods may not reflect all real contexts"],
                ]
            ),
            spacer(),
            italic("Table 1: Summary of foundational AI code security studies, highlighting methods, data types, key findings, and limitations."),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.2  Iterative Refinement and Security Degradation")] }),
            para("Shukla, Joshi, and Syed (2025) provide the most systematic treatment of the iterative refinement problem to date. In a controlled experiment with 400 code samples across 40 rounds, employing four prompting strategies, they document a clear non-linear accumulation of vulnerabilities. Average vulnerability counts per sample rose from 2.1 in early iterations to 6.2 by iterations 8-10, with statistically significant differences confirmed by repeated-measures ANOVA (F(9,90) = 14.32, p < 0.001, η² = 0.42). The study deliberately excluded human intervention, framing this as a worst-case scenario and calling for future research on human-AI collaborative mitigation."),
            para("Liu et al. (2024) similarly observed that the refinement process could introduce new issues. Mohsin et al. (2025) introduced CodingCare, a security framework integrating prompt libraries and vulnerability databases, demonstrating reduced CVE counts. Wang et al. (2024), using the CodeSecEval benchmark, found that while advanced models benefit from vulnerability hints, they remain prone to insecure outputs across a wide range of CWE categories."),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.3  Multi-Agent and Automated Repair Approaches")] }),
            para("An emerging parallel literature addresses automated multi-agent approaches to secure code generation. AutoSafeCoder (Alqarni et al., 2024) proposes a multi-agent framework with three collaborating agents that iteratively refine code for both functional correctness and security. RAG-assisted secure code generation frameworks integrate compiler diagnostics, symbolic execution, and static analysis into self-repair workflows, finding that the most successful approaches are tool-augmented rather than purely prompt-driven."),
            para("These automated approaches represent an important contrast to the framework proposed in this research. While they improve security in automated settings, they do not account for the human cognitive and sociotechnical dimensions that determine whether security interventions are adopted and sustained in real development teams."),
            spacer(),
            boldPara("Synthesis"),
            para("AI-generated code is empirically insecure under single-shot conditions, and vulnerability rates increase non-linearly through iterative refinement. Automated mitigation approaches improve security in controlled settings but cannot address the human factors — automation bias, role-differentiated accountability, and regulatory governance — that determine whether oversight is genuinely sustained in practice. These findings collectively establish the empirical foundation for a human-centred intervention framework."),

            // ── 4. HUMAN-AI COLLAB ──
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4.0  Human-AI Collaboration in Software Development")] }),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.1  Collaboration Models and Frameworks")] }),
            para("The study of human-AI collaboration in software engineering has emerged as a distinct research area. Hamza et al. (2023) examined how developers and AI systems collaborate across coding, testing, and debugging tasks, identifying three conditions for effective collaboration: clear role allocation, effective communication protocols, and balanced task distribution. Fragiadakis et al. (2024) proposed a methodological framework for evaluating human-AI collaboration encompassing task effectiveness, cognitive load, trust calibration, and communication quality."),
            para("Cabrero-Daniel et al. (2024) found that the effectiveness of human-AI collaboration is highly context-dependent, varying with team structure, task complexity, and the transparency of AI outputs. Bobba (2025) proposes a taxonomic framework distinguishing along dimensions of autonomy, cognitive partnership, and task interdependence. A controlled mixed-methods user study of 58 participants (arXiv:2505.03179, 2025) found that human-AI collaboration improves task performance in cybersecurity tasks, and that well-designed HITL frameworks can support long-term skill development rather than fostering dependency."),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.2  Security-Specific Collaboration Frameworks")] }),
            para("Mohsin et al. (2024) propose a Unified Framework for Human-AI Collaboration in Security Operations Centres (SOCs) with Trusted Autonomy, defining four levels of automation (Levels 0-4) and mapping SOC security functions to appropriate human-AI collaboration modalities at each level. They integrate HITL mechanisms with cognitive modelling and situation awareness frameworks. While focused on SOC operations rather than code development, this framework establishes the design principle of threshold-triggered human intervention based on risk level — directly transferable to the iterative code refinement context."),
            spacer(),
            simpleTable(
                ["Paper", "Model/Focus", "Key Strength", "Limitation"],
                [
                    ["Hamza et al. (2023)", "Role allocation & communication protocols", "Identifies three conditions for effective collaboration", "Not security-specific; lab-based"],
                    ["Fragiadakis et al. (2024)", "Evaluation framework (task, cognitive load, trust)", "Comprehensive multi-dimensional assessment criteria", "Evaluative, not prescriptive"],
                    ["Mohsin et al. (2024)", "SOC four-level autonomy model", "Threshold-triggered HITL with risk modelling", "SOC context, not code development"],
                    ["Expertise Gap Study (2025)", "58-participant mixed-methods study", "Skill development through HITL collaboration", "Phishing/intrusion scope, not code security"],
                ]
            ),
            spacer(),
            italic("Table 2: Summary of human-AI collaboration frameworks reviewed, with strengths and limitations."),
            spacer(),
            boldPara("Synthesis"),
            para("Human-AI collaboration in software development is widespread but structurally under-governed. Effective collaboration requires clear role allocation, communication protocols, and task distribution — conditions that are rarely formalised in current AI coding workflows. Security-specific frameworks like the SOC autonomy model establish the viability of threshold-triggered HITL design, providing direct design precedent for the proposed framework."),

            // ── 5. AUTOMATION BIAS ──
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("5.0  Automation Bias and the Limits of Developer Trust")] }),
            para("A critical but frequently underweighted dimension of human-AI collaboration in secure development is automation bias — defined as the tendency of individuals to over-rely on automated systems and accept their outputs without sufficient critical evaluation. In the context of AI-assisted code development, automation bias has emerged as a structural risk that undermines the very human oversight that security frameworks depend upon."),
            para("Perry et al. (2023) provide the most direct evidence: developers using AI assistants not only wrote less secure code but were more confident in its security. This confidence-competence inversion is precisely the condition that makes iterative AI code refinement dangerous without structured intervention. Horowitz and Kahn (2024), in a large-scale preregistered experiment across 9,000 participants in nine countries, found that automation bias is moderated by domain knowledge — with those possessing deeper AI literacy being better calibrated in their trust. This finding suggests that developer expertise is a meaningful moderator of security risk."),
            para("Alebachew and Brown (2024), examining automatic bias detection in source code review, demonstrate that biases are often invisible to those exhibiting them, reinforcing the case for structural rather than purely educative mitigations. Sonar's 2026 State of Code Developer Survey found that 96% of developers do not fully trust AI-generated code without manual intervention, yet nearly half report that reviewing AI-generated code takes more effort than reviewing human-written code — with 38% stating they sometimes skip review due to this burden."),
            spacer(),
            ...fig("fig3_automation_bias.png", "Figure 3: The Automation Bias Cycle in AI-Assisted Code Development"),
            spacer(),
            boldPara("Synthesis"),
            para("Automation bias is a structural rather than individual phenomenon in AI-assisted development. Developers recognise the need for review but face cognitive and temporal barriers to executing it. A structured intervention framework must therefore make review cognitively feasible and efficiently targeted — not merely mandate it."),

            // ── 6. HITL ──
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("6.0  Human-in-the-Loop Approaches and Existing Security Frameworks")] }),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.1  HITL Principles and Design")] }),
            para("Human-in-the-Loop (HITL) is a design principle that places human decision-makers at key points within automated systems. In cybersecurity and AI governance contexts, HITL has emerged as a foundational safeguard. It is mandated by the EU AI Act (2024), which requires meaningful human oversight for high-risk AI systems, and is supported by the OWASP Top 10 for LLM Applications, which identifies the absence of human oversight as a primary risk factor."),
            para("HITL systems are characterised by three core components: an oversight mechanism that pauses execution pending human input; a threshold trigger defining which outputs require human review; and decision authority defining which tasks require human approval versus autonomous execution. In iterative AI code refinement, these translate to: a structured review checkpoint mechanism, iteration count or complexity-based triggers, and role-based authority defining which developer levels are qualified to approve which categories of AI-generated code."),
            para("Shukla et al. (2025) implicitly invoke HITL principles in their mitigation guidelines, recommending mandatory developer review between iterations and a maximum of three consecutive LLM-only iterations. However, these guidelines remain informal recommendations rather than a designed, evaluable artefact — which is the gap the proposed DSR framework addresses."),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.2  Existing Security Frameworks and Their Limitations")] }),
            para("Several security frameworks address portions of the problem space. Mohsin et al. (2025), in the CodingCare framework, integrate prompt libraries, vulnerability databases, and programming use-case repositories across the SDLC, demonstrating meaningful reductions in CVEs. However, CodingCare is primarily a prompt engineering and static analysis framework; it does not address iterative refinement dynamics or specify when and how human developers should intervene."),
            para("Akinsanya (2025) proposes a risk-based framework for cybersecurity compliance and critical infrastructure protection employing security-by-design. AutoSafeCoder (2024) and RAG-assisted repair frameworks represent fully automated alternatives. An important cross-cutting limitation of all existing frameworks is the absence of empirical validation under iterative conditions."),
            spacer(),
            simpleTable(
                ["Framework", "Author(s)", "Key Strength", "Critical Gap"],
                [
                    ["CodingCare", "Mohsin et al. (2025)", "Reduces CVE counts via prompt engineering", "No iterative dynamics; no human oversight specification"],
                    ["SOC Collaboration Model", "Mohsin et al. (2024)", "Threshold-triggered HITL with autonomy levels", "SOC context; not validated for code refinement"],
                    ["AutoSafeCoder", "Alqarni et al. (2024)", "Automated multi-agent security pipeline", "Bypasses human governance entirely"],
                    ["Risk-Based Framework", "Akinsanya (2025)", "Security-by-design for critical infrastructure", "Not code-generation specific; no HITL mechanism"],
                    ["HACSIF (Proposed)", "This Research", "Structured HITL for iterative LLM code refinement", "Requires empirical validation (in progress)"],
                ]
            ),
            spacer(),
            italic("Table 3: Existing security frameworks compared against the proposed HACSIF, highlighting key strengths and critical gaps."),
            spacer(),
            boldPara("Synthesis"),
            para("Existing security frameworks address either automated mitigation or general security-by-design principles, but none are specifically designed for the iterative LLM-assisted code refinement context. The critical gap is the absence of a human-centred artefact that operationalises structured oversight at the workflow level, accounting for developer expertise, cognitive feasibility, and regulatory compliance simultaneously."),

            // ── 7. REGULATORY ──
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("7.0  Regulatory and Governance Context")] }),
            para("An emerging regulatory and governance literature is reshaping the context within which human oversight of AI-generated code must be understood. This theme represents an important dimension for the proposed framework's practical relevance and long-term adoption."),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.1  The EU AI Act and Human Oversight Mandates")] }),
            para("The European Union's AI Act (2024), the world's first comprehensive AI regulatory framework, establishes mandatory human oversight requirements for high-risk AI systems under Article 14. While AI coding assistants are not currently classified as high-risk, the Act's principles — particularly around transparency, accountability, and meaningful human control — are shaping organisational AI governance policies globally. Code generation in security-critical domains such as financial services, healthcare, and critical infrastructure may fall within high-risk classifications, making HITL frameworks a compliance requirement rather than merely a best practice. WitnessAI (2026) confirms that HITL workflows that generate audit trails are emerging as a practical compliance mechanism under the Act."),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.2  OWASP LLM Top 10 and Developer Standards")] }),
            para("The OWASP Top 10 for LLM Applications identifies the absence of human oversight as a primary risk factor in LLM deployments, specifically flagging over-reliance on LLM outputs without human validation as a top-tier vulnerability. This standard is already being adopted by security-conscious organisations as a code review checklist, providing an institutional adoption pathway for a framework that operationalises HITL in LLM-assisted development."),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.3  NIST AI Risk Management Framework and SLSA")] }),
            para("The NIST AI Risk Management Framework (AI RMF, 2023) provides a structured approach to managing AI-related risks across the full AI lifecycle, with 'Govern', 'Map', 'Measure', and 'Manage' functions that directly map onto framework design requirements. The Supply-chain Levels for Software Artifacts (SLSA) framework establishes provenance and integrity requirements for software supply chains — requirements that become increasingly difficult to satisfy when AI-generated code introduces supply chain vulnerabilities through iterative refinement."),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.4  Veracode Industry Evidence")] }),
            para("Veracode's 2025 GenAI Code Security Report provides substantive industry context: by June 2025, AI-generated code was introducing over 10,000 new security findings per month across studied repositories — a tenfold increase from December 2024. This acceleration confirms that the academic literature's laboratory findings are manifesting at scale in production environments. Gartner projects that 70% of professional developers will use AI coding assistants by 2027. Without validated human oversight frameworks, the security risks documented across the literature will continue to scale with adoption."),
            spacer(),
            boldPara("Synthesis"),
            para("The regulatory and governance landscape is rapidly creating institutional demand for validated HITL frameworks. The EU AI Act, OWASP LLM Top 10, NIST AI RMF, and SLSA together provide a multi-layered compliance context within which the proposed framework is positioned to serve not merely as an academic contribution but as a practically deployable governance instrument."),

            // ── 8. SYNTHESIS ──
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("8.0  Synthesis and Research Gap")] }),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("8.1  Thematic Convergence")] }),
            para("The six themes reviewed above point toward a shared and substantive research problem. Empirically, AI-generated code is insecure in single-shot conditions and becomes increasingly insecure through iterative refinement. Methodologically, DSR provides the appropriate paradigm for designing and evaluating an artefact that addresses this problem. Sociotechnically, human-AI collaboration in software development is both widespread and structurally under-governed. Psychologically, automation bias systematically undermines the human oversight that security depends upon. Structurally, existing HITL and security frameworks are not designed for iterative refinement contexts. At the regulatory level, emerging standards are creating institutional pressure for validated HITL frameworks."),
            spacer(),
            ...fig("fig5_convergence.png", "Figure 5: Thematic Convergence Towards the Proposed DSR Artefact"),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("8.2  Three Design Requirements")] }),
            para("The synthesis reveals three specific design requirements for the proposed framework:"),
            spacer(),
            bullet("DR1: Structured Intervention Trigger Criteria — Define not merely that human review is necessary, but when it must occur: including iteration count thresholds, complexity increase triggers, supply chain CWE detection, and CVSS severity thresholds, grounded in the empirical findings of Shukla et al. (2025)."),
            bullet("DR2: Role-Differentiated Review Protocols — Define who reviews what, based on developer experience level and vulnerability category, addressing the expertise moderation effect documented by Horowitz and Kahn (2024) and the epistemic labour division question raised by Abbasi et al. (2025)."),
            bullet("DR3: Cognitive Feasibility of Review Process — Counter automation bias by designing review processes that are targeted rather than comprehensive, AI-summarised rather than raw, and time-bounded rather than open-ended, addressing the review burden paradox documented by Sonar (2026)."),
            spacer(),
            ...fig("fig6_design_reqs.png", "Figure 6: Three Core Design Requirements for the Proposed Framework"),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("8.3  The Research Gap")] }),
            highlightBox("Despite the convergence of evidence across six independent literature streams, a critical gap persists: no designed, evaluated artefact exists that operationalises human-AI collaboration to mitigate security degradation specifically within iterative LLM-assisted code refinement workflows. Shukla et al. (2025) call for future research on HITL practices but stop short of designing or evaluating such a system. Existing HITL frameworks are not adapted for code refinement contexts. Existing code security frameworks do not address iterative dynamics. Automated multi-agent approaches bypass human governance entirely. This is the gap this research addresses."),
            spacer(),
            ...fig("fig4_gap_map.png", "Figure 4: Research Gap Positioning Map — Prior Work vs This Research"),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("8.4  Synthesis Matrix")] }),
            italic("Table 4 maps the key papers reviewed against all six themes, illustrating convergence and gaps."),
            spacer(),
            new Table({
                width: { size: 9026, type: WidthType.DXA },
                columnWidths: [2200, 700, 750, 900, 950, 950, 750, 826],
                rows: [
                    matrixRow(matrixHeaders, true),
                    ...matrixData.map(r => matrixRow(r, false))
                ]
            }),

            // ── 9. CONCLUSION ──
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("9.0  Conclusion")] }),
            para("This literature review has mapped the scholarly landscape across six interconnected themes to establish the foundations for a novel DSR artefact targeting a critical and underaddressed problem. The evidence across the reviewed literature is clear: AI-generated code is insecure, iterative refinement compounds that insecurity non-linearly, human oversight is necessary but structurally undermined by automation bias, existing frameworks do not address iterative dynamics, and regulatory pressure is creating institutional demand for validated HITL solutions."),
            para("The proposed Human-AI Collaborative Security Intervention Framework (HACSIF) will address this gap through the DSR process model of Peffers et al. (2007), designing structured intervention trigger criteria, role-differentiated review protocols, and cognitive-load-aware review processes within iterative LLM-assisted code development workflows. Its evaluation will be grounded in the experimental methodology established by Shukla et al. (2025), measuring vulnerability accumulation with and without the framework across multi-iteration controlled conditions. The framework will be aligned with the EU AI Act Article 14, OWASP LLM Top 10, NIST AI RMF, and SLSA supply chain standards."),
            para("With Gartner projecting that 70% of developers will use AI coding assistants by 2027, and Veracode documenting a tenfold increase in AI-introduced vulnerabilities in a single year, the absence of validated human oversight frameworks represents a growing organisational and societal risk. This research is designed to fill that gap with theoretical rigour, empirical grounding, and practical deployability."),

            // ── DECLARATIONS ──
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Declarations")] }),
            boldPara("Ethics Approval and Consent to Participate"),
            para("Not applicable."),
            boldPara("Availability of Data and Materials"),
            para("No new datasets were generated or analysed in this study. All data discussed are available in the referenced publications."),
            boldPara("Competing Interests"),
            para("The author declares no competing interests."),
            boldPara("Funding"),
            para("The author received no direct funding for this research."),

            // ── REFERENCES ──
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("References")] }),
            ...[
                "Abbasi, M. A., et al. (2025). Reconsidering requirements engineering: Human-AI collaboration in AI-native software development. arXiv:2510.04380.",
                "Akinsanya, A. (2025). Security by design: A risk-based framework for cybersecurity compliance and critical infrastructure protection. International Journal of Information Security. https://doi.org/10.1007/s10207-025-01155-4",
                "Alebachew, Y. B., & Brown, C. (2024). Automatic bias detection in source code review. arXiv:2504.18449.",
                "Alexei, A. (2022). Implementing Design Science Research Method to develop a cyber security framework for HEIs in Moldova. Proceedings of IC|ECCO-2021.",
                "Alqarni, A., et al. (2024). AutoSafeCoder: A multi-agent framework for securing LLM code generation through static analysis and fuzz testing. arXiv:2409.10737.",
                "Blain, D., & Noiseux, M. (2026). Broken by default: A formal verification study of security vulnerabilities in AI-generated code. arXiv:2604.05292.",
                "Bobba, A. R. (2025). The evolution of cognitive partnership: A taxonomic framework for human-AI collaboration modalities. Journal of Computer Science and Technology Studies, 7(8), 992-1005.",
                "Cabrero-Daniel, B., Herda, T., Pichler, V., & Eder, M. (2024). Exploring human-AI collaboration in agile: Customised LLM meeting assistants. XP Conference. Springer.",
                "Center for Security and Emerging Technology (CSET). (2024). Cybersecurity risks of AI-generated code. Georgetown University. https://doi.org/10.51593/20230057",
                "Chan, A. (2026). SHAPR: Operationalising human-AI collaborative research through structured knowledge generation. arXiv:2603.25660.",
                "Chong, C. J., Yao, Z., & Neamtiu, I. (2024). Artificial-intelligence generated code considered harmful. arXiv:2409.19182.",
                "EU AI Act. (2024). Regulation of the European Parliament and of the Council laying down harmonised rules on artificial intelligence.",
                "Fragiadakis, G., Diou, C., Kousiouris, G., & Nikolaidou, M. (2024). Evaluating human-AI collaboration: A review and methodological framework. arXiv:2407.19098.",
                "GitHub. (2024). Survey reveals AI's impact on the developer experience. GitHub Blog.",
                "Hamza, M., Siemon, D., Akbar, M. A., & Rahman, T. (2023). Human-AI collaboration in software engineering. arXiv:2312.10620.",
                "Hevner, A. R., March, S. T., Park, J., & Ram, S. (2004). Design science in information systems research. MIS Quarterly, 28(1), 75-105.",
                "HICSS-57. (2024). Deriving design principles from the design journey of a cybersecurity readiness assessment tool.",
                "Horowitz, M. C., & Kahn, L. (2024). Bending the automation bias curve. International Studies Quarterly, 68(2).",
                "Liu, Y., Le-Cong, T., Widyasari, R., Lo, D., Tao, M., & Han, S. (2024). Refining ChatGPT-generated code. ACM TOSEM.",
                "Majdinasab, V., et al. (2024). Assessing the security of GitHub Copilot's generated code: A targeted replication study. IEEE SANER 2024.",
                "Mohsin, A., Janicke, H., Ibrahim, A., Sarker, I. H., & Camtepe, S. (2024). A unified framework for human-AI collaboration in security operations centers. arXiv:2505.23397.",
                "Mohsin, A., et al. (2025). CodingCare: AI code generation security framework. ACM ISCCN 2025.",
                "Negri-Ribalta, C., et al. (2024). A systematic literature review on the impact of AI models on the security of code generation. Frontiers in Big Data, 7.",
                "NIST. (2023). AI Risk Management Framework (AI RMF 1.0). National Institute of Standards and Technology.",
                "OWASP. (2024). OWASP Top 10 for Large Language Model Applications. OWASP Foundation.",
                "Pastor, et al. (2024). Dual-cycle DSR model. Information Systems Journal.",
                "Pearce, H., Ahmad, B., Tan, B., Dolan-Gavitt, B., & Karri, R. (2022). Asleep at the keyboard? IEEE S&P, 754-768.",
                "Peffers, K., Tuunanen, T., Rothenberger, M. A., & Chatterjee, S. (2007). A design science research methodology. Journal of Management Information Systems, 24(3), 45-77.",
                "Perry, N., Srivastava, M., Kumar, D., & Boneh, D. (2023). Do users write more insecure code with AI assistants? ACM CCS 2023.",
                "Shukla, S., Joshi, H., & Syed, R. (2025). Security degradation in iterative AI code generation. IEEE-ISTAS 2025. arXiv:2506.11022.",
                "Siddiq, M. L., & Santos, J. C. (2022). SecurityEval dataset. MSR4P&S 2022.",
                "Sonar. (2026). State of code: Developer survey 2026.",
                "Tariq, S., et al. (2025). Bridging expertise gaps: The role of LLMs in human-AI collaboration for cybersecurity. arXiv:2505.03179.",
                "Tony, C., et al. (2023). LLMSecEval. IEEE/ACM MSR 2023.",
                "Venable, J. R., Pries-Heje, J., & Baskerville, R. (2012). A comprehensive framework for evaluation in design science research. DESRIST 2012.",
                "Veracode. (2025). 2025 GenAI code security report. Veracode Research.",
                "Wang, Y., et al. (2024). Is your AI-generated code really secure? CodeSecEval. arXiv:2407.02395.",
                "WitnessAI. (2026). Human-in-the-loop AI: Benefits, use cases, and best practices.",
                "arXiv:2601.00509. (2025). Improving LLM-assisted secure code generation through RAG and multi-tool feedback.",
            ].map(ref => new Paragraph({
                spacing: { before: 60, after: 60 },
                indent: { left: 720, hanging: 720 },
                children: [new TextRun({ text: ref, size: 20, font: "Arial" })]
            }))
        ]
    }]
});

Packer.toBuffer(doc).then(buf => {
    fs.writeFileSync('./outputs/HACSIF_Literature_Review_Structured.docx', buf);
    console.log('Done...m');
});