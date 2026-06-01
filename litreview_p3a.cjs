'use strict';
const base = require('./litreview_p2.cjs');
const { children, h1, h2, h3, h4, body, bodyNI, sp, pageBreak, paperReview } = base;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2 — THEME 1: FOUNDATIONAL STUDIES ON AI-GENERATED CODE SECURITY
// ═════════════════════════════════════════════════════════════════════════════

children.push(h1('2.  Theme 1: Foundational Studies on AI-Generated Code Security'));

// ── 2.1 Overview ──────────────────────────────────────────────────────────────
children.push(h2('2.1  Overview'));
children.push(body(
    'The foundational literature on AI-generated code security emerged rapidly following the public ' +
    'release of GitHub Copilot in 2022 and established the empirical baseline against which all ' +
    'subsequent research is measured. Eight papers form this cluster, spanning controlled laboratory ' +
    'evaluations, user studies, replication studies, and multi-model comparison frameworks. Together ' +
    'they converge on a single central finding: AI code generation tools produce vulnerable code at ' +
    'rates between 40% and 65% depending on language, model, and evaluation methodology.'
));
children.push(body(
    'The binding limitation across all eight papers is the one-shot evaluation scope. They establish ' +
    'what happens when a developer makes a single request and accepts the output. They tell us nothing ' +
    'about what happens across the iterative multi-turn workflows that characterise real development ' +
    'practice. This is the conceptual space the present research occupies.'
));

// ── 2.2 Individual Paper Reviews ──────────────────────────────────────────────
children.push(h2('2.2  Individual Paper Reviews'));

children.push(...paperReview(
    'Paper 1: Pearce, H., Ahmad, B., Tan, B., Dolan-Gavitt, B., and Karri, R. (2022). Asleep at the Keyboard? Assessing the Security of GitHub Copilot\'s Code Contributions. IEEE S&P 2022.',
    'This landmark study emerged in the immediate aftermath of GitHub Copilot\'s public release and ' +
    'addressed a critical unanswered question: does the most widely deployed AI code generation tool ' +
    'produce secure code? The authors were motivated by the lack of any empirical baseline for ' +
    'AI-generated code vulnerability rates and the potential scale of impact given Copilot\'s ' +
    'deployment across millions of developers.',
    'Large-scale empirical evaluation generating 1,689 programs across 18 Common Weakness Enumeration ' +
    '(CWE) scenarios using GitHub Copilot. Static analysis was used to classify vulnerabilities by ' +
    'CWE type and programming language.',
    'Approximately 40% of generated programs contained vulnerabilities, rising to approximately 50% ' +
    'in C code compared to 39% in Python. This paper established the empirical methodology of ' +
    'generating code across multiple scenarios, scanning with static analysis tools, and classifying ' +
    'by CWE, that subsequent studies have followed. It is the common ancestor of the entire ' +
    'literature reviewed here.',
    'The foundational contribution is irreplaceable and its methodology has been replicated and ' +
    'extended by virtually every subsequent study. The limitation is that it evaluated only one model ' +
    'in one-shot settings. No iterative or multi-turn dynamics were studied and no human factors ' +
    'were considered.'
));

children.push(...paperReview(
    'Paper 2: Perry, N., Srivastava, M., Kumar, D., and Boneh, D. (2023). Do Users Write More Insecure Code with AI Assistants? ACM CCS 2023.',
    'Building on Pearce et al.\'s technical findings, Perry et al. investigated the human dimension: ' +
    'do developers who use AI assistants actually produce less secure code in practice, and are they ' +
    'aware of the risk? The study was motivated by the possibility that the problem is as much ' +
    'psychological as technical.',
    'Controlled user study where participants were randomly assigned to write code with or without AI ' +
    'assistance. Security of outputs was evaluated through static analysis and expert review.',
    'Participants using AI assistants wrote significantly less secure code and, crucially, exhibited ' +
    'a false sense of security, frequently rating their insecure solutions as secure. This finding ' +
    'introduced the human factors dimension to the field and directly motivates the human-in-the-loop ' +
    'component of this research.',
    'The controlled study design is methodologically rigorous and the false sense of security finding ' +
    'is the most important human factors result in the literature. The limitation is that the study ' +
    'examined only one-shot generation; iterative refinement dynamics were not investigated.'
));

children.push(...paperReview(
    'Paper 3: Sandoval, G., Pearce, H., Nys, T., Karri, R., Garg, S., and Dolan-Gavitt, B. (2023). Lost at C: A User Study on the Security Implications of Large Language Model Code Assistants. USENIX Security 2023.',
    'Motivated by the higher vulnerability rates in C observed by Pearce et al. (2022), Sandoval ' +
    'et al. focused specifically on C code and experienced developers to determine whether expert ' +
    'knowledge mitigates the security risk of LLM-assisted coding.',
    'Controlled user study with experienced developers writing C code with and without LLM assistance. ' +
    'Outputs were evaluated through manual expert review and static analysis.',
    'Even experienced developers struggled to identify vulnerabilities in LLM-suggested C code. The ' +
    'study reinforced Perry et al.\'s findings and highlighted C as a particularly problematic ' +
    'language for AI-assisted development. This paper informs the language selection in this ' +
    'research, supporting C as one of the three target languages.',
    'The focus on experienced developers is an important methodological contribution that strengthens ' +
    'the generalisability of human factors findings beyond novice programmers. The limitation is the ' +
    'single-language, one-shot scope with no iterative component.'
));

children.push(...paperReview(
    'Paper 4: Chong, Z., Yao, Y., and Neamtiu, I. (2024). Artificial-Intelligence Generated Code Considered Harmful. arXiv:2409.19182.',
    'Motivated by the accumulating evidence of AI code vulnerabilities, Chong et al. examined whether ' +
    'LLMs fail to apply defensive programming constructs and whether prompting can introduce new ' +
    'vulnerabilities into previously safe code.',
    'Empirical analysis of LLM-generated code across multiple scenarios, with specific attention to ' +
    'defensive programming failures and prompt-induced vulnerability introduction.',
    'LLMs lack defensive programming constructs and, critically, upon prompting, an LLM can introduce ' +
    'issues into files that were issue-free before prompting. This was the first published observation ' +
    'of what would later be systematically documented as feedback loop security degradation, making ' +
    'this paper a direct precursor to the central research problem of this project.',
    'The observation of prompt-induced vulnerability introduction is a foundational finding for this ' +
    'research. The weakness is that this was documented as an observation rather than a systematic ' +
    'study, which is precisely the gap that the IEEE-ISTAS 2025 base paper and this research address.'
));

children.push(...paperReview(
    'Paper 5: Khoury, R., Avila, A.R., Brunelle, J., and Camara, B.M. (2023). How Secure is Code Generated by ChatGPT? IEEE SMC 2023.',
    'Khoury et al. were motivated by the rapid adoption of ChatGPT for code generation and the lack ' +
    'of any systematic security evaluation of this specific model across multiple programming languages.',
    'Generation of 21 programs across 5 programming languages using ChatGPT, with security evaluation ' +
    'before and after the application of security-specific prompting.',
    'Only 5 of 21 programs were initially secure. After applying security-specific prompting, more ' +
    'became secure, demonstrating that prompt design affects security outcomes. This is a direct ' +
    'precursor to the Security-Anchored Prompting approach in this research.',
    'The multi-language scope and the pre/post prompting comparison are genuine methodological ' +
    'contributions. The limitation is the small sample size and the single-turn evaluation scope.'
));

children.push(...paperReview(
    'Paper 6: arXiv:2510.26103 (2025). Large-Scale Analysis of AI-Generated Code Vulnerabilities in Public GitHub Repositories.',
    'Motivated by the gap between controlled laboratory studies and real-world deployment, this study ' +
    'examined whether vulnerability rates found in experimental settings actually manifest in ' +
    'production codebases.',
    'Large-scale analysis of public GitHub repositories containing AI-generated code, using automated ' +
    'scanning and AI-attribution heuristics to identify and classify vulnerabilities.',
    'Vulnerabilities appear in production codebases at rates consistent with laboratory findings, ' +
    'demonstrating that earlier studies are not artefacts of controlled settings. This study provides ' +
    'ecological validity for the vulnerability rates reported across the literature and directly ' +
    'connects AI-generated code security research to the supply chain risk dimension of this project.',
    'The real-world ecological validity is the key contribution. The limitation is the difficulty of ' +
    'definitively attributing code to AI generation in production repositories, which introduces ' +
    'classification uncertainty.'
));

children.push(...paperReview(
    'Paper 7: Majdinasab, V., Nikanjam, A., Khomh, F., and Desmarais, M.C. (2024). Assessing the Effectiveness of LLMs in Android Application Vulnerability Analysis. IEEE SANER 2024.',
    'Motivated by the assumption that newer model versions would have resolved earlier security ' +
    'problems, Majdinasab et al. replicated Pearce et al. (2022) using updated versions of GitHub ' +
    'Copilot to test whether model improvements address the vulnerability problem.',
    'Targeted replication of Pearce et al. (2022) using updated Copilot versions, applying the same ' +
    'CWE scenario methodology to enable direct comparison.',
    'Vulnerability rates remain significant even in newer model versions, dispelling the assumption ' +
    'that model improvements alone address the security problem. This replication study validates the ' +
    'continued relevance of this research in 2025 and supports the multi-model comparison design.',
    'The direct replication design provides strong methodological comparability. The limitation is ' +
    'that it examined only Copilot updates rather than comparing across different LLM providers.'
));

children.push(...paperReview(
    'Paper 8: Mohsin, A., Janicke, H., Wood, A., and Sarker, S. (2024). Evaluating Security of LLM-Generated Code: A Multi-Model Analysis. arXiv:2406.12513.',
    'Prior security evaluations had largely focused on individual models. Mohsin et al. were motivated ' +
    'by the need for a systematic framework for comparing security patterns across diverse LLMs under ' +
    'controlled conditions.',
    'Development of a multi-model evaluation framework using in-context learning to assess security ' +
    'patterns across diverse LLMs. Comparative analysis across multiple models using standardised ' +
    'prompting.',
    'The framework enables consistent cross-model security comparison and identifies significant ' +
    'variation in vulnerability patterns across models. This work provides a methodological foundation ' +
    'for comparing Claude, GPT-4o, and GitHub Copilot under controlled conditions in this research.',
    'The multi-model framework design is directly relevant to this research\'s experimental design. ' +
    'The limitation is that evaluation was conducted in one-shot settings without iterative dynamics.'
));

// ── 2.3 Thematic Discussion ───────────────────────────────────────────────────
children.push(h2('2.3  Thematic Discussion'));
children.push(body(
    'The foundational literature is stable, well-replicated, and convergent. Pearce et al. (2022) ' +
    'established the empirical baseline; Perry et al. (2023) demonstrated that human developers ' +
    'compound the problem through misplaced trust; Sandoval et al. (2023) showed that expert ' +
    'developers are not immune; Majdinasab et al. (2024) confirmed that newer model versions do not ' +
    'resolve the problem; and arXiv:2510.26103 (2025) confirmed that laboratory findings translate ' +
    'directly to production codebases. Chong et al. (2024) made the critical observation that ' +
    'prompting itself can introduce vulnerabilities into previously safe code, a finding that ' +
    'directly motivated the iterative degradation research stream.'
));
children.push(body(
    'The binding limitation across all eight papers is the one-shot evaluation scope. They establish ' +
    'what happens when a developer makes a single request and accepts the output. They tell us nothing ' +
    'about what happens across the iterative multi-turn workflows that characterise real development ' +
    'practice. Mohsin et al. (2024) demonstrated that vulnerability patterns vary significantly ' +
    'across models in one-shot settings, making the assumption that GPT-4o findings generalise to ' +
    'other models empirically unjustified. This is the conceptual space the present research occupies.'
));

children.push(pageBreak());

module.exports = base;
