'use strict';
const base = require('./litreview_p3b.cjs');
const { children, h1, h2, h3, h4, body, bodyNI, sp, pageBreak, paperReview } = base;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4 — THEME 3: MITIGATION APPROACHES AND THEIR LIMITATIONS
// ═════════════════════════════════════════════════════════════════════════════

children.push(h1('4.  Theme 3: Mitigation Approaches and Their Limitations'));

// ── 4.1 Overview ──────────────────────────────────────────────────────────────
children.push(h2('4.1  Overview'));
children.push(body(
    'Nine papers form this cluster, covering security-anchored prompting, comparative mitigation ' +
    'evaluation, adversarial robustness testing, AI-specific static analysis tools, reinforcement ' +
    'learning approaches, integrated remediation frameworks, multi-scanner detection, and LLM-based ' +
    'critic review. The mitigation literature has produced increasingly sophisticated approaches ' +
    'across all of these dimensions.'
));
children.push(body(
    'The binding limitation across all nine papers is structural rather than incidental: every ' +
    'mitigation method has been designed for and evaluated in single-turn generation only. No ' +
    'end-to-end mitigation pipeline has been built and evaluated within an iterative feedback loop. ' +
    'This is not an adaptable limitation but a foundational design choice that means the entire ' +
    'mitigation literature requires re-evaluation in iterative contexts.'
));

// ── 4.2 Individual Paper Reviews ──────────────────────────────────────────────
children.push(h2('4.2  Individual Paper Reviews'));

children.push(...paperReview(
    'Paper 15: Tony, C., Ferreyra, N.E.D., Mutas, M., Dhiff, S., and Scandariato, R. (2024). LLMSecGuard: A Framework for Evaluating Secure Code Generation by LLMs. arXiv:2407.07064.',
    'Motivated by the growing evidence that prompt design affects security outcomes, Tony et al. ' +
    'conducted a systematic investigation of prompting techniques for secure code generation, ' +
    'seeking to identify which prompt formulations most reliably reduce vulnerability rates.',
    'Systematic evaluation of multiple prompting techniques across LLMs using standardised security ' +
    'benchmarks. Security-explicit prompting compared against baseline and feature-focused prompting ' +
    'across multiple CWE categories.',
    'Different prompt formulations significantly affect the security of generated code, with ' +
    'security-explicit prompting producing fewer vulnerabilities. This paper is the primary ' +
    'theoretical foundation for the Security-Anchored Prompting engine in SecureLoop. However, ' +
    'their evaluation was conducted in single-turn settings, leaving the iterative effectiveness ' +
    'of security-anchored prompting entirely unanswered.',
    'The systematic prompting comparison is methodologically rigorous and directly foundational ' +
    'for the Security-Anchored Prompting engine design. The single-turn limitation is the precise ' +
    'gap this research addresses in the iterative context.'
));

children.push(...paperReview(
    'Paper 16: arXiv:2502.06039 (2025). Benchmarking Prompt Engineering Techniques for Secure Code Generation.',
    'Motivated by the fragmented state of prompt engineering evaluation, this study benchmarked ' +
    'prompt engineering techniques across multiple GPT model generations using standardised ' +
    'security benchmarks.',
    'Evaluation of prompt engineering techniques for secure code generation across GPT-3.5, ' +
    'GPT-4o-mini, and GPT-4o using LLMSecEval and SecurityEval. Vulnerability rates compared ' +
    'by model and prompt strategy.',
    'Vulnerability rates vary significantly by model and prompt strategy. This directly informs ' +
    'the experimental design of this research and provides baseline rates for comparison. Like ' +
    'Tony et al. (2024), this study evaluated single-turn generation only, leaving the iterative ' +
    'dimension unaddressed.',
    'The multi-model and multi-benchmark design strengthens the generalisability of findings. ' +
    'The single-turn limitation applies directly and is the gap this research addresses.'
));

children.push(...paperReview(
    'Paper 17: arXiv:2503.15554 (2025). Rethinking the Evaluation of Secure Code Generation: A Comprehensive Study of Mitigation Methods.',
    'Motivated by the proliferation of mitigation methods without rigorous comparative evaluation, ' +
    'this study conducted the first comprehensive head-to-head evaluation of leading mitigation ' +
    'approaches.',
    'Evaluation of four leading mitigation methods, SVEN, SafeCoder, CodeGuard+, and PromSec, ' +
    'using CodeQL, Bearer, and a third scanner. Comparative analysis across multiple CWE categories ' +
    'and programming languages.',
    'This paper provides the most comprehensive evaluation of the current mitigation landscape. ' +
    'Critically, all four methods are evaluated in single-turn settings, and the study does not ' +
    'test their effectiveness when applied iteratively. This gap directly motivates the automated ' +
    'vulnerability checkpointing pipeline design in this research.',
    'The comprehensive four-method comparison is the most authoritative evaluation of the ' +
    'mitigation landscape available. The single-turn scope is a structural limitation of the ' +
    'entire mitigation literature that this research directly addresses.'
));

children.push(...paperReview(
    'Paper 18: arXiv:2601.07084 (2025). Adversarial Robustness of Secure Code Generation Defences.',
    'Motivated by the possibility that existing defences perform well under benign conditions ' +
    'but fail under adversarial pressure, this study stress-tested mitigation methods using ' +
    'adversarially crafted prompts.',
    'Stress-testing of existing mitigation methods under adversarial prompting conditions using ' +
    'CodeSecEval. Multiple adversarial prompt strategies evaluated against leading defences.',
    'Current defences break under adversarial conditions. This is particularly relevant to the ' +
    'iterative context: each iteration\'s prompt can be seen as a new opportunity for unintentional ' +
    'adversarial-style pressure on security properties, even when the developer\'s intent is benign. ' +
    'The finding that defences are brittle under pressure directly motivates the need for ' +
    'checkpointing at every iteration rather than only at the end.',
    'The adversarial framing is genuinely novel and the brittleness finding is important. The ' +
    'iterative connection is implicit rather than explicit, which is a limitation this research ' +
    'addresses directly by testing mitigation robustness across multiple refinement rounds.'
));

children.push(...paperReview(
    'Paper 19: Cotroneo, D., De Luca, G., and Liguori, P. (2025). DeVAIC: A Tool for Security Assessment of AI-Generated Code. Information and Software Technology, 2025.',
    'Motivated by the observation that general-purpose static analysis tools were not designed ' +
    'for the specific vulnerability patterns produced by LLMs, Cotroneo et al. developed DeVAIC, ' +
    'a scanner trained specifically on AI-generated code patterns.',
    'Development and evaluation of DeVAIC as a specialised static analysis tool for AI-generated ' +
    'code. Comparison against Bandit and Semgrep on AI-generated code datasets.',
    'DeVAIC outperforms general-purpose scanners on AI-generated code, particularly for ' +
    'LLM-characteristic vulnerability patterns. This paper is relevant to the scanner engine ' +
    'design in SecureLoop and represents a potential scanner for future artifact versions that ' +
    'could improve detection precision on AI-generated patterns.',
    'The AI-specific scanner design is a genuine advance over generic tools. The limitation is ' +
    'that DeVAIC has not been evaluated in iterative refinement settings, and its training data ' +
    'may not capture the degradation-specific patterns this research will produce.'
));

children.push(...paperReview(
    'Paper 20: Islam, M.R., Karkevandi, M.S., and Najafirad, P. (2024). Towards a Robust Framework for RL-Based Vulnerability Repair. arXiv:2401.07031.',
    'Motivated by the limitations of prompting-based approaches, Islam et al. investigated whether ' +
    'reinforcement learning and parameter-efficient fine-tuning could train security awareness ' +
    'directly into LLMs.',
    'Application of reinforcement learning and PEFT approaches to LLM fine-tuning for secure code ' +
    'generation. Evaluation against baseline models using standard security benchmarks.',
    'RL and PEFT approaches show promise for training security-aware code generation directly into ' +
    'models. This represents the model-level mitigation paradigm, contrasting with the prompt-based ' +
    'Security-Anchored Prompting strategy in SecureLoop and providing an alternative paradigm for ' +
    'future comparison studies.',
    'The model-level approach is conceptually distinct from prompting and provides an important ' +
    'alternative paradigm. The limitation is that RL fine-tuning approaches require model access ' +
    'that is unavailable for proprietary models like GPT-4o and Copilot, making this approach ' +
    'inapplicable to the models tested in this research.'
));

children.push(...paperReview(
    'Paper 21: CodingCare Framework (2025). CodingCare: Static Analysis with LLM-Based Remediation for Supply Chain Security. ACM ISCCN 2025.',
    'Motivated by the need for an integrated tool combining detection and remediation, CodingCare ' +
    'was developed as a framework combining static analysis with LLM-based remediation explicitly ' +
    'covering supply chain vulnerability injection.',
    'Framework design combining CodeQL-based static analysis with LLM remediation pipelines. ' +
    'Evaluation on a dataset of AI-generated code with known supply chain vulnerabilities.',
    'CodingCare is the closest existing framework to SecureLoop in overall scope. The key ' +
    'distinction is that CodingCare is a remediation tool applied after code is generated, while ' +
    'SecureLoop intercepts and mitigates security degradation within the iterative loop itself. ' +
    'The supply chain coverage is directly relevant to this research\'s fourth research question.',
    'The supply chain coverage and LLM-based remediation make this the most structurally similar ' +
    'prior work to SecureLoop. The post-generation rather than in-loop framing is the critical ' +
    'differentiator that must be clearly articulated in positioning.'
));

children.push(...paperReview(
    'Paper 22: Shahid, U., Al-Shaer, E., and Rashid, A. (2025). LLM-CSEC: Evaluating LLMs for Cybersecurity Code Generation. arXiv, 2025.',
    'Motivated by the inconsistency of single-scanner evaluations, Shahid et al. used three static ' +
    'analysers simultaneously to produce more reliable vulnerability detection in LLM-generated code.',
    'Evaluation of LLM-generated code using three static analysers, CodeQL, Snyk, and CodeShield, ' +
    'applied simultaneously. Comparison of detection rates across analysers and LLMs.',
    'Even with explicit secure code generator prompting, median LLM output contains multiple ' +
    'high-severity vulnerabilities. No single scanner captures all vulnerabilities. This finding ' +
    'motivates the multi-tool scanner design in SecureLoop and the automated checkpointing approach ' +
    'that runs scanners between iterations rather than only at the end.',
    'The three-scanner comparative design is methodologically robust and the finding that no single ' +
    'scanner is sufficient is directly actionable for SecureLoop\'s design. The single-turn scope ' +
    'applies throughout.'
));

children.push(...paperReview(
    'Paper 23: McAleese, N., et al. (2024). LLM Critics Help Catch LLM Bugs. arXiv:2407.00215.',
    'Motivated by the possibility that LLMs could evaluate each other\'s outputs, McAleese et al. ' +
    'investigated whether a critic LLM could catch bugs introduced by a generator LLM.',
    'LLM-based critic evaluation where one model reviews code generated by another. Assessment of ' +
    'bug detection rates compared to human review and static analysis.',
    'LLM critics can catch a meaningful proportion of LLM-generated bugs, though with significant ' +
    'false positive rates. This paper informs the design of the automated vulnerability ' +
    'checkpointing component and raises the possibility of LLM-based secondary review as a ' +
    'complementary layer to static analysis.',
    'The LLM-critic concept is novel and directly relevant. The limitation is the focus on bugs ' +
    'rather than security vulnerabilities specifically, and the single-turn evaluation scope.'
));

// ── 4.3 Thematic Discussion ───────────────────────────────────────────────────
children.push(h2('4.3  Thematic Discussion'));
children.push(body(
    'The mitigation literature has produced a rich and diverse set of approaches. Tony et al. ' +
    '(2024) and arXiv:2502.06039 (2025) established that security-anchored prompting reduces ' +
    'vulnerability rates in single-turn settings. arXiv:2503.15554 (2025) provided the most ' +
    'authoritative head-to-head comparison of leading mitigation methods. Cotroneo et al. (2025) ' +
    'demonstrated that AI-specific scanners outperform general-purpose tools on LLM-generated ' +
    'code. Shahid et al. (2025) confirmed that multi-scanner approaches are necessary for ' +
    'reliable detection. CodingCare (2025) showed that integrated detection and remediation ' +
    'frameworks can reduce CVE counts in production-adjacent settings.'
));
children.push(body(
    'The structural limitation that unifies all nine papers is the single-turn evaluation scope. ' +
    'Tony et al.\'s security-anchored prompting may behave differently in iterative contexts where ' +
    'each round introduces new code complexity. DeVAIC\'s detection patterns may not capture ' +
    'degradation-specific vulnerability signatures that emerge only after multiple refinement ' +
    'rounds. The adversarial robustness findings of arXiv:2601.07084 (2025) suggest that even ' +
    'the best defences are brittle under pressure, and each iteration of refinement represents ' +
    'a new pressure event. This research directly tests whether the most promising single-turn ' +
    'mitigations retain their effectiveness when embedded within an iterative loop.'
));

children.push(pageBreak());

module.exports = base;
