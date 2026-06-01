const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
    PageNumber, Footer, LevelFormat, ImageRun, PageBreak
} = require('docx');
const fs = require('fs');

const CW = 9026; // content width A4 1-inch margins

// Colours
const NAVY = "0D2B55", ACCENT = "1A6FAF", GREEN = "1A7A4A";
const AMBER = "B85C00", RED = "8B0000", LIGHT = "EAF2FB";
const LGREEN = "E8F5EE", LGRAY = "F4F4F4", DGRAY = "222222";

const bdr = (c = "CCCCCC") => ({ style: BorderStyle.SINGLE, size: 1, color: c });
const cBdr = (c = "CCCCCC") => ({ top: bdr(c), bottom: bdr(c), left: bdr(c), right: bdr(c) });
const cm = { top: 80, bottom: 80, left: 120, right: 120 };

// ── Helpers ───────────────────────────────────────────────────────────────────
const t = (text, o = {}) => new TextRun({ text, font: "Arial", size: 22, ...o });
const tb = (text, o = {}) => t(text, { bold: true, ...o });
const ti = (text, o = {}) => t(text, { italics: true, ...o });
const sp = () => new Paragraph({ children: [t("")], spacing: { before: 60, after: 60 } });

function h1(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 180 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: ACCENT, space: 1 } },
        children: [new TextRun({ text, bold: true, size: 32, font: "Arial", color: NAVY })]
    });
}
function h2(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 120 },
        children: [new TextRun({ text, bold: true, size: 26, font: "Arial", color: ACCENT })]
    });
}
function h3(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 },
        children: [new TextRun({ text, bold: true, size: 24, font: "Arial", color: NAVY })]
    });
}
function body(children, spacing = { before: 80, after: 120 }) {
    return new Paragraph({ children, spacing, alignment: AlignmentType.JUSTIFIED });
}
function bullet(text, level = 0) {
    return new Paragraph({
        numbering: { reference: "bullets", level },
        spacing: { before: 40, after: 60 },
        children: [new TextRun({ text, font: "Arial", size: 22 })]
    });
}
function infoBox(text, fill = LIGHT, border = ACCENT) {
    return new Table({
        width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
        rows: [new TableRow({
            children: [new TableCell({
                borders: cBdr(border), margins: { top: 120, bottom: 120, left: 160, right: 160 },
                shading: { fill, type: ShadingType.CLEAR },
                children: [new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    children: [new TextRun({ text, font: "Arial", size: 22, italics: true })]
                })]
            })]
        })]
    });
}
function tbl(headers, rows, cols) {
    const hr = new TableRow({
        tableHeader: true, children: headers.map((h, i) =>
            new TableCell({
                borders: cBdr(ACCENT), width: { size: cols[i], type: WidthType.DXA },
                margins: cm, shading: { fill: NAVY, type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", font: "Arial", size: 20 })] })]
            }))
    });
    const dr = rows.map((row, ri) => new TableRow({
        children: row.map((c, ci) =>
            new TableCell({
                borders: cBdr(), width: { size: cols[ci], type: WidthType.DXA },
                margins: cm, shading: { fill: ri % 2 === 0 ? "FFFFFF" : LGRAY, type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: String(c), font: "Arial", size: 20 })] })]
            }))
    }));
    return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: cols, rows: [hr, ...dr] });
}
function img(path, w, h) {
    const data = fs.readFileSync(path);
    return new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 },
        children: [new ImageRun({ data, transformation: { width: w, height: h }, type: "png" })]
    });
}
function figCaption(text) {
    return new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { before: 40, after: 160 },
        children: [new TextRun({ text, font: "Arial", size: 18, italics: true, color: ACCENT })]
    });
}

// ── Document build ────────────────────────────────────────────────────────────
const D = "/home/claude/diagrams";

const doc = new Document({
    numbering: {
        config: [{
            reference: "bullets",
            levels: [
                {
                    level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
                    style: { paragraph: { indent: { left: 720, hanging: 360 } } }
                },
                {
                    level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT,
                    style: { paragraph: { indent: { left: 1080, hanging: 360 } } }
                },
            ]
        }]
    },
    styles: {
        default: { document: { run: { font: "Arial", size: 22 } } },
        paragraphStyles: [
            {
                id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: 32, bold: true, font: "Arial", color: NAVY },
                paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 }
            },
            {
                id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: 26, bold: true, font: "Arial", color: ACCENT },
                paragraph: { spacing: { before: 260, after: 120 }, outlineLevel: 1 }
            },
            {
                id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: 24, bold: true, font: "Arial", color: NAVY },
                paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 }
            },
        ]
    },
    sections: [{
        properties: {
            page: {
                size: { width: 11906, height: 16838 },
                margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
            }
        },
        footers: {
            default: new Footer({
                children: [
                    new Paragraph({
                        alignment: AlignmentType.CENTER, children: [
                            t("Human-AI Collaborative Security Intervention Framework  |  MPhil Literature Review  |  Page "),
                            new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18 }),
                        ]
                    })
                ]
            })
        },
        children: [

            // ── COVER ──────────────────────────────────────────────────────────────
            new Paragraph({
                alignment: AlignmentType.CENTER, spacing: { before: 480, after: 80 },
                children: [new TextRun({
                    text: "MPhil Research in Cybersecurity — Design Science Research",
                    font: "Arial", size: 24, color: ACCENT
                })]
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 },
                children: [new TextRun({ text: "Literature Review", font: "Arial", size: 56, bold: true, color: NAVY })]
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER, spacing: { before: 60, after: 200 },
                children: [new TextRun({
                    text: "A Human-AI Collaborative Security Intervention Framework\nfor Mitigating Vulnerability Degradation in Iterative LLM-Assisted Code Refinement",
                    font: "Arial", size: 28, italics: true, color: ACCENT
                })]
            }),
            new Paragraph({
                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 1 } },
                spacing: { before: 0, after: 200 }, children: [t("")]
            }),
            tbl(["Field", "Detail"],
                [["Candidate", "[Your Name]"], ["Programme", "MPhil in Cybersecurity"],
                ["Supervisor", "[Supervisor Name]"], ["Institution", "[Your University]"],
                ["Total Papers Reviewed", "35+ (enhanced from original 28)"],
                ["Themes", "6 (expanded from 5)"],
                ["Date", new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })],
                ["Version", "2.0 — Enhanced with diagrams, Themes 6 (Regulatory) and multi-agent section"]],
                [2800, CW - 2800]),
            sp(), sp(),

            // ── 1. INTRODUCTION ────────────────────────────────────────────────────
            h1("1.  Introduction"),
            body([t(
                "The integration of Large Language Models (LLMs) into software development has fundamentally " +
                "reshaped how code is written, reviewed, and iteratively refined. Tools such as GitHub Copilot, " +
                "ChatGPT, and Claude are now used by over 80% of developers in their daily workflows (GitHub, 2024). " +
                "While these tools offer significant productivity gains, the security implications of their use — " +
                "particularly within iterative, conversational development loops — remain critically underexplored."
            )]),
            sp(),
            body([t(
                "The most pressing challenge is not merely that AI-generated code contains vulnerabilities in " +
                "isolation, but that these vulnerabilities compound and accumulate as developers engage in " +
                "multi-turn refinement cycles. Shukla, Joshi, and Syed (2025) provide the first systematic " +
                "empirical evidence of this phenomenon — termed 'feedback loop security degradation' — " +
                "demonstrating a 37.6% increase in critical vulnerabilities after just five iterations of " +
                "LLM-assisted code refinement without human intervention. Their findings challenge the " +
                "foundational assumption that iterative AI refinement improves code quality and highlight an " +
                "urgent need for structured human oversight mechanisms."
            )]),
            sp(),
            body([t(
                "This literature review maps the current state of knowledge across six interconnected themes " +
                "and establishes the scholarly basis for a Design Science Research (DSR) artefact — a " +
                "Human-AI Collaborative Security Intervention Framework — that fills a critical and confirmed gap. " +
                "The review is structured as follows: Section 2 grounds the study in DSR methodology; Section 3 " +
                "examines empirical evidence on security vulnerabilities in AI-generated code; Section 4 reviews " +
                "human-AI collaboration models; Section 5 analyses automation bias and developer trust; Section 6 " +
                "evaluates existing HITL and security frameworks; Section 7 addresses regulatory and governance " +
                "context; and Section 8 synthesises all themes and identifies the research gap."
            )]),
            sp(),
            infoBox(
                "Central Research Gap: No designed, evaluated artefact exists that operationalises human-AI " +
                "collaboration to mitigate security degradation specifically within iterative LLM-assisted code " +
                "refinement workflows. This review confirms this gap across six independent literature streams " +
                "and positions the proposed DSR artefact as the first to address it."
            ),
            sp(),
            img(`${D}/fig1_feedback_loop.png`, 620, 235),
            figCaption("Figure 1: The Feedback Loop Security Degradation Phenomenon (Shukla et al., 2025)"),
            sp(),

            // ── 2. DSR METHODOLOGY ─────────────────────────────────────────────────
            new Paragraph({ children: [new PageBreak()] }),
            h1("2.  Design Science Research as the Methodological Lens"),
            body([t(
                "Design Science Research (DSR) is a well-established research paradigm in Information Systems " +
                "that seeks to extend human and organisational capabilities through the creation and evaluation " +
                "of innovative artefacts (Hevner et al., 2004). Rather than seeking to explain or predict " +
                "phenomena, DSR aims to prescribe solutions — producing constructs, models, methods, or " +
                "instantiations that address real-world problems with rigour and relevance. For a study seeking " +
                "to design a framework that mitigates security degradation in AI-assisted development, DSR is " +
                "the most appropriate methodological fit."
            )]),
            sp(),
            body([t(
                "The most widely adopted DSR process model is that of Peffers et al. (2007), which defines " +
                "six phases: problem identification and motivation, definition of objectives, design and " +
                "development, demonstration, evaluation, and communication. This model has guided dozens of " +
                "cybersecurity-specific DSR studies. Alexei (2022) employed the Peffers model to develop a " +
                "cybersecurity framework for Higher Education Institutions in Moldova. A HICSS-57 study (2024) " +
                "used DSR iterations to derive design principles for a cybersecurity readiness assessment tool, " +
                "using the FEDS evaluation framework to rigorously validate the resulting artefact across " +
                "multiple cycles."
            )]),
            sp(),
            body([t(
                "A critical dimension of DSR is artefact evaluation. Hevner et al. (2004) identify seven " +
                "guidelines for DSR, with evaluation being among the most demanding. Venable et al. (2012) " +
                "extend this with a comprehensive framework distinguishing formative from summative evaluation, " +
                "and naturalistic from artificial contexts. Pastor et al. (2024) further propose a dual-cycle " +
                "DSR model distinguishing the design cycle from the empirical validation cycle. Chan (2026) " +
                "introduces the SHAPR framework — operationalising human-AI collaborative research through " +
                "structured DSR in AI-assisted development environments, directly mapping Action Design " +
                "Research principles onto AI-augmented workflows."
            )]),
            sp(),
            img(`${D}/fig2_dsr_process.png`, 640, 278),
            figCaption("Figure 2: DSR Process Model (Peffers et al., 2007) Mapped to This Research"),
            sp(),

            // ── 3. AI CODE SECURITY ────────────────────────────────────────────────
            new Paragraph({ children: [new PageBreak()] }),
            h1("3.  Security Vulnerabilities in AI-Generated Code"),
            h2("3.1  Foundational Evidence of Vulnerability Introduction"),
            body([t(
                "The empirical study of security vulnerabilities in AI-generated code has grown substantially " +
                "since 2022. Pearce et al. (2022) conducted one of the earliest and most influential evaluations, " +
                "examining approximately 1,689 programs generated by GitHub Copilot across 89 scenarios covering " +
                "18 Common Weakness Enumeration (CWE) categories. Their findings revealed that roughly 40% of " +
                "generated programs contained security vulnerabilities, with particularly elevated rates in C " +
                "code (approximately 50%) compared to Python (approximately 39%). This study established the " +
                "critical baseline that LLMs do not inherently produce secure code — and that vulnerability " +
                "patterns are language-dependent."
            )]),
            sp(),
            body([t(
                "Perry et al. (2023) expanded on this through a controlled user study showing that participants " +
                "using AI tools produced significantly less secure code while simultaneously rating their own " +
                "code as more secure — a dynamic the authors term a 'false sense of security.' Majdinasab et al. " +
                "(2024) replicated Pearce et al.'s Copilot study at IEEE SANER, confirming elevated vulnerability " +
                "rates in more recent model versions. A comprehensive systematic review by Negri-Ribalta et al. " +
                "(2024), synthesising 19 studies, confirmed broad scholarly consensus: AI models do not produce " +
                "safe code despite mitigation efforts. The CSET (2024) similarly found that almost half of " +
                "AI-generated code in studied repositories contained exploitable vulnerabilities. Blain and " +
                "Noiseux (2026), using formal verification via Z3 SMT solver across 3,500 code artefacts from " +
                "seven LLMs, concluded that AI-generated code is 'broken by default' in security-critical domains."
            )]),
            sp(),
            h2("3.2  Iterative Refinement and Security Degradation"),
            body([t(
                "Shukla, Joshi, and Syed (2025) provide the most systematic treatment of the iterative " +
                "refinement problem to date. In a controlled experiment with 400 code samples across 40 rounds — " +
                "employing four prompting strategies (efficiency-focused, feature-focused, security-focused, " +
                "and ambiguous) — they document a clear non-linear accumulation of vulnerabilities. Average " +
                "vulnerability counts per sample rose from 2.1 in early iterations to 6.2 by iterations 8–10, " +
                "with statistically significant differences confirmed by repeated-measures ANOVA (F(9,90) = 14.32, " +
                "p < 0.001, η² = 0.42). Code complexity was found to be a significant predictor of vulnerability " +
                "count (β = 0.64, p < 0.001). Crucially, the study deliberately excluded human intervention — " +
                "explicitly framing this as a worst-case scenario and calling for future research on human-AI " +
                "collaborative mitigation approaches."
            )]),
            sp(),
            body([t(
                "Liu et al. (2024) similarly observed that the refinement process could introduce new issues. " +
                "Mohsin et al. (2025) introduced CodingCare, a security framework integrating prompt libraries " +
                "and vulnerability databases, demonstrating reduced CVE counts. Wang et al. (2024), using the " +
                "CodeSecEval benchmark, found that while advanced models benefit from vulnerability hints, they " +
                "remain prone to insecure outputs across a wide range of CWE categories."
            )]),
            sp(),
            h2("3.3  Multi-Agent and Automated Repair Approaches"),
            body([t(
                "An emerging parallel literature addresses automated multi-agent approaches to secure code " +
                "generation. AutoSafeCoder (Alqarni et al., 2024) proposes a multi-agent framework with three " +
                "collaborating agents — a Coding Agent, Static Analyzer Agent, and Fuzzing Agent — that " +
                "iteratively refine code for both functional correctness and security. Similarly, RAG-assisted " +
                "secure code generation frameworks (arXiv:2601.00509) integrate compiler diagnostics, symbolic " +
                "execution, and static analysis into self-repair workflows, finding that the most successful " +
                "approaches are tool-augmented rather than purely prompt-driven."
            )]),
            sp(),
            body([t(
                "These automated approaches represent an important contrast to the framework proposed in this " +
                "research. While they improve security in automated settings, they do not account for the " +
                "human cognitive and sociotechnical dimensions that determine whether security interventions " +
                "are adopted and sustained in real development teams. A purely automated pipeline cannot " +
                "address automation bias, role-differentiated accountability, or the governance requirements " +
                "of the EU AI Act — dimensions that require structured human involvement by design."
            )]),
            sp(),

            // ── 4. HUMAN-AI COLLABORATION ──────────────────────────────────────────
            new Paragraph({ children: [new PageBreak()] }),
            h1("4.  Human-AI Collaboration in Software Development"),
            h2("4.1  Collaboration Models and Frameworks"),
            body([t(
                "The study of human-AI collaboration in software engineering has emerged as a distinct " +
                "research area. Hamza et al. (2023) examined how developers and AI systems collaborate across " +
                "coding, testing, and debugging tasks, identifying three conditions for effective collaboration: " +
                "clear role allocation, effective communication protocols, and balanced task distribution. " +
                "Fragiadakis et al. (2024) proposed a methodological framework for evaluating human-AI " +
                "collaboration encompassing task effectiveness, cognitive load, trust calibration, and " +
                "communication quality — criteria directly applicable to assessing whether a structured human " +
                "intervention model genuinely improves security outcomes."
            )]),
            sp(),
            body([t(
                "Cabrero-Daniel et al. (2024) found that the effectiveness of human-AI collaboration is " +
                "highly context-dependent — varying with team structure, task complexity, and the transparency " +
                "of AI outputs. Bobba (2025) proposes a taxonomic framework for human-AI collaboration modalities, " +
                "distinguishing along dimensions of autonomy, cognitive partnership, and task interdependence. " +
                "Abbasi et al. (2025) extend the collaboration lens to requirements engineering in AI-native " +
                "development environments, arguing that the division of epistemic labour between human and AI — " +
                "who knows what, and who is responsible for verifying it — is a fundamental and under-theorised " +
                "design challenge."
            )]),
            sp(),
            body([t(
                "Bridging expertise gaps research (arXiv:2505.03179, 2025) provides important empirical " +
                "grounding: a controlled mixed-methods user study of 58 participants found that human-AI " +
                "collaboration improves task performance in cybersecurity tasks, reducing false positives in " +
                "phishing detection and false negatives in intrusion detection. A learning effect was also " +
                "observed when participants transitioned from collaboration to independent work — suggesting " +
                "that well-designed HITL frameworks can support long-term skill development rather than " +
                "fostering dependency. This finding is particularly relevant for framework design: structured " +
                "intervention protocols should be designed not merely to catch vulnerabilities but to educate " +
                "developers about the patterns they encounter."
            )]),
            sp(),
            h2("4.2  Security-Specific Collaboration Frameworks"),
            body([t(
                "Mohsin et al. (2024) propose a Unified Framework for Human-AI Collaboration in Security " +
                "Operations Centres (SOCs) with Trusted Autonomy, defining four levels of automation (Levels 0–4) " +
                "and mapping SOC security functions to appropriate human-AI collaboration modalities at each level. " +
                "They integrate HITL mechanisms with cognitive modelling and situation awareness frameworks, " +
                "providing a precedent for principled autonomy allocation in security-sensitive contexts. While " +
                "focused on SOC operations rather than code development, this framework establishes design " +
                "principles transferable to the iterative code refinement context — particularly the notion of " +
                "threshold-triggered human intervention based on risk level."
            )]),
            sp(),

            // ── 5. AUTOMATION BIAS ─────────────────────────────────────────────────
            new Paragraph({ children: [new PageBreak()] }),
            h1("5.  Automation Bias and the Limits of Developer Trust"),
            body([t(
                "A critical but frequently underweighted dimension of human-AI collaboration in secure " +
                "development is automation bias — the tendency of individuals to over-rely on automated systems, " +
                "accepting their outputs without sufficient critical evaluation. In the context of AI-assisted " +
                "code development, automation bias has emerged as a structural risk that undermines the very " +
                "human oversight that security frameworks depend upon."
            )]),
            sp(),
            body([t(
                "Perry et al. (2023) provide the most direct evidence: developers using AI assistants not only " +
                "wrote less secure code but were more confident in its security. This confidence-competence " +
                "inversion is precisely the condition that makes iterative AI code refinement dangerous without " +
                "structured intervention — developers may approve increasingly complex and vulnerability-laden " +
                "code simply because it was produced by a system they trust."
            )]),
            sp(),
            body([t(
                "The CSET (2024) situates this within a broader analysis of automation bias across AI deployment " +
                "contexts. Horowitz and Kahn (2024), in a large-scale preregistered experiment across 9,000 " +
                "participants in nine countries, found that automation bias is moderated by domain knowledge — " +
                "those with deeper AI literacy are better calibrated in their trust. This finding suggests that " +
                "developer expertise is a meaningful moderator of security risk, with junior developers " +
                "potentially more susceptible to automation bias-induced vulnerability blind spots."
            )]),
            sp(),
            body([t(
                "Alebachew and Brown (2024), examining automatic bias detection in source code review, " +
                "demonstrate that biases are often invisible to those exhibiting them — reinforcing the case " +
                "for structural rather than purely educative mitigations. Industry data underscores the scale " +
                "of the problem: Sonar's 2026 State of Code Developer Survey found that 96% of developers " +
                "do not fully trust AI-generated code without manual intervention — yet nearly half report " +
                "that reviewing AI-generated code takes more effort than reviewing human-written code, with " +
                "38% stating they sometimes skip review due to this burden. This creates a paradox: developers " +
                "recognise the need for review but face cognitive and temporal barriers to executing it. " +
                "A structured intervention framework must therefore make review cognitively feasible and " +
                "efficiently targeted, not merely mandate it."
            )]),
            sp(),
            img(`${D}/fig3_automation_bias.png`, 520, 300),
            figCaption("Figure 3: The Automation Bias Cycle in AI-Assisted Code Development"),
            sp(),

            // ── 6. HITL AND FRAMEWORKS ─────────────────────────────────────────────
            new Paragraph({ children: [new PageBreak()] }),
            h1("6.  Human-in-the-Loop Approaches and Existing Security Frameworks"),
            h2("6.1  HITL Principles and Design"),
            body([t(
                "Human-in-the-Loop (HITL) is a design principle that places human decision-makers at key " +
                "points within automated systems. In cybersecurity and AI governance contexts, HITL has " +
                "emerged as a foundational safeguard — mandated by the EU AI Act (2024), which requires " +
                "meaningful human oversight for high-risk AI systems, and supported by the OWASP Top 10 for " +
                "LLM Applications, which identifies the absence of human oversight as a primary risk factor."
            )]),
            sp(),
            body([t(
                "HITL systems are characterised by three core components: an oversight mechanism that pauses " +
                "execution pending human input; a threshold trigger defining which outputs require human review; " +
                "and decision authority defining which tasks require human approval versus autonomous execution. " +
                "In iterative AI code refinement, these translate to: a structured review checkpoint mechanism, " +
                "iteration count or complexity-based triggers, and role-based authority defining which developer " +
                "levels are qualified to approve which categories of AI-generated code."
            )]),
            sp(),
            body([t(
                "Shukla et al. (2025) implicitly invoke HITL principles in their mitigation guidelines, " +
                "recommending mandatory developer review between iterations and a maximum of three consecutive " +
                "LLM-only iterations. However, these guidelines remain informal recommendations rather than a " +
                "designed, evaluable artefact — precisely the gap the proposed DSR framework addresses. " +
                "WitnessAI (2026) further notes that HITL workflows produce audit trails and support compliance " +
                "with the EU AI Act, positioning human oversight not merely as a security safeguard but as an " +
                "emerging regulatory requirement."
            )]),
            sp(),
            h2("6.2  Existing Security Frameworks and Their Limitations"),
            body([t(
                "Several security frameworks address portions of the problem space. Mohsin et al. (2025), in " +
                "the CodingCare framework, integrate prompt libraries, vulnerability databases, and programming " +
                "use-case repositories across the SDLC, demonstrating meaningful reductions in CVEs. However, " +
                "CodingCare is primarily a prompt engineering and static analysis framework — it does not address " +
                "iterative refinement dynamics or specify when and how human developers should intervene."
            )]),
            sp(),
            body([t(
                "Akinsanya (2025) proposes a risk-based framework for cybersecurity compliance and critical " +
                "infrastructure protection, employing security-by-design. Mohsin et al. (2024) provide the " +
                "closest structural analogue in their SOC collaboration framework. AutoSafeCoder (2024) and " +
                "RAG-assisted repair frameworks represent fully automated alternatives that demonstrate the " +
                "ceiling of what automation can achieve without human governance structures. An important " +
                "cross-cutting limitation of all existing frameworks is the absence of empirical validation " +
                "under iterative conditions — frameworks validated in non-iterative conditions may provide " +
                "inadequate protection in the iterative workflows that dominate real-world AI-assisted development."
            )]),
            sp(),

            // ── 7. REGULATORY ─────────────────────────────────────────────────────
            new Paragraph({ children: [new PageBreak()] }),
            h1("7.  Regulatory and Governance Context"),
            body([t(
                "An emerging regulatory and governance literature is reshaping the context within which " +
                "human oversight of AI-generated code must be understood. This theme was absent from earlier " +
                "versions of this review and represents a critical dimension for the proposed framework's " +
                "practical relevance and long-term adoption."
            )]),
            sp(),
            h2("7.1  The EU AI Act and Human Oversight Mandates"),
            body([t(
                "The European Union's AI Act (2024), the world's first comprehensive AI regulatory framework, " +
                "establishes mandatory human oversight requirements for high-risk AI systems under Article 14. " +
                "While AI coding assistants are not currently classified as high-risk, the Act's principles — " +
                "particularly around transparency, accountability, and meaningful human control — are shaping " +
                "organisational AI governance policies globally. Code generation in security-critical domains " +
                "such as financial services, healthcare, and critical infrastructure may fall within high-risk " +
                "classifications, making HITL frameworks a compliance requirement rather than merely a best " +
                "practice. WitnessAI (2026) confirms that HITL workflows that generate audit trails are " +
                "emerging as a practical compliance mechanism under the Act."
            )]),
            sp(),
            h2("7.2  OWASP LLM Top 10 and Developer Standards"),
            body([t(
                "The OWASP Top 10 for LLM Applications identifies the absence of human oversight as a primary " +
                "risk factor in LLM deployments, specifically flagging over-reliance on LLM outputs without " +
                "human validation as a top-tier vulnerability. This standard is already being adopted by " +
                "security-conscious organisations as a code review checklist — providing an institutional " +
                "adoption pathway for a framework that operationalises HITL in LLM-assisted development. " +
                "The proposed framework can be designed to explicitly align with OWASP LLM Top 10 mitigation " +
                "recommendations, increasing its practical uptake."
            )]),
            sp(),
            h2("7.3  NIST AI Risk Management Framework and SLSA"),
            body([t(
                "The NIST AI Risk Management Framework (AI RMF, 2023) provides a structured approach to " +
                "managing AI-related risks across the full AI lifecycle, with 'Govern', 'Map', 'Measure', and " +
                "'Manage' functions that directly map onto framework design requirements. The Supply-chain " +
                "Levels for Software Artifacts (SLSA) framework, backed by Google and adopted by the Linux " +
                "Foundation, establishes provenance and integrity requirements for software supply chains — " +
                "requirements that become increasingly difficult to satisfy when AI-generated code introduces " +
                "supply chain vulnerabilities through iterative refinement. Aligning the proposed framework " +
                "with SLSA levels provides a concrete evaluation criterion beyond vulnerability counts."
            )]),
            sp(),
            h2("7.4  Veracode Industry Evidence"),
            body([t(
                "Veracode's 2025 GenAI Code Security Report provides alarming industry context: by June 2025, " +
                "AI-generated code was introducing over 10,000 new security findings per month across studied " +
                "repositories — a tenfold increase from December 2024. This acceleration confirms that the " +
                "academic literature's laboratory findings are manifesting at scale in production environments. " +
                "Gartner projects that 70% of professional developers will use AI coding assistants by 2027. " +
                "Without validated human oversight frameworks, the security risks documented across the " +
                "literature will continue to scale with adoption."
            )]),
            sp(),

            // ── 8. SYNTHESIS ──────────────────────────────────────────────────────
            new Paragraph({ children: [new PageBreak()] }),
            h1("8.  Synthesis and Research Gap"),
            h2("8.1  Thematic Convergence"),
            body([t(
                "The six themes reviewed above converge on a coherent and urgent research problem. Empirically, " +
                "AI-generated code is insecure in single-shot conditions and becomes increasingly insecure " +
                "through iterative refinement. Methodologically, DSR provides the appropriate paradigm for " +
                "designing and evaluating an artefact that addresses this problem. Sociotechnically, human-AI " +
                "collaboration in software development is both widespread and structurally under-governed. " +
                "Psychologically, automation bias systematically undermines the human oversight that security " +
                "depends upon. Structurally, existing HITL and security frameworks are not designed for " +
                "iterative refinement contexts. Regulatorily, emerging standards are creating institutional " +
                "pressure for validated HITL frameworks that this research is positioned to address."
            )]),
            sp(),
            img(`${D}/fig5_convergence.png`, 600, 300),
            figCaption("Figure 5: Thematic Convergence Towards the Proposed DSR Artefact"),
            sp(),
            h2("8.2  Three Design Requirements"),
            body([t(
                "The synthesis reveals three specific design requirements for the proposed framework:"
            )]),
            sp(),
            bullet("DR1 — Structured Intervention Trigger Criteria: Define not merely that human review is necessary, but when it must occur — iteration count thresholds, complexity increase triggers, supply chain CWE detection, and CVSS severity thresholds — grounded in the empirical findings of Shukla et al. (2025)."),
            bullet("DR2 — Role-Differentiated Review Protocols: Define who reviews what, based on developer experience level and vulnerability category — addressing the expertise moderation effect documented by Horowitz and Kahn (2024) and the epistemic labour division question raised by Abbasi et al. (2025)."),
            bullet("DR3 — Cognitive Feasibility of Review Process: Counter automation bias by designing review processes that are targeted rather than comprehensive, AI-summarised rather than raw, and time-bounded rather than open-ended — addressing the review burden paradox documented by Sonar (2026)."),
            sp(),
            img(`${D}/fig6_design_reqs.png`, 600, 275),
            figCaption("Figure 6: Three Core Design Requirements for the Proposed Framework"),
            sp(),
            h2("8.3  The Research Gap"),
            sp(),
            infoBox(
                "Despite the convergence of evidence across six independent literature streams, a critical gap " +
                "persists: no designed, evaluated artefact exists that operationalises human-AI collaboration " +
                "to mitigate security degradation specifically within iterative LLM-assisted code refinement " +
                "workflows. Shukla et al. (2025) call for future research on HITL practices but stop short of " +
                "designing or evaluating such a system. Existing HITL frameworks are not adapted for code " +
                "refinement contexts. Existing code security frameworks do not address iterative dynamics. " +
                "Automated multi-agent approaches bypass human governance entirely. This is the gap this " +
                "research addresses.",
                LGREEN, GREEN
            ),
            sp(),
            img(`${D}/fig4_gap_map.png`, 600, 336),
            figCaption("Figure 4: Research Gap Positioning Map — Prior Work vs This Research"),
            sp(),
            h2("8.4  Synthesis Matrix"),
            body([t("Table 1 maps the key papers reviewed against all six themes, illustrating convergence and gaps.", { italics: true })]),
            sp(),
            tbl(
                ["Paper", "Year", "DSR", "AI Code\nSecurity", "Human-AI\nCollab", "Automation\nBias", "HITL /\nFramework", "Regulatory"],
                [
                    ["Peffers et al.", "2007", "✓✓", "", "", "", "", ""],
                    ["Hevner et al.", "2004", "✓✓", "", "", "", "", ""],
                    ["Alexei", "2022", "✓", "", "", "", "", ""],
                    ["Pearce et al.", "2022", "", "✓✓", "", "", "", ""],
                    ["Siddiq & Santos", "2022", "", "✓", "", "", "", ""],
                    ["Perry et al.", "2023", "", "✓✓", "", "✓✓", "", ""],
                    ["Tony et al.", "2023", "", "✓", "", "", "", ""],
                    ["Hamza et al.", "2023", "", "", "✓✓", "", "", ""],
                    ["Negri-Ribalta et al.", "2024", "", "✓✓", "", "", "", ""],
                    ["Chong et al.", "2024", "", "✓", "", "", "", ""],
                    ["Majdinasab et al.", "2024", "", "✓", "", "", "", ""],
                    ["Liu et al.", "2024", "", "✓", "", "", "", ""],
                    ["CSET", "2024", "", "✓", "", "✓✓", "", "✓"],
                    ["Wang et al.", "2024", "", "✓✓", "", "", "", ""],
                    ["Fragiadakis et al.", "2024", "", "", "✓✓", "", "", ""],
                    ["Cabrero-Daniel et al.", "2024", "", "", "✓", "", "", ""],
                    ["Mohsin et al. (SOC)", "2024", "", "", "✓", "", "✓✓", ""],
                    ["Horowitz & Kahn", "2024", "", "", "", "✓✓", "", ""],
                    ["HICSS-57 Study", "2024", "✓", "", "", "", "✓", ""],
                    ["EU AI Act", "2024", "", "", "", "", "", "✓✓"],
                    ["AutoSafeCoder", "2024", "", "✓", "", "", "✓", ""],
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
                ],
                [2400, 700, 700, 900, 900, 900, 900, 900]
            ),
            sp(), sp(),

            // ── 9. CONCLUSION ──────────────────────────────────────────────────────
            new Paragraph({ children: [new PageBreak()] }),
            h1("9.  Conclusion"),
            body([t(
                "This literature review has mapped the scholarly landscape across six interconnected themes " +
                "to establish the foundations for a novel DSR artefact targeting a critical and underaddressed " +
                "problem. The evidence is unambiguous: AI-generated code is insecure, iterative refinement " +
                "compounds that insecurity non-linearly, human oversight is necessary but structurally " +
                "undermined by automation bias, existing frameworks do not address iterative dynamics, " +
                "and regulatory pressure is creating institutional demand for validated HITL solutions."
            )]),
            sp(),
            body([t(
                "The proposed Human-AI Collaborative Security Intervention Framework will address this gap " +
                "through the DSR process model of Peffers et al. (2007), designing structured intervention " +
                "trigger criteria, role-differentiated review protocols, and cognitive-load-aware review " +
                "processes within iterative LLM-assisted code development workflows. Its evaluation will be " +
                "grounded in the experimental methodology established by Shukla et al. (2025), measuring " +
                "vulnerability accumulation with and without the framework across multi-iteration controlled " +
                "conditions. The framework will be aligned with the EU AI Act Article 14, OWASP LLM Top 10, " +
                "NIST AI RMF, and SLSA supply chain standards — positioning it for both academic contribution " +
                "and practical adoption."
            )]),
            sp(),
            body([t(
                "As Gartner projects that 70% of developers will use AI coding assistants by 2027, and as " +
                "Veracode documents a tenfold increase in AI-introduced vulnerabilities in a single year, " +
                "the absence of validated human oversight frameworks represents an escalating organisational " +
                "and societal risk. This research is designed to fill that gap with theoretical rigour, " +
                "empirical grounding, and practical deployability."
            )]),
            sp(), sp(),

            // ── REFERENCES ─────────────────────────────────────────────────────────
            new Paragraph({ children: [new PageBreak()] }),
            h1("References"),
            body([t("Abbasi, M. A., et al. (2025). Reconsidering requirements engineering: Human-AI collaboration in AI-native software development. arXiv:2510.04380.")]),
            body([t("Akinsanya, A. (2025). Security by design: A risk-based framework for cybersecurity compliance and critical infrastructure protection. International Journal of Information Security. https://doi.org/10.1007/s10207-025-01155-4")]),
            body([t("Alebachew, Y. B., & Brown, C. (2024). Automatic bias detection in source code review. arXiv:2504.18449.")]),
            body([t("Alexei, A. (2022). Implementing Design Science Research Method to develop a cyber security framework for HEIs in Moldova. Proceedings of IC|ECCO-2021.")]),
            body([t("Alqarni, A., et al. (2024). AutoSafeCoder: A multi-agent framework for securing LLM code generation through static analysis and fuzz testing. arXiv:2409.10737.")]),
            body([t("Blain, D., & Noiseux, M. (2026). Broken by default: A formal verification study of security vulnerabilities in AI-generated code. arXiv:2604.05292.")]),
            body([t("Bobba, A. R. (2025). The evolution of cognitive partnership: A taxonomic framework for human-AI collaboration modalities. Journal of Computer Science and Technology Studies, 7(8), 992–1005.")]),
            body([t("Cabrero-Daniel, B., Herda, T., Pichler, V., & Eder, M. (2024). Exploring human-AI collaboration in agile: Customised LLM meeting assistants. XP Conference. Springer.")]),
            body([t("Center for Security and Emerging Technology (CSET). (2024). Cybersecurity risks of AI-generated code. Georgetown University. https://doi.org/10.51593/20230057")]),
            body([t("Chan, A. (2026). SHAPR: Operationalising human-AI collaborative research through structured knowledge generation. arXiv:2603.25660.")]),
            body([t("Chong, C. J., Yao, Z., & Neamtiu, I. (2024). Artificial-intelligence generated code considered harmful. arXiv:2409.19182.")]),
            body([t("EU AI Act. (2024). Regulation of the European Parliament and of the Council laying down harmonised rules on artificial intelligence.")]),
            body([t("Fragiadakis, G., Diou, C., Kousiouris, G., & Nikolaidou, M. (2024). Evaluating human-AI collaboration: A review and methodological framework. arXiv:2407.19098.")]),
            body([t("GitHub. (2024). Survey reveals AI's impact on the developer experience. GitHub Blog.")]),
            body([t("Hamza, M., Siemon, D., Akbar, M. A., & Rahman, T. (2023). Human-AI collaboration in software engineering. arXiv:2312.10620.")]),
            body([t("Hevner, A. R., March, S. T., Park, J., & Ram, S. (2004). Design science in information systems research. MIS Quarterly, 28(1), 75–105.")]),
            body([t("HICSS-57. (2024). Deriving design principles from the design journey of a cybersecurity readiness assessment tool.")]),
            body([t("Horowitz, M. C., & Kahn, L. (2024). Bending the automation bias curve. International Studies Quarterly, 68(2).")]),
            body([t("Liu, Y., Le-Cong, T., Widyasari, R., Lo, D., Tao, M., & Han, S. (2024). Refining ChatGPT-generated code. ACM TOSEM.")]),
            body([t("Majdinasab, V., et al. (2024). Assessing the security of GitHub Copilot's generated code: A targeted replication study. IEEE SANER 2024.")]),
            body([t("Mohsin, A., Janicke, H., Ibrahim, A., Sarker, I. H., & Camtepe, S. (2024). A unified framework for human-AI collaboration in security operations centers. arXiv:2505.23397.")]),
            body([t("Mohsin, A., et al. (2025). CodingCare: AI code generation security framework. ACM ISCCN 2025.")]),
            body([t("Negri-Ribalta, C., et al. (2024). A systematic literature review on the impact of AI models on the security of code generation. Frontiers in Big Data, 7.")]),
            body([t("NIST. (2023). AI Risk Management Framework (AI RMF 1.0). National Institute of Standards and Technology.")]),
            body([t("OWASP. (2024). OWASP Top 10 for Large Language Model Applications. OWASP Foundation.")]),
            body([t("Pastor, et al. (2024). Dual-cycle DSR model. Information Systems Journal.")]),
            body([t("Pearce, H., Ahmad, B., Tan, B., Dolan-Gavitt, B., & Karri, R. (2022). Asleep at the keyboard? IEEE S&P, 754–768.")]),
            body([t("Peffers, K., Tuunanen, T., Rothenberger, M. A., & Chatterjee, S. (2007). A design science research methodology. Journal of Management Information Systems, 24(3), 45–77.")]),
            body([t("Perry, N., Srivastava, M., Kumar, D., & Boneh, D. (2023). Do users write more insecure code with AI assistants? ACM CCS 2023.")]),
            body([t("Shukla, S., Joshi, H., & Syed, R. (2025). Security degradation in iterative AI code generation. IEEE-ISTAS 2025. arXiv:2506.11022.")]),
            body([t("Siddiq, M. L., & Santos, J. C. (2022). SecurityEval dataset. MSR4P&S 2022.")]),
            body([t("Sonar. (2026). State of code: Developer survey 2026.")]),
            body([t("Tariq, S., et al. (2025). Bridging expertise gaps: The role of LLMs in human-AI collaboration for cybersecurity. arXiv:2505.03179.")]),
            body([t("Tony, C., et al. (2023). LLMSecEval. IEEE/ACM MSR 2023.")]),
            body([t("Venable, J. R., Pries-Heje, J., & Baskerville, R. (2012). A comprehensive framework for evaluation in design science research. DESRIST 2012.")]),
            body([t("Veracode. (2025). 2025 GenAI code security report. Veracode Research.")]),
            body([t("Wang, Y., et al. (2024). Is your AI-generated code really secure? CodeSecEval. arXiv:2407.02395.")]),
            body([t("WitnessAI. (2026). Human-in-the-loop AI: Benefits, use cases, and best practices.")]),
            body([t("arXiv:2601.00509. (2025). Improving LLM-assisted secure code generation through RAG and multi-tool feedback.")]),
            sp(),

        ]
    }]
});

Packer.toBuffer(doc).then(buf => {
    fs.writeFileSync("./DSR_Literature_Review_v2.docx", buf);
    console.log("Done.....");
});