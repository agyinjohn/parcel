'use strict';
const base = require('./litreview_p3d.cjs');
const { children, h1, h2, h3, h4, body, bodyNI, sp, pageBreak, paperReview } = base;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 6 — THEME 5: EVALUATION BENCHMARKS AND DATASETS
// ═════════════════════════════════════════════════════════════════════════════

children.push(h1('6.  Theme 5: Evaluation Benchmarks and Datasets'));

// ── 6.1 Overview ──────────────────────────────────────────────────────────────
children.push(h2('6.1  Overview'));
children.push(body(
    'Seven papers form this cluster, covering the construction and evaluation of dedicated ' +
    'security benchmarks for LLM code generation assessment. The benchmark landscape has matured ' +
    'significantly since SecurityEval (2022) introduced the first dedicated security evaluation ' +
    'dataset. CodeSecEval (2024) now provides the most comprehensive CWE coverage for Python. ' +
    'The multi-scanner LLM-CSEC validation confirms that no single tool is sufficient for ' +
    'reliable detection. These resources directly support this research\'s experimental design ' +
    'and provide the seed materials for the iterative refinement experiments.'
));
children.push(body(
    'The critical observation across all seven papers is that every benchmark was designed for ' +
    'one-shot evaluation. None provides iterative refinement scenarios, multi-turn code evolution ' +
    'datasets, or degradation trajectory labelling. The annotated iterative code sample dataset ' +
    'this research will produce will itself be a benchmark contribution to the community that ' +
    'does not currently exist anywhere in the literature.'
));

// ── 6.2 Individual Paper Reviews ──────────────────────────────────────────────
children.push(h2('6.2  Individual Paper Reviews'));

children.push(...paperReview(
    'Paper 31: Wang, J., et al. (2024). CodeSecEval: A Comprehensive Benchmark for Code Security Evaluation. arXiv:2407.02395.',
    'Motivated by the fragmented state of security evaluation benchmarks, Wang et al. developed ' +
    'CodeSecEval to provide comprehensive and standardised evaluation coverage of LLM code ' +
    'security across a wide range of CWE types.',
    'Benchmark construction using 180 Python coding tasks covering 44 vulnerability types across ' +
    'two subsets: SecEvalBase with 67 items from the 2023 CWE Top 25, and SecEvalPlus with 113 ' +
    'synthesised items. Evaluation of multiple LLMs against the benchmark.',
    'CodeSecEval provides the most comprehensive CWE coverage of any Python security benchmark. ' +
    'This is the primary source of seed code samples for this research\'s experiments, selected ' +
    'for its comprehensive CWE coverage and Python focus, which aligns with the language ' +
    'extension goal relative to the base paper.',
    'The comprehensive CWE coverage and Python focus are directly relevant to this research. ' +
    'The limitation is the synthetic construction of SecEvalPlus, which may not fully represent ' +
    'real-world coding patterns encountered in iterative development workflows.'
));

children.push(...paperReview(
    'Paper 32: Siddiq, M.L., and Santos, J.C.S. (2022). SecurityEval Dataset: Mining Vulnerability Examples to Evaluate Machine Learning-Based Code Generation Techniques. MSR4P&S 2022.',
    'Motivated by the absence of standardised security benchmarks for evaluating ML code ' +
    'generation, Siddiq and Santos constructed SecurityEval as the first dedicated security ' +
    'benchmark for LLM code generation evaluation.',
    'Construction of 121 Python coding questions covering 69 CWE types through systematic ' +
    'mining of vulnerability examples from academic and open-source sources.',
    'SecurityEval established the benchmark methodology that subsequent datasets have extended. ' +
    'It covers 69 CWE types across 121 tasks, making it the most CWE-diverse benchmark in the ' +
    'literature. Used in this research as a secondary source of seed samples and for ' +
    'cross-validation against CodeSecEval findings.',
    'The pioneering status and CWE diversity are the key contributions. The limitation is the ' +
    'relatively small sample size and the age of some vulnerability examples relative to the ' +
    'current LLM generation landscape.'
));

children.push(...paperReview(
    'Paper 33: Tony, C., Ferreyra, N.E.D., Scandariato, R., and Bose, D. (2023). LLMSecEval: A Dataset of Natural Language Prompts for Security Evaluations. IEEE MSR 2023.',
    'Motivated by the need for realistic natural language prompts for security evaluation rather ' +
    'than synthetic code templates, Tony et al. constructed LLMSecEval to enable evaluation ' +
    'using prompts that mirror how developers actually interact with LLMs.',
    'Construction of natural language security evaluation prompts derived from real developer ' +
    'interactions and security documentation. Evaluation of multiple LLMs against the prompt ' +
    'dataset.',
    'LLMSecEval provides natural language prompts that mirror real developer interactions. In ' +
    'this research, the dataset serves a dual purpose: as a source of seed code samples and as ' +
    'a source of refinement request prompts for the automated loop baseline conditions.',
    'The natural language framing is more ecologically valid than synthetic code templates. The ' +
    'limitation is the potential mismatch between the prompts\' original context and iterative ' +
    'refinement dynamics, where prompts evolve across turns rather than being issued in isolation.'
));

children.push(...paperReview(
    'Paper 34: Bhatt, M., et al. / Meta (2023, updated 2024). CyberSecEval: A Benchmark for Evaluating the Cybersecurity Risks of Large Language Models.',
    'Motivated by the need for industry-credible, multi-dimensional security evaluation across ' +
    'LLMs, Meta developed CyberSecEval as a comprehensive benchmark covering insecure code ' +
    'generation, cyberattack facilitation, and other security dimensions.',
    'Multi-dimensional benchmark construction covering insecure code generation, cyberattack ' +
    'facilitation, and other security dimensions. Evaluation across multiple LLMs using ' +
    'standardised prompting.',
    'CyberSecEval provides industry-credible baseline rates across multiple LLMs. Its ' +
    'multi-dimensional coverage and Meta\'s institutional backing make it a useful ' +
    'cross-validation resource and provides baseline rates for the models tested in this ' +
    'research, specifically Claude and GPT-4o.',
    'The industry backing and multi-LLM coverage are the key strengths. The limitation is the ' +
    'breadth-over-depth tradeoff, which means security-specific vulnerability rates are less ' +
    'granular than specialised benchmarks like CodeSecEval.'
));

children.push(...paperReview(
    'Paper 35: Yang, Z., et al. (2024). SecCodePLT: A Unified Platform for Evaluating the Security of Code GenAI.',
    'Motivated by the need for large-scale, multi-LLM evaluation with synthesised problems, ' +
    'Yang et al. developed SecCodePLT to enable systematic comparison across models at scale.',
    'Construction of 1,345 synthesised coding problems from 5 seed questions per CWE. ' +
    'Evaluation of 4 LLMs across the benchmark.',
    '40 to 65% vulnerable code found across 4 LLMs. This dataset\'s multi-LLM, large-scale ' +
    'design informs the experimental scale of this research and provides comparative ' +
    'vulnerability rates for Claude and GPT-4o that serve as one-shot baselines against which ' +
    'iterative degradation findings will be measured.',
    'The large scale and multi-LLM coverage are genuine contributions. The limitation is the ' +
    'synthetic construction from seed questions, which may produce less diverse vulnerability ' +
    'patterns than organically sampled code.'
));

children.push(...paperReview(
    'Paper 36: arXiv:2509.22097 (2025). SecureAgentBench: Benchmarking LLM Agents for Secure Coding.',
    'Motivated by the absence of benchmarks for agentic code generation security, this study ' +
    'developed SecureAgentBench to cover realistic vulnerability conditions beyond simple CWE ' +
    'templates in agentic settings.',
    'Benchmark construction for agentic code generation scenarios with realistic vulnerability ' +
    'conditions. Evaluation of multiple LLMs in agentic settings.',
    'SecureAgentBench focuses on agentic code generation scenarios with realistic vulnerability ' +
    'conditions. This benchmark is relevant to future PhD extensions of this research into ' +
    'agentic AI systems and is noted as an emerging resource for the broader research community.',
    'The agentic focus is genuinely novel and represents the frontier of the benchmark landscape. ' +
    'For this research, the agentic scope is out of bounds for the MPhil phase but directly ' +
    'informs future PhD work on autonomous iterative refinement systems.'
));

children.push(...paperReview(
    'Paper 37: Shahid, U., et al. (2025). LLM-CSEC Three-Scanner Validation Study. arXiv, 2025.',
    'Motivated by the inconsistency of single-scanner security evaluations, this study validated ' +
    'multi-scanner approaches to improve detection reliability in LLM security benchmarking.',
    'Comparative evaluation using CodeQL, Snyk, and CodeShield simultaneously on the same ' +
    'LLM-generated code samples. Detection rate comparison across scanners and models.',
    'Multi-tool scanning is necessary for reliable detection as no single scanner captures all ' +
    'vulnerability types. This directly supports the multi-scanner approach in SecureLoop\'s ' +
    'scanner engine and the automated checkpointing approach that runs multiple scanners at ' +
    'each iteration boundary.',
    'The multi-scanner validation is directly relevant and actionable for SecureLoop\'s design. ' +
    'This paper partially overlaps with Paper 22 and the distinction should be maintained ' +
    'between the general LLM-CSEC evaluation and this specific multi-scanner validation study.'
));

// ── 6.3 Thematic Discussion ───────────────────────────────────────────────────
children.push(h2('6.3  Thematic Discussion'));
children.push(body(
    'The benchmark landscape has matured from a single 121-task dataset in 2022 to a rich ' +
    'ecosystem of complementary resources by 2025. CodeSecEval (2024) provides the most ' +
    'comprehensive Python CWE coverage and serves as the primary seed source for this research. ' +
    'SecurityEval (2022) provides the broadest CWE diversity for cross-validation. LLMSecEval ' +
    '(2023) provides ecologically valid natural language prompts. CyberSecEval and SecCodePLT ' +
    'provide multi-LLM baseline rates. The three-scanner validation of Shahid et al. (2025) ' +
    'confirms that reliable detection requires multiple tools applied simultaneously.'
));
children.push(body(
    'The unifying limitation is that every benchmark was designed for one-shot evaluation. None ' +
    'provides iterative refinement scenarios, multi-turn code evolution trajectories, or ' +
    'degradation labelling across iterations. This means that the experimental methodology of ' +
    'this research, which tracks vulnerability accumulation across 10 iterations per sample ' +
    'across three LLMs, will produce a dataset type that does not currently exist. The annotated ' +
    'iterative code sample dataset produced as a byproduct of this research will itself be a ' +
    'community resource, filling a benchmark gap that is as significant as the research gap ' +
    'it is designed to investigate.'
));

children.push(pageBreak());

module.exports = base;
