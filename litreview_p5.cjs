'use strict';
const base = require('./litreview_p4.cjs');
const { children, h1, h2, h3, h4, body, bodyNI, bodyB, bullet, sp, hr, pageBreak, fig, run, runB, runI } = base;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 9 — RESEARCH GAP STATEMENT
// ═════════════════════════════════════════════════════════════════════════════

children.push(h1('9.  Research Gap Statement'));

children.push(body(
    'The six thematic clusters reviewed in this document collectively reveal one primary research ' +
    'gap with four specific and confirmed dimensions. The gap is not a matter of insufficient ' +
    'evidence or contested findings. It is a structural absence: a category of research that has ' +
    'not been conducted, a type of artifact that has not been built, and a set of empirical ' +
    'questions that have not been asked.'
));

children.push(h2('Primary Gap'));
children.push(body(
    'No study has investigated security degradation in realistic human-AI collaborative iterative ' +
    'refinement across multiple LLMs with supply chain risk analysis, and no evaluated end-to-end ' +
    'mitigation pipeline exists for the iterative context. Every existing study either examines ' +
    'one-shot generation or uses automated LLM-only loops without human intervention. The entire ' +
    'mitigation literature was designed before the iterative degradation phenomenon was ' +
    'empirically documented and has not been re-evaluated against it.'
));

children.push(h2('Gap Dimension 1: Human-in-the-Loop Iterative Dynamics'));
children.push(body(
    'Every iterative study to date used automated LLM-only loops. The IEEE-ISTAS 2025 base paper ' +
    'explicitly states this as its primary limitation. Real development practice involves human ' +
    'decision-making at each refinement step, and Perry et al. (2023) demonstrated that developer ' +
    'psychology significantly modifies code security outcomes. No study has investigated how human ' +
    'decisions interact with iterative security degradation, whether structured intervention ' +
    'reduces the degradation trajectory, or whether automation bias neutralises the benefit of ' +
    'human oversight when vulnerabilities are not explicitly flagged.'
));

children.push(h2('Gap Dimension 2: Multi-Model Iterative Comparison'));
children.push(body(
    'Iterative security degradation has been characterised for GPT-4o only. No study has compared ' +
    'degradation trajectories across Claude, GitHub Copilot, or other models under controlled ' +
    'iterative conditions. Mohsin et al. (2024) demonstrated significant variation in security ' +
    'patterns across models in one-shot settings, making the assumption that GPT-4o findings ' +
    'generalise empirically unjustified. arXiv:2507.02976 (2025) found that Llama introduces ' +
    'unique vulnerability patterns absent in other models. The multi-model dimension is not a ' +
    'refinement of the base study but a necessary condition for any generalisable claim about ' +
    'iterative degradation.'
));

children.push(h2('Gap Dimension 3: Iterative Supply Chain CWE Mapping'));
children.push(body(
    'No study has investigated whether iterative refinement disproportionately produces CWEs ' +
    'associated with supply chain attacks or amplifies package hallucination rates as code ' +
    'complexity accumulates. Spracklen et al. (2025) established that hallucination rates are ' +
    'significant in one-shot generation at nearly 20% for Python. Li et al. (2025) established ' +
    'that LLM-specific supply chain threats extend beyond classical CWE categories. Whether ' +
    'iterative refinement amplifies these risks through accumulating complexity is entirely ' +
    'unknown and constitutes one of the most practically important unanswered questions in ' +
    'the field.'
));

children.push(h2('Gap Dimension 4: Evaluated Iterative Mitigation Artifact'));
children.push(body(
    'No end-to-end pipeline combining secure prompting with automated scanning within an ' +
    'iterative loop has been built and evaluated. FDSP (2025) achieved significant single-turn ' +
    'mitigation. Tony et al. (2024) established that security-anchored prompting works in ' +
    'single-turn settings. CodingCare (2025) demonstrated integrated detection and remediation ' +
    'but applied post-generation rather than within the loop. Shukla et al. (2025) provided ' +
    'informal mitigation guidelines but did not design or evaluate a structured artifact. ' +
    'The SecureLoop artifact is the first designed, evaluated response to this gap.'
));

children.push(...sp(1));
children.push(...fig('fig4_gap_map.png',
    'Figure 4: Research Gap Positioning Map — Prior Work vs This Research'));
children.push(...sp(1));

children.push(pageBreak());

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 10 — RESEARCH QUESTIONS
// ═════════════════════════════════════════════════════════════════════════════

children.push(h1('10.  Research Questions'));

children.push(body(
    'The four confirmed gap dimensions generate four research questions. Each question is ' +
    'directly traceable to at least two independent literature streams and is not answerable ' +
    'by extending or reanalysing existing studies without new empirical work.'
));
children.push(...sp(1));

children.push(h2('RQ1: Human-in-the-Loop Effect on Iterative Degradation'));
children.push(body(
    'How do security vulnerability rates change across iterations in realistic human-AI ' +
    'collaborative code refinement compared to automated LLM-only loops, and does structured ' +
    'human intervention with explicit vulnerability flagging modify the degradation trajectory?'
));
children.push(body(
    'This question addresses Gap Dimension 1. It requires a controlled experiment comparing ' +
    'human-in-the-loop iterative refinement against the automated baseline established by ' +
    'Shukla et al. (2025). The human condition will involve developers making explicit ' +
    'refinement decisions at each iteration with and without scanner-generated vulnerability ' +
    'reports, enabling isolation of the automation bias effect documented by Perry et al. (2023).'
));

children.push(h2('RQ2: Multi-Model Degradation Comparison'));
children.push(body(
    'Do different LLMs, specifically Claude, GPT-4o, and GitHub Copilot, degrade at ' +
    'significantly different rates under controlled iterative refinement conditions, and what ' +
    'model-specific vulnerability patterns emerge across iterations?'
));
children.push(body(
    'This question addresses Gap Dimension 2. It requires applying the same iterative ' +
    'refinement protocol across all three models under identical conditions, enabling direct ' +
    'comparison of degradation trajectories. The methodological foundation is the multi-model ' +
    'evaluation framework of Mohsin et al. (2024), extended from one-shot to iterative settings.'
));

children.push(h2('RQ3: Iterative Amplification of Supply Chain Risk'));
children.push(body(
    'Does iterative refinement disproportionately produce CWEs associated with software supply ' +
    'chain attacks, and does it amplify package hallucination rates relative to one-shot ' +
    'generation baselines established by Spracklen et al. (2025)?'
));
children.push(body(
    'This question addresses Gap Dimension 3. It requires mapping vulnerability outputs at ' +
    'each iteration to supply chain CWE categories and tracking package import hallucination ' +
    'rates across iterations. The Supply Chain Risk Analyser module in SecureLoop is designed ' +
    'specifically to collect this data as a byproduct of the iterative refinement experiments.'
));

children.push(h2('RQ4: SecureLoop Mitigation Effectiveness'));
children.push(body(
    'Does the SecureLoop artifact, combining Security-Anchored Prompting with Automated ' +
    'Vulnerability Checkpointing within the iterative loop, significantly reduce security ' +
    'degradation compared to unmitigated iterative refinement, and does it retain effectiveness ' +
    'across all three LLMs tested?'
));
children.push(body(
    'This question addresses Gap Dimension 4. It requires a controlled comparison of ' +
    'vulnerability accumulation trajectories with and without the SecureLoop artifact active ' +
    'across identical iterative refinement sessions. Statistical validation will follow the ' +
    'repeated-measures ANOVA methodology of Shukla et al. (2025) to enable direct comparison ' +
    'of effect sizes.'
));

children.push(pageBreak());

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 11 — THEORETICAL AND CONCEPTUAL FRAMEWORK
// ═════════════════════════════════════════════════════════════════════════════

children.push(h1('11.  Theoretical and Conceptual Framework'));

children.push(body(
    'The theoretical and conceptual framework for this research draws on three bodies of theory ' +
    'that together provide the explanatory and design foundations for the SecureLoop artifact: ' +
    'feedback loop theory applied to iterative code refinement, automation bias theory applied ' +
    'to developer trust in AI-generated code, and Design Science Research methodology applied ' +
    'to artifact construction and evaluation.'
));

children.push(h2('11.1  Feedback Loop Security Degradation Theory'));
children.push(body(
    'The central theoretical construct of this research is feedback loop security degradation, ' +
    'first empirically documented by Shukla et al. (2025). The theoretical mechanism operates ' +
    'as follows: each iteration of LLM-assisted code refinement introduces a probability of ' +
    'new vulnerability introduction that is a function of code complexity. As code complexity ' +
    'increases with each iteration, the probability of vulnerability introduction increases ' +
    'non-linearly. Vulnerabilities introduced in early iterations are not reliably detected or ' +
    'repaired by subsequent iterations, as Pearce et al. (2023) demonstrated. The result is ' +
    'accumulation rather than correction, producing the non-linear growth curve documented by ' +
    'Shukla et al. (2025) with average vulnerability counts rising from 2.1 to 6.2 across ' +
    'ten iterations.'
));
children.push(body(
    'This theoretical mechanism has a direct implication for mitigation design: interventions ' +
    'must be applied within the loop rather than after it, because post-generation remediation ' +
    'addresses the accumulated output rather than the accumulation process. This is the ' +
    'theoretical justification for the in-loop design of SecureLoop, distinguishing it from ' +
    'post-generation frameworks like CodingCare (2025).'
));
children.push(...sp(1));
children.push(...fig('fig1_feedback_loop.png',
    'Figure 1: The Feedback Loop Security Degradation Phenomenon (Shukla et al., 2025)'));
children.push(...sp(1));

children.push(h2('11.2  Automation Bias Theory'));
children.push(body(
    'The second theoretical pillar is automation bias, defined as the tendency to over-rely on ' +
    'automated systems and accept their outputs without sufficient critical evaluation. In the ' +
    'iterative code refinement context, automation bias operates through two mechanisms ' +
    'identified in the literature. The first is complacency: developers reduce their review ' +
    'effort because the AI system appears competent, as documented by Perry et al. (2023) ' +
    'through the false sense of security finding. The second is skill degradation: repeated ' +
    'reliance on AI-generated code reduces developers\' ability to independently identify ' +
    'vulnerabilities, as suggested by Becker et al. (2023) in the educational context.'
));
children.push(body(
    'Horowitz and Kahn (2024) established that automation bias is moderated by domain knowledge, ' +
    'with deeper AI literacy producing better-calibrated trust. This has a direct design ' +
    'implication: the SecureLoop artifact must not merely flag vulnerabilities but must present ' +
    'them in a way that activates developer security knowledge rather than bypassing it. The ' +
    'Security-Anchored Prompting engine is designed to do this by embedding CWE-specific ' +
    'security constraints into each refinement prompt, keeping security considerations salient ' +
    'throughout the iterative process rather than relegating them to a post-generation review.'
));

children.push(h2('11.3  Design Science Research Methodology'));
children.push(body(
    'The methodological framework for this research is Design Science Research as defined by ' +
    'Hevner et al. (2004) and operationalised through the six-phase process model of Peffers ' +
    'et al. (2007). DSR is appropriate for this research because the primary contribution is ' +
    'an artifact, the SecureLoop pipeline, rather than a theoretical explanation or empirical ' +
    'description. The artifact is evaluated through a controlled experiment that measures its ' +
    'effect on vulnerability accumulation trajectories, following the evaluation framework of ' +
    'Venable et al. (2012) which distinguishes formative evaluation through expert review from ' +
    'summative evaluation through controlled experiment.'
));
children.push(body(
    'The six DSR phases map onto this research as follows. Problem identification is grounded ' +
    'in the empirical evidence of Shukla et al. (2025) and the four gap dimensions identified ' +
    'in Section 9. Objective definition is operationalised through the four research questions ' +
    'in Section 10. Design and development produces the SecureLoop artifact combining ' +
    'Security-Anchored Prompting and Automated Vulnerability Checkpointing. Demonstration ' +
    'applies the artifact in controlled iterative coding sessions. Evaluation measures ' +
    'vulnerability accumulation with and without the artifact using repeated-measures ANOVA. ' +
    'Communication produces the MPhil thesis, an open annotated dataset, and practitioner ' +
    'guidelines.'
));
children.push(...sp(1));
children.push(...fig('fig2_dsr_process.png',
    'Figure 2: DSR Process Model (Peffers et al., 2007) Mapped to This Research'));
children.push(...sp(1));

children.push(h2('11.4  The SecureLoop Conceptual Model'));
children.push(body(
    'The SecureLoop artifact integrates the three theoretical pillars into a single operational ' +
    'pipeline. The feedback loop degradation theory motivates the in-loop intervention design. ' +
    'The automation bias theory motivates the Security-Anchored Prompting engine, which keeps ' +
    'security constraints salient at each iteration to counteract complacency. The DSR ' +
    'methodology provides the evaluation framework that distinguishes this research from ' +
    'informal mitigation guidelines.'
));
children.push(body(
    'The pipeline operates as follows. At each iteration boundary, the Automated Vulnerability ' +
    'Checkpointing module runs multiple static analysis scanners on the current code state and ' +
    'produces a structured vulnerability report. This report is fed into the Security-Anchored ' +
    'Prompting engine, which constructs the next refinement prompt with explicit CWE-specific ' +
    'security constraints derived from the scanner findings. The human developer reviews the ' +
    'flagged vulnerabilities before approving the next iteration, with the review process ' +
    'designed to be targeted and time-bounded to counteract the review burden documented by ' +
    'Sonar (2026). The Supply Chain Risk Analyser module runs in parallel, tracking package ' +
    'import hallucination rates and CVE-adjacent dependency suggestions across iterations.'
));
children.push(body(
    'This conceptual model directly addresses all four gap dimensions: it introduces human ' +
    'decision-making into the iterative loop, it is evaluated across three LLMs, it tracks ' +
    'supply chain CWE patterns across iterations, and it constitutes the first evaluated ' +
    'end-to-end iterative mitigation artifact in the literature.'
));
children.push(...fig('fig6_design_reqs.png',
    'Figure 6: Three Core Design Requirements for the SecureLoop Framework'));

children.push(pageBreak());

module.exports = base;
