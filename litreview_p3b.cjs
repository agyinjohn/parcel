'use strict';
const base = require('./litreview_p3a.cjs');
const { children, h1, h2, h3, h4, body, bodyNI, sp, pageBreak, paperReview } = base;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3 — THEME 2: THE ITERATIVE FEEDBACK LOOP
// ═════════════════════════════════════════════════════════════════════════════

children.push(h1('3.  Theme 2: The Iterative Feedback Loop'));

// ── 3.1 Overview ──────────────────────────────────────────────────────────────
children.push(h2('3.1  Overview'));
children.push(body(
    'The iterative feedback loop literature is small, recent, and directly definitive of this ' +
    'research\'s contribution. Six papers form this cluster. Shukla et al. (2025) is the single ' +
    'most important paper in the entire review: it established the feedback loop security degradation ' +
    'phenomenon empirically and then precisely identified its own three limitations as future ' +
    'research directions. The remaining five papers provide complementary evidence from code quality, ' +
    'vulnerability repair, feedback-driven patching, and agentic settings.'
));
children.push(body(
    'The critical finding from this cluster is that the problem is real, statistically significant, ' +
    'and growing with iteration count. What remains entirely unknown is how human decision-making ' +
    'modifies the degradation trajectory, whether different models degrade at different rates, and ' +
    'whether iterative refinement produces supply chain CWE patterns disproportionately. These three ' +
    'questions define the SecureLoop research contribution.'
));

// ── 3.2 Individual Paper Reviews ──────────────────────────────────────────────
children.push(h2('3.2  Individual Paper Reviews'));

children.push(...paperReview(
    'Paper 9: Shukla, R., Joshi, A., and Syed, Z. (2025). Security Degradation in Iterative AI Code Generation: A Systematic Analysis of the Paradox. IEEE-ISTAS 2025. arXiv:2506.11022.',
    'Motivated by the absence of any empirical study on iterative AI code generation security, ' +
    'Shukla et al. designed the first controlled experiment specifically targeting feedback loop ' +
    'dynamics. They were motivated by Chong et al.\'s (2024) observation that prompting can ' +
    'introduce vulnerabilities into previously safe code, and sought to quantify this effect ' +
    'systematically across multiple iterations.',
    'Controlled experiment with 400 code samples using 10 baseline samples across 4 prompting ' +
    'strategies across 10 iterations, using GPT-4o only, in automated LLM-only loops without human ' +
    'intervention. C and Java only. Repeated measures ANOVA was used for statistical validation ' +
    'with effect size reported as eta-squared.',
    'A 37.6% increase in critical vulnerabilities was found after just five iterations. Four distinct ' +
    'prompting strategy effects were documented: efficiency-focused prompts produced the most critical ' +
    'vulnerabilities; security-focused prompts produced the fewest overall but paradoxically ' +
    'introduced the highest proportion of cryptographic implementation errors at 21.1%. Code ' +
    'complexity was the strongest predictor of vulnerability count with a beta of 0.64 and p less ' +
    'than 0.001. The study explicitly identified three limitations defining this research: only ' +
    'GPT-4o tested; only C and Java; no human intervention.',
    'This is the most important paper in this review and the direct base study being extended. The ' +
    'statistical rigour is high and the explicit identification of limitations as future directions ' +
    'is unusually clear. The three limitations, single model, two languages, and no human-in-the-loop, ' +
    'are precisely what this research addresses.'
));

children.push(...paperReview(
    'Paper 10: Liu, S., Le-Cong, T., Widyasari, R., and Lo, D. et al. (2024). Refining ChatGPT-Generated Code: Characterizing and Mitigating Code Quality Issues. ACM TOSEM 2024.',
    'Motivated by the widespread use of ChatGPT for code refinement, Liu et al. examined the quality ' +
    'implications of iterative refinement, specifically whether asking the model to improve code ' +
    'actually produces better code or introduces new problems.',
    'Empirical study of the code refinement process examining quality issues introduced and resolved ' +
    'across multiple refinement rounds, using static analysis and quality metrics.',
    'Refinement can introduce new issues, a finding that independently motivated the IEEE-ISTAS 2025 ' +
    'study and this research. While focused on code quality broadly rather than security specifically, ' +
    'this provides complementary evidence that iterative AI refinement is not uniformly beneficial ' +
    'and that each refinement round carries the risk of regression.',
    'The refinement-specific focus and quality degradation finding are directly relevant. The ' +
    'limitation is the quality rather than security framing, which means security-specific ' +
    'vulnerability patterns are not the primary unit of analysis.'
));

children.push(...paperReview(
    'Paper 11: Pearce, H., Tan, B., Ahmad, B., Karri, R., and Dolan-Gavitt, B. (2023). Examining Zero-Shot Vulnerability Repair with Large Language Models. IEEE S&P 2023.',
    'Motivated by the optimistic hypothesis that LLMs might be able to repair their own ' +
    'vulnerabilities without fine-tuning, Pearce et al. examined whether models can zero-shot ' +
    'repair the security flaws they introduce.',
    'Systematic evaluation of LLM zero-shot vulnerability repair across a range of CWE types, ' +
    'using both automated scanning and manual verification to assess repair quality.',
    'Mixed results: LLMs cannot reliably self-repair their own vulnerabilities. This supports the ' +
    'need for automated external scanning within the SecureLoop artifact rather than relying on the ' +
    'model to maintain its own security properties across iterations. Repair success was found to ' +
    'depend heavily on CWE type and code complexity.',
    'The inverse framing of repair rather than generation adds important complementary evidence. ' +
    'The mixed results finding is more nuanced than a simple failure, suggesting that self-repair ' +
    'is unreliable rather than impossible, which has direct implications for the design of ' +
    'automated vulnerability checkpointing.'
));

children.push(...paperReview(
    'Paper 12: Fakih, M., Dhiman, A., Keshk, M., Moustafa, N., and Turnbull, B. (2025). LLM4CVE: Iterative Automated Vulnerability Repair Using LLMs. arXiv:2501.03446.',
    'Motivated by the need for automated vulnerability repair pipelines, Fakih et al. built and ' +
    'evaluated LLM4CVE, which uses LLMs iteratively to repair known CVEs in existing code.',
    'Pipeline design combining LLM-based repair with automated validation across a dataset of known ' +
    'CVEs. Iterative repair loops evaluated on repair success rate and residual vulnerability counts.',
    'LLM4CVE successfully repairs a significant proportion of known CVEs through iterative ' +
    'LLM-based patching. This is the closest prior work to the automated vulnerability checkpointing ' +
    'pipeline in SecureLoop but operates in the inverse direction: it uses iteration to repair known ' +
    'vulnerabilities, while this research investigates degradation introduced during iterative ' +
    'refinement for other purposes.',
    'The iterative repair pipeline design is the most technically proximate prior work to this ' +
    'research\'s artifact. The key distinction between repair and degradation must be clearly ' +
    'maintained in positioning. The limitation for this research\'s purposes is that the iterative ' +
    'dynamics studied are remediation rather than degradation.'
));

children.push(...paperReview(
    'Paper 13: arXiv:2506.23034 (2025). Feedback-Driven Security Patching (FDSP) for LLM-Generated Code.',
    'Motivated by the high residual vulnerability rates in LLM-generated code, the FDSP study ' +
    'designed a feedback-driven patching approach that uses scanner output to guide subsequent ' +
    'prompting toward secure repairs.',
    'Pipeline design combining static analysis feedback with LLM-based patching in single-turn ' +
    'settings. Evaluated on GPT-4o using CodeQL and Bandit across multiple CWE categories.',
    'FDSP reduced residual vulnerability rates from 40.2% to 7.4% for GPT-4o in single-turn ' +
    'settings. This represents an important mitigation contribution. However, it operates in ' +
    'single-turn conditions and has not been evaluated in iterative multi-turn refinement contexts, ' +
    'which is the gap this research fills.',
    'The single-turn effectiveness result is significant and motivates the hypothesis that similar ' +
    'feedback-driven approaches can work in iterative settings. The single-turn limitation is the ' +
    'precise gap this research addresses by extending the FDSP concept into multi-turn iterative loops.'
));

children.push(...paperReview(
    'Paper 14: arXiv:2507.02976 (2025). Safety of LLM-Generated Patches in Agentic Automated Program Repair.',
    'Motivated by the rapid deployment of agentic LLM systems for autonomous code repair, this ' +
    'study examined the security properties of patches generated by LLMs in agentic settings ' +
    'using SWE-bench.',
    'Evaluation of LLM-generated patches across SWE-bench tasks with security analysis of patch ' +
    'outputs, comparing vulnerability patterns across multiple LLMs in agentic settings.',
    'Llama introduces unique vulnerability patterns absent in other models. This paper is relevant ' +
    'to both the multi-model comparison and the future PhD extension of this research into agentic ' +
    'systems. Patch generation in agentic systems represents an extreme form of iterative refinement ' +
    'and the most alarming manifestation of the feedback loop degradation problem.',
    'The agentic setting and model-specific vulnerability pattern finding are novel contributions. ' +
    'For this research the agentic scope is out of scope for the MPhil but directly informs future ' +
    'PhD work, making this an important horizon paper.'
));

// ── 3.3 Thematic Discussion ───────────────────────────────────────────────────
children.push(h2('3.3  Thematic Discussion'));
children.push(body(
    'The iterative feedback loop literature establishes three things with confidence. First, ' +
    'iterative LLM-only refinement degrades security non-linearly, with vulnerability counts ' +
    'rising from an average of 2.1 per sample in early iterations to 6.2 by iterations 8 to 10 ' +
    'in the Shukla et al. (2025) study. Second, LLMs cannot reliably self-repair the vulnerabilities ' +
    'they introduce, as demonstrated by Pearce et al. (2023), making external scanning a necessity ' +
    'rather than an option. Third, feedback-driven patching approaches can significantly reduce ' +
    'residual vulnerability rates in single-turn settings, as FDSP (2025) demonstrated with a ' +
    'reduction from 40.2% to 7.4%.'
));
children.push(body(
    'What the cluster does not establish is equally important. No study has introduced a human ' +
    'decision-maker into the iterative loop to observe how human choices modify the degradation ' +
    'trajectory. No study has compared degradation rates across Claude, GPT-4o, and GitHub Copilot ' +
    'under controlled iterative conditions. No study has mapped iterative refinement outputs to ' +
    'supply chain CWE categories. And no study has evaluated whether feedback-driven patching ' +
    'retains its effectiveness when embedded within a multi-turn iterative loop rather than applied ' +
    'in a single-turn setting. These four absences are the four research gaps this project addresses.'
));

children.push(pageBreak());

module.exports = base;
