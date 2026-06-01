'use strict';
const base = require('./litreview_p3f.cjs');
const { children, h1, h2, h3, h4, body, bodyNI, bodyB, sp, hr, pageBreak, fig, makeTable, run, runB, runI } = base;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 8 — SYNTHESIS AND CRITICAL ANALYSIS
// ═════════════════════════════════════════════════════════════════════════════

children.push(h1('8.  Synthesis and Critical Analysis'));

// ── 8.1 Thematic Convergence ──────────────────────────────────────────────────
children.push(h2('8.1  Thematic Convergence'));
children.push(body(
    'The six themes reviewed above converge on a coherent and urgent research problem from ' +
    'six independent directions. Theme 1 established the empirical baseline: AI code generation ' +
    'tools produce vulnerable code at rates between 40% and 65% in one-shot settings, human ' +
    'developers compound the problem through misplaced trust, and newer model versions do not ' +
    'resolve the problem. Theme 2 established that iterative refinement makes the problem ' +
    'significantly worse, with a 37.6% increase in critical vulnerabilities after just five ' +
    'automated iterations, and that LLMs cannot reliably self-repair the vulnerabilities they ' +
    'introduce. Theme 3 established that a rich mitigation landscape exists but every method ' +
    'has been designed for and evaluated in single-turn settings only. Theme 4 established ' +
    'that supply chain risks are real, demonstrated, and growing, but entirely unstudied in ' +
    'iterative contexts. Theme 5 established that the benchmark infrastructure exists to ' +
    'support rigorous evaluation but no benchmark provides iterative refinement scenarios. ' +
    'Theme 6 confirmed the field-wide consensus and established policy significance.'
));
children.push(body(
    'The convergence is not merely thematic but structural. Each stream independently arrives ' +
    'at the same absence: no designed, evaluated artifact exists that operationalises human ' +
    'oversight to mitigate security degradation within iterative LLM-assisted code refinement ' +
    'workflows. The mitigation literature has the tools but not the iterative context. The ' +
    'iterative literature has the problem characterisation but not the human-in-the-loop ' +
    'dimension. The supply chain literature has the threat landscape but not the iterative ' +
    'amplification analysis. The benchmark literature has the evaluation infrastructure but ' +
    'not the iterative dataset. This research is positioned at the intersection of all four ' +
    'absences.'
));
children.push(...sp(1));
children.push(...fig('fig5_convergence.png',
    'Figure 5: Thematic Convergence Towards the Proposed SecureLoop Framework'));
children.push(...sp(1));

// ── 8.2 Contradictions and Debates in the Literature ─────────────────────────
children.push(h2('8.2  Contradictions and Debates in the Literature'));
children.push(body(
    'The literature is not uniformly convergent. Several genuine tensions and unresolved debates ' +
    'exist across the six themes that this research must navigate carefully.'
));

children.push(h3('The Prompting Paradox'));
children.push(body(
    'Tony et al. (2024) and arXiv:2502.06039 (2025) established that security-explicit prompting ' +
    'reduces vulnerability rates in single-turn settings. However, Shukla et al. (2025) found ' +
    'that security-focused prompts paradoxically introduced the highest proportion of ' +
    'cryptographic implementation errors at 21.1% across iterations, higher than efficiency ' +
    'or feature-focused prompts for that specific CWE category. This creates a direct ' +
    'contradiction: the prompting strategy most recommended by the mitigation literature ' +
    'may be the most dangerous in iterative contexts for certain vulnerability types. ' +
    'Resolving this contradiction is one of the empirical contributions of this research.'
));

children.push(h3('Self-Repair Capability'));
children.push(body(
    'Pearce et al. (2023) found mixed results on LLM zero-shot vulnerability repair, suggesting ' +
    'that self-repair is unreliable rather than impossible. Fakih et al. (2025) demonstrated ' +
    'that iterative LLM-based repair of known CVEs is effective when the vulnerability is ' +
    'explicitly identified. McAleese et al. (2024) showed that LLM critics can catch a ' +
    'meaningful proportion of bugs. Together these findings suggest that LLMs have latent ' +
    'repair capability that is not activated by default but can be triggered by explicit ' +
    'vulnerability identification. This has direct implications for the automated vulnerability ' +
    'checkpointing design in SecureLoop: scanner-identified vulnerabilities fed back into the ' +
    'prompt may activate repair capability that would otherwise remain dormant.'
));

children.push(h3('Scanner Sufficiency'));
children.push(body(
    'Shahid et al. (2025) and the LLM-CSEC validation study both confirmed that no single ' +
    'scanner captures all vulnerability types, motivating multi-scanner approaches. However, ' +
    'Cotroneo et al. (2025) demonstrated that AI-specific scanners outperform general-purpose ' +
    'tools on LLM-generated code. These findings are not contradictory but create a design ' +
    'tension: should SecureLoop use multiple general-purpose scanners or a single AI-specific ' +
    'scanner? The current design resolves this by using multiple general-purpose scanners ' +
    'for breadth while noting DeVAIC as a future enhancement for precision.'
));

children.push(h3('Human Oversight Effectiveness'));
children.push(body(
    'Perry et al. (2023) demonstrated that human oversight is undermined by automation bias, ' +
    'with developers rating insecure AI-generated code as secure. This creates a tension with ' +
    'the HITL literature, which assumes that human intervention improves security outcomes. ' +
    'If developers systematically fail to identify vulnerabilities in AI-generated code, then ' +
    'mandating human review may provide false assurance rather than genuine protection. This ' +
    'tension is not resolved in the existing literature and is one of the empirical questions ' +
    'this research addresses: does structured human-in-the-loop intervention with explicit ' +
    'vulnerability flagging actually reduce degradation, or does automation bias neutralise ' +
    'the benefit?'
));

children.push(h3('Model Improvement Trajectory'));
children.push(body(
    'Majdinasab et al. (2024) confirmed that vulnerability rates persist in newer Copilot ' +
    'versions, suggesting that model improvements alone do not resolve the security problem. ' +
    'However, Blain and Noiseux (2026) found that AI-generated code is broken by default ' +
    'in security-critical domains even with the most advanced models available. This creates ' +
    'a pessimistic framing that contrasts with the optimism of the prompting literature, ' +
    'which suggests that prompt design can significantly reduce vulnerability rates. The ' +
    'resolution may be that prompt design helps at the margins but cannot overcome fundamental ' +
    'limitations in how LLMs represent and reason about security properties.'
));

// ── 8.3 Gaps Identified ───────────────────────────────────────────────────────
children.push(h2('8.3  Gaps Identified'));
children.push(body(
    'The synthesis reveals one primary research gap with four specific and confirmed dimensions. ' +
    'Each dimension is independently confirmed by at least two literature streams and is not ' +
    'addressable by extending or combining existing studies without new empirical work.'
));

children.push(h3('Gap 1: Human-in-the-Loop Iterative Dynamics'));
children.push(body(
    'Every iterative study to date used automated LLM-only loops without human intervention. ' +
    'The IEEE-ISTAS 2025 base paper explicitly states this as its primary limitation and calls ' +
    'for future research on human-in-the-loop practices. Perry et al. (2023) demonstrated that ' +
    'developer psychology significantly modifies code security outcomes in one-shot settings. ' +
    'No study has investigated how human decisions interact with iterative security degradation. ' +
    'This gap is confirmed by Themes 1, 2, and 3 independently.'
));

children.push(h3('Gap 2: Multi-Model Iterative Comparison'));
children.push(body(
    'Iterative security degradation has been characterised for GPT-4o only. No study has ' +
    'compared degradation trajectories across Claude, GitHub Copilot, or other models under ' +
    'controlled iterative conditions. Mohsin et al. (2024) demonstrated significant variation ' +
    'in security patterns across models in one-shot settings, making the assumption that ' +
    'GPT-4o findings generalise empirically unjustified. arXiv:2507.02976 (2025) found that ' +
    'Llama introduces unique vulnerability patterns absent in other models even in agentic ' +
    'settings. This gap is confirmed by Themes 1, 2, and 5 independently.'
));

children.push(h3('Gap 3: Iterative Supply Chain CWE Mapping'));
children.push(body(
    'No study has investigated whether iterative refinement disproportionately produces CWEs ' +
    'associated with supply chain attacks or amplifies package hallucination rates. Spracklen ' +
    'et al. (2025) established that hallucination rates are significant in one-shot generation ' +
    'at nearly 20% for Python. As code complexity accumulates across iterations, the probability ' +
    'of hallucinated imports and CVE-adjacent dependency suggestions may increase non-linearly. ' +
    'Whether this is the case is entirely unknown. This gap is confirmed by Themes 2, 4, and ' +
    '5 independently.'
));

children.push(h3('Gap 4: Evaluated Iterative Mitigation Artifact'));
children.push(body(
    'No end-to-end pipeline combining secure prompting with automated scanning within an ' +
    'iterative loop has been built and evaluated. FDSP (2025) achieved significant single-turn ' +
    'mitigation with a reduction from 40.2% to 7.4%. Tony et al. (2024) established that ' +
    'security-anchored prompting works in single-turn settings. CodingCare (2025) demonstrated ' +
    'integrated detection and remediation but applied post-generation rather than within the ' +
    'loop. Whether these approaches retain effectiveness in multi-turn iterative contexts is ' +
    'the unanswered question SecureLoop directly addresses. This gap is confirmed by Themes ' +
    '2, 3, and 6 independently.'
));

children.push(...sp(1));

// ── Summary Table ─────────────────────────────────────────────────────────────
children.push(h2('8.4  Structured Summary of All 42 Papers'));
children.push(bodyNI('Table 1 provides a structured summary of all 42 papers reviewed, organised by theme.'));
children.push(...sp(1));

const summaryWidths = [320, 1200, 1100, 1200, 1700, 1306];
const summaryData = [
    ['1',  'Pearce et al. (2022)',          'Baseline AI code vulnerability rates',          'Large-scale CWE scenario evaluation',       '40% vulnerable; C highest risk',                        'One model, one-shot only'],
    ['2',  'Perry et al. (2023)',            'Human factors in AI code security',             'Controlled user study',                     'False sense of security documented',                    'One-shot, no iterative component'],
    ['3',  'Sandoval et al. (2023)',         'Expert developer vulnerability identification',  'Controlled user study, C code',             'Even experts miss LLM vulnerabilities',                 'Single language, one-shot'],
    ['4',  'Chong et al. (2024)',            'Defensive programming failures in LLMs',        'Empirical analysis',                        'Prompting introduces new vulnerabilities',               'Observation not systematic study'],
    ['5',  'Khoury et al. (2023)',           'ChatGPT security across languages',             'Multi-language generation study',           'Security prompting improves outcomes',                  'Small sample, one-shot'],
    ['6',  'arXiv:2510.26103 (2025)',        'Real-world AI code vulnerability prevalence',   'GitHub repository analysis',                'Lab findings confirmed in production',                  'AI attribution uncertainty'],
    ['7',  'Majdinasab et al. (2024)',       'Copilot vulnerability rate replication',        'Replication of Pearce 2022',                'Vulnerability rates persist in new models',             'Single model replication'],
    ['8',  'Mohsin et al. (2024)',           'Multi-model security comparison framework',     'In-context learning framework',             'Cross-model comparison enabled',                        'One-shot scope'],
    ['9',  'Shukla et al. (2025)',           'Iterative feedback loop security degradation',  'Controlled 400-sample ANOVA experiment',    '37.6% critical vuln increase in 5 iterations',          'GPT-4o only, no HITL, C/Java only'],
    ['10', 'Liu et al. (2024)',              'Code quality in iterative refinement',          'Empirical refinement analysis',             'Refinement introduces new issues',                      'Quality not security focus'],
    ['11', 'Pearce et al. (2023)',           'Zero-shot vulnerability self-repair',           'Systematic repair evaluation',              'LLMs cannot reliably self-repair',                      'Mixed results, one-shot'],
    ['12', 'Fakih et al. (2025)',            'Iterative automated CVE repair',                'LLM4CVE pipeline evaluation',               'CVE repair via iterative LLM patching',                 'Repair not degradation focus'],
    ['13', 'arXiv:2506.23034 (2025)',        'Feedback-driven security patching',             'FDSP pipeline evaluation',                  '40.2% to 7.4% vulnerability reduction',                 'Single-turn only'],
    ['14', 'arXiv:2507.02976 (2025)',        'Agentic patch safety',                          'SWE-bench agentic evaluation',              'Llama unique vulnerability patterns',                   'Agentic scope, out of MPhil range'],
    ['15', 'Tony et al. (2024)',             'Prompting for secure code generation',          'Systematic prompting evaluation',           'Security prompting reduces vulnerabilities',             'Single-turn scope'],
    ['16', 'arXiv:2502.06039 (2025)',        'Prompt engineering benchmarking',               'Multi-model prompt benchmark',              'Rates vary by model and prompt strategy',               'Single-turn scope'],
    ['17', 'arXiv:2503.15554 (2025)',        'Comparative mitigation evaluation',             '4-method head-to-head evaluation',          'All methods evaluated single-turn only',                'No iterative evaluation'],
    ['18', 'arXiv:2601.07084 (2025)',        'Adversarial robustness of defences',            'Adversarial stress-testing',                'Defences break under adversarial prompts',              'Iterative connection implicit'],
    ['19', 'Cotroneo et al. (2025)',         'AI-specific static analysis tool',              'DeVAIC development and evaluation',         'Outperforms general scanners on AI code',               'Not evaluated in iterative settings'],
    ['20', 'Islam et al. (2024)',            'RL-based secure code generation',               'RL and PEFT fine-tuning study',             'RL shows promise for security training',                'Requires model access unavailable for GPT-4o'],
    ['21', 'CodingCare (2025)',              'Static analysis with LLM remediation',          'Framework design and evaluation',           'Closest framework to SecureLoop in scope',              'Post-generation not in-loop'],
    ['22', 'Shahid et al. (2025)',           'Multi-scanner LLM vulnerability detection',     'Three-scanner comparative study',           'Multi-tool scanning necessary',                         'Single-turn scope'],
    ['23', 'McAleese et al. (2024)',         'LLM critic for bug detection',                  'LLM-critic evaluation',                     'LLM critics catch meaningful proportion',               'Bug not security focus'],
    ['24', 'Spracklen et al. (2025)',        'Package hallucination analysis',                '576,000-sample cross-LLM study',            '20% Python samples hallucinate packages',               'Single-turn scope'],
    ['25', 'arXiv:2501.19012 (2025)',        'Slopsquatting real-world demonstration',        'End-to-end attack demonstration',           'Securehashlib downloaded thousands of times',           'Single case study'],
    ['26', 'Li et al. (2025)',               'Emergent LLM supply chain threats',             'Systematic threat characterisation',        'LLM code threats beyond classical CWEs',                'No iterative analysis'],
    ['27', 'Endor Labs (2024)',              'CVE reintroduction by LLMs',                    'Enterprise codebase analysis',              'Training cutoff creates CVE reintroduction',            'Industry report, limited transparency'],
    ['28', 'ExtraHop (2025)',                'AI supply chain scale statistics',              'Survey and telemetry analysis',             '87% PyPI growth, 20% SBOM adoption',                   'Industry report format'],
    ['29', 'Dark Reading (2025)',            'Hallucination-to-attack conversion rates',      'Vendor and registry synthesis',             '20-35% hallucinated names become malicious',            'No peer review'],
    ['30', 'Ji et al. (2024)',               'Policy analysis of AI code risks',              'Georgetown CSET policy brief',              '50% AI code contains exploitable bugs',                 'Non-technical policy level'],
    ['31', 'Wang et al. (2024)',             'Comprehensive Python security benchmark',       'CodeSecEval construction',                  '180 tasks, 44 CWE types',                               'Synthetic construction'],
    ['32', 'Siddiq & Santos (2022)',         'Security benchmark for LLM evaluation',         'SecurityEval construction',                 '121 tasks, 69 CWE types',                               'Small sample, older examples'],
    ['33', 'Tony et al. (2023)',             'Natural language security prompts',             'LLMSecEval construction',                   'Natural language mirrors real use',                     'Prompt-context mismatch for iterative'],
    ['34', 'Bhatt et al./Meta (2023/24)',    'Multi-dimensional LLM security benchmark',      'CyberSecEval construction',                 'Industry-credible multi-LLM baseline',                  'Breadth over depth tradeoff'],
    ['35', 'Yang et al. (2024)',             'Large-scale multi-LLM evaluation platform',     'SecCodePLT construction',                   '40-65% vulnerable across 4 LLMs',                       'Synthetic from seed questions'],
    ['36', 'arXiv:2509.22097 (2025)',        'Agentic code security benchmark',               'SecureAgentBench construction',             'Realistic agentic vulnerability conditions',            'Agentic scope, out of MPhil range'],
    ['37', 'Shahid et al. (2025)',           'Multi-scanner validation',                      'Three-scanner comparative evaluation',      'No single scanner sufficient',                          'Overlaps with Paper 22'],
    ['38', 'Negri-Ribalta et al. (2024)',    'SLR of AI code security field',                 'PRISMA systematic review',                  'AI models do not produce safe code',                    'Predates 2025 base paper'],
    ['39', 'arXiv:2412.15004 (2025)',        'Updated SLR with CWE-level analysis',           'Updated systematic review',                 'Deserialization as open question',                      'arXiv preprint, not peer reviewed'],
    ['40', 'Nguyen-Duc et al. (2023)',       'GenAI SE research agenda',                      'Research agenda development',               'Security identified as priority direction',             'High-level, no empirical findings'],
    ['41', 'Becker et al. (2023)',           'Educational implications of AI code tools',     'Educational survey and analysis',           'Security awareness implications for education',         'Education not security focus'],
    ['42', 'Ji et al. (2024)',               'Policy significance (cross-theme)',             'See Paper 30',                              'See Paper 30',                                          'See Paper 30'],
];

children.push(makeTable(
    ['No.', 'Author(s) & Year', 'Aim', 'Methodology', 'Key Contribution', 'Main Weakness'],
    summaryData,
    summaryWidths
));
children.push(...sp(1));

// ── Thematic Coverage Matrix ──────────────────────────────────────────────────
children.push(h2('8.5  Thematic Coverage Matrix'));
children.push(bodyNI('Table 2 maps all 42 papers against the six themes, showing where each paper contributes.'));
children.push(...sp(1));

const matrixWidths = [1400, 700, 700, 700, 700, 700, 700, 700, 726];
const matrixData = [
    ['Pearce et al. (2022)',         'T1', '',   '',   '',   '',   ''],
    ['Perry et al. (2023)',          'T1', '',   '',   '',   '',   ''],
    ['Sandoval et al. (2023)',       'T1', '',   '',   '',   '',   ''],
    ['Chong et al. (2024)',          'T1', 'T2', '',   '',   '',   ''],
    ['Khoury et al. (2023)',         'T1', '',   'T3', '',   '',   ''],
    ['arXiv:2510.26103 (2025)',      'T1', '',   '',   'T4', '',   ''],
    ['Majdinasab et al. (2024)',     'T1', '',   '',   '',   '',   ''],
    ['Mohsin et al. (2024)',         'T1', '',   '',   '',   'T5', ''],
    ['Shukla et al. (2025)',         '',   'T2', '',   '',   '',   ''],
    ['Liu et al. (2024)',            '',   'T2', '',   '',   '',   ''],
    ['Pearce et al. (2023)',         '',   'T2', 'T3', '',   '',   ''],
    ['Fakih et al. (2025)',          '',   'T2', 'T3', '',   '',   ''],
    ['arXiv:2506.23034 (2025)',      '',   'T2', 'T3', '',   '',   ''],
    ['arXiv:2507.02976 (2025)',      '',   'T2', '',   '',   '',   ''],
    ['Tony et al. (2024)',           '',   '',   'T3', '',   '',   ''],
    ['arXiv:2502.06039 (2025)',      '',   '',   'T3', '',   '',   ''],
    ['arXiv:2503.15554 (2025)',      '',   '',   'T3', '',   '',   ''],
    ['arXiv:2601.07084 (2025)',      '',   '',   'T3', '',   '',   ''],
    ['Cotroneo et al. (2025)',       '',   '',   'T3', '',   '',   ''],
    ['Islam et al. (2024)',          '',   '',   'T3', '',   '',   ''],
    ['CodingCare (2025)',            '',   '',   'T3', 'T4', '',   ''],
    ['Shahid et al. (2025)',         '',   '',   'T3', '',   'T5', ''],
    ['McAleese et al. (2024)',       '',   '',   'T3', '',   '',   ''],
    ['Spracklen et al. (2025)',      '',   '',   '',   'T4', '',   ''],
    ['arXiv:2501.19012 (2025)',      '',   '',   '',   'T4', '',   ''],
    ['Li et al. (2025)',             '',   '',   '',   'T4', '',   ''],
    ['Endor Labs (2024)',            '',   '',   '',   'T4', '',   ''],
    ['ExtraHop (2025)',              '',   '',   '',   'T4', '',   ''],
    ['Dark Reading (2025)',          '',   '',   '',   'T4', '',   ''],
    ['Ji et al. (2024)',             '',   '',   '',   'T4', '',   'T6'],
    ['Wang et al. (2024)',           '',   '',   '',   '',   'T5', ''],
    ['Siddiq & Santos (2022)',       '',   '',   '',   '',   'T5', ''],
    ['Tony et al. (2023)',           '',   '',   '',   '',   'T5', ''],
    ['Bhatt et al./Meta (2023/24)',  '',   '',   '',   '',   'T5', ''],
    ['Yang et al. (2024)',           '',   '',   '',   '',   'T5', ''],
    ['arXiv:2509.22097 (2025)',      '',   '',   '',   '',   'T5', ''],
    ['Shahid et al. (2025)',         '',   '',   '',   '',   'T5', ''],
    ['Negri-Ribalta et al. (2024)', '',   '',   '',   '',   '',   'T6'],
    ['arXiv:2412.15004 (2025)',      '',   '',   '',   '',   '',   'T6'],
    ['Nguyen-Duc et al. (2023)',     '',   '',   '',   '',   '',   'T6'],
    ['Becker et al. (2023)',         '',   '',   '',   '',   '',   'T6'],
    ['Ji et al. (2024)',             '',   '',   '',   'T4', '',   'T6'],
];

children.push(makeTable(
    ['Paper', 'T1 Found.', 'T2 Iterative', 'T3 Mitig.', 'T4 Supply', 'T5 Bench.', 'T6 Policy'],
    matrixData,
    [2000, 900, 1000, 900, 900, 900, 1026]
));
children.push(...sp(1));

children.push(pageBreak());

module.exports = base;
