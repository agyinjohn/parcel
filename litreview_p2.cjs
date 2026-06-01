'use strict';
const base = require('./litreview.cjs');
const {
    children, h1, h2, h3, h4,
    body, bodyNI, bodyB, bullet, sp, hr, pageBreak, fig,
    run, runB, runI, centered
} = base;

// ═════════════════════════════════════════════════════════════════════════════
// ABSTRACT — unnumbered, before Section 1
// ═════════════════════════════════════════════════════════════════════════════

children.push(new base.Paragraph({
    spacing: { before: 0, after: 200 },
    children: [new base.TextRun({
        text: 'Abstract',
        font: 'Times New Roman', size: 36, bold: true, color: base.BLACK
    })]
}));
children.push(body(
    'The integration of large language model (LLM) code generation tools into software development ' +
    'workflows has introduced a significant and underexplored security risk: the non-linear ' +
    'accumulation of vulnerabilities through iterative, conversational code refinement. Empirical ' +
    'evidence demonstrates that unmediated LLM-assisted refinement produces a 37.6% increase in ' +
    'critical vulnerabilities across just five iterations, a phenomenon termed feedback loop ' +
    'security degradation. Despite this, no study has investigated this degradation in realistic ' +
    'human-AI collaborative settings, no multi-model comparison exists under iterative conditions, ' +
    'no study has mapped iterative refinement to supply chain CWE patterns, and no evaluated ' +
    'end-to-end mitigation pipeline exists for the iterative context.'
));
children.push(body(
    'This literature review synthesises 42 peer-reviewed papers, empirical studies, systematic ' +
    'reviews, and industry reports across six thematic clusters to establish the scholarly ' +
    'foundations for the SecureLoop research project. The review maps the existing state of ' +
    'knowledge, identifies four confirmed research gap dimensions, derives four research questions, ' +
    'and establishes the theoretical framework grounding the SecureLoop artifact. The artifact ' +
    'combines Security-Anchored Prompting with Automated Vulnerability Checkpointing within the ' +
    'iterative loop, evaluated across Claude, GPT-4o, and GitHub Copilot using the experimental ' +
    'methodology of Shukla, Joshi, and Syed (2025).'
));
children.push(body(
    'The review confirms that the entire mitigation literature was designed before the iterative ' +
    'degradation phenomenon was empirically documented and has not been re-evaluated against it. ' +
    'The supply chain dimension is real and demonstrated but entirely unstudied in iterative ' +
    'contexts. The annotated iterative code sample dataset produced as a byproduct of this ' +
    'research will itself be a community resource that does not currently exist anywhere in ' +
    'the literature.'
));
children.push(new base.Paragraph({
    spacing: { before: 80, after: 200 },
    children: [
        new base.TextRun({ text: 'Keywords: ', font: 'Times New Roman', size: 24, bold: true, color: base.BLACK }),
        new base.TextRun({ text: 'LLM security, iterative code refinement, human-in-the-loop, feedback loop security degradation, AI-assisted development, vulnerability accumulation, supply chain risk, SecureLoop', font: 'Times New Roman', size: 24, italics: true, color: base.DGRAY })
    ]
}));
children.push(pageBreak());

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1 — INTRODUCTION
// ═════════════════════════════════════════════════════════════════════════════

children.push(h1('1.  Introduction'));

// ── 1.1 Purpose of the Review ─────────────────────────────────────────────────
children.push(h2('1.1  Purpose of the Review'));
children.push(body(
    'This literature review synthesises 42 peer-reviewed papers, empirical studies, systematic ' +
    'reviews, and industry reports across the field of AI-assisted code generation security. It is ' +
    'organised thematically to map the existing state of knowledge, identify the specific research ' +
    'gaps this MPhil project addresses, and establish the theoretical and empirical foundations for ' +
    'the SecureLoop artifact.'
));
children.push(body(
    'The review serves four purposes: to establish the baseline empirical record on AI-generated ' +
    'code vulnerability rates; to characterise what is known about iterative feedback loop security ' +
    'dynamics; to survey existing mitigation approaches and their limitations; and to establish the ' +
    'software supply chain risk dimension of AI-generated code. The review concludes by synthesising ' +
    'the four confirmed research gaps and the research questions that the SecureLoop project will address.'
));
children.push(body(
    'The review is organised across six thematic clusters. Each theme opens with an overview, ' +
    'followed by structured individual paper reviews, and closes with a thematic discussion that ' +
    'draws out the binding limitations and contributions of that cluster. Section 8 synthesises ' +
    'across all six themes to identify convergences, contradictions, and confirmed gaps. Sections ' +
    '9 through 11 state the research gap, research questions, and theoretical framework. Section ' +
    '12 concludes.'
));

// ── 1.2 Background and Motivation ─────────────────────────────────────────────
children.push(h2('1.2  Background and Motivation'));
children.push(body(
    'The deployment of large language model (LLM) code generation tools, including GitHub Copilot, ' +
    'ChatGPT, and Claude, has fundamentally changed how software is written. Developers now routinely ' +
    'use these tools not only to generate initial code but to iteratively refine, extend, and debug ' +
    'it across multiple conversational turns. GitHub\'s 2024 developer survey found that over 80% of ' +
    'developers use AI coding assistants in their daily workflows, with a significant proportion ' +
    'relying on multi-turn iterative refinement rather than single-shot generation.'
));
children.push(body(
    'This shift from one-shot generation to iterative human-AI collaboration has created a research ' +
    'blind spot. While foundational studies have characterised vulnerability rates in single-turn AI ' +
    'code generation, establishing that approximately 40 to 65 percent of AI-generated code contains ' +
    'security vulnerabilities depending on language and model, nobody has systematically investigated ' +
    'what happens to security properties when code passes through multiple rounds of iterative ' +
    'refinement with a human making decisions at each step.'
));
children.push(body(
    'The importance of this gap is made concrete by the IEEE-ISTAS 2025 study by Shukla, Joshi, and ' +
    'Syed, which found a 37.6% increase in critical vulnerabilities after just five iterations of ' +
    'automated LLM refinement using GPT-4o. That study used automated loops without human intervention ' +
    'and tested only C and Java. Its authors explicitly identified human-in-the-loop behaviour, ' +
    'multi-model comparison, and Python language coverage as the three priority directions for future ' +
    'work. This MPhil project is that future work, extended further to include supply chain risk ' +
    'analysis and an end-to-end mitigation artifact called SecureLoop.'
));
children.push(body(
    'The practical stakes are significant. Veracode\'s 2025 GenAI Code Security Report documented ' +
    'over 10,000 new AI-introduced security findings per month across studied repositories by June ' +
    '2025, a tenfold increase from December 2024. Gartner projects that 70% of professional ' +
    'developers will use AI coding assistants by 2027. The Georgetown CSET policy brief found that ' +
    'almost 50% of AI-generated code contains exploitable bugs. Without validated human oversight ' +
    'frameworks specifically designed for iterative refinement workflows, these risks will continue ' +
    'to scale with adoption.'
));

children.push(...sp(1));
children.push(...fig('fig1_feedback_loop.png',
    'Figure 1: The Feedback Loop Security Degradation Phenomenon (Shukla et al., 2025)'));
children.push(...sp(1));

// ── 1.3 Central Research Gap ──────────────────────────────────────────────────
children.push(h2('1.3  Central Research Gap'));
children.push(body(
    'While extensive research has characterised vulnerabilities in one-shot AI code generation, no ' +
    'study has investigated security degradation in realistic human-AI collaborative iterative ' +
    'refinement across multiple LLMs with supply chain risk analysis. This review maps what has been ' +
    'done and precisely where this research begins.'
));
children.push(body(
    'The gap has four confirmed dimensions. First, every iterative study to date has used automated ' +
    'LLM-only loops without human intervention, leaving the effect of human decision-making on ' +
    'degradation trajectories entirely unknown. Second, iterative security degradation has been ' +
    'characterised for GPT-4o only, with no multi-model comparison under controlled iterative ' +
    'conditions. Third, no study has investigated whether iterative refinement disproportionately ' +
    'produces CWEs associated with software supply chain attacks or amplifies package hallucination ' +
    'rates. Fourth, no end-to-end mitigation pipeline combining secure prompting with automated ' +
    'scanning within an iterative loop has been built and evaluated.'
));
children.push(body(
    'These four dimensions are not independent observations but a coherent and confirmed gap that ' +
    'emerges from the convergence of six literature streams reviewed in this document. Each stream ' +
    'independently points to the same absence: a designed, evaluated artifact that operationalises ' +
    'human-AI collaboration to mitigate security degradation within iterative LLM-assisted code ' +
    'refinement workflows.'
));

children.push(pageBreak());

module.exports = base;
