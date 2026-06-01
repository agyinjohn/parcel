'use strict';
const base = require('./litreview_p3c.cjs');
const { children, h1, h2, h3, h4, body, bodyNI, sp, pageBreak, paperReview } = base;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 5 — THEME 4: SOFTWARE SUPPLY CHAIN RISK FROM AI-GENERATED CODE
// ═════════════════════════════════════════════════════════════════════════════

children.push(h1('5.  Theme 4: Software Supply Chain Risk from AI-Generated Code'));

// ── 5.1 Overview ──────────────────────────────────────────────────────────────
children.push(h2('5.1  Overview'));
children.push(body(
    'Seven papers form this cluster, spanning large-scale empirical hallucination studies, ' +
    'real-world attack demonstrations, LLM-specific supply chain threat characterisation, ' +
    'industry analyses of CVE reintroduction, and policy-level synthesis. Together they establish ' +
    'that AI code generation introduces specific and novel supply chain risks beyond classical ' +
    'vulnerability categories, that these risks are not theoretical but have been demonstrated ' +
    'in production environments, and that the scale of exposure is growing rapidly with AI ' +
    'adoption rates.'
));
children.push(body(
    'The critical gap in this cluster mirrors that of the mitigation literature: all supply chain ' +
    'studies were conducted in single-turn settings. No study has investigated whether iterative ' +
    'refinement amplifies slopsquatting rates, increases CVE-adjacent library suggestions, or ' +
    'disproportionately produces supply chain CWEs as code complexity accumulates across ' +
    'iterations. This is the fourth research gap this project addresses.'
));

// ── 5.2 Individual Paper Reviews ──────────────────────────────────────────────
children.push(h2('5.2  Individual Paper Reviews'));

children.push(...paperReview(
    'Paper 24: Spracklen, L., et al. (2025). We Have a Package for You! A Comprehensive Analysis of Package Hallucinations by Code Generating LLMs. USENIX Security 2025.',
    'Motivated by anecdotal reports of LLMs hallucinating package names, Spracklen et al. ' +
    'conducted the first large-scale systematic study of package hallucination rates across ' +
    'LLMs and programming languages.',
    'Analysis of 576,000 code samples across 16 LLMs. Package imports extracted and validated ' +
    'against public registries. Hallucination rates calculated by model, language, and CWE ' +
    'category.',
    'Nearly 20% of Python samples contained hallucinated package imports. Alarmingly, 43% of ' +
    'hallucinated names appeared repeatedly across multiple prompts, making them predictable and ' +
    'registerable by attackers. The paper coined the term slopsquatting for the attack vector. ' +
    'This study provides the empirical foundation for the Supply Chain Risk Analyser module ' +
    'in SecureLoop.',
    'The scale of 576,000 samples across 16 LLMs and the methodological rigour make this the ' +
    'most authoritative supply chain study in the literature. The finding that hallucinations ' +
    'repeat predictably is the key security insight. The limitation is the single-turn scope, ' +
    'leaving iterative amplification of hallucination rates entirely unstudied.'
));

children.push(...paperReview(
    'Paper 25: arXiv:2501.19012 (2025). Importing Phantoms: Evidencing the Slopsquatting Supply Chain Attack. ICML 2025.',
    'Motivated by Spracklen et al.\'s theoretical risk documentation, this study sought to ' +
    'demonstrate that the slopsquatting attack is not merely theoretical but has been successfully ' +
    'executed in practice.',
    'End-to-end attack demonstration: a hallucinated package named securehashlib was published ' +
    'to PyPI and download metrics collected. Victim analysis conducted to assess real-world impact.',
    'The securehashlib package was downloaded thousands of times before removal. This transforms ' +
    'the theoretical risk documented by Spracklen et al. into a demonstrated real-world attack ' +
    'chain and is cited as direct evidence of supply chain risk in this research\'s motivation.',
    'The end-to-end real-world demonstration is a critical contribution that moves the supply ' +
    'chain risk from theoretical to confirmed. The limitation is the single-case study design, ' +
    'which cannot establish base rates for successful slopsquatting attacks across different ' +
    'LLMs or development contexts.'
));

children.push(...paperReview(
    'Paper 26: Li, J., et al. (2025). Emergent Supply Chain Threats from LLM-Generated Code.',
    'Motivated by the gap between traditional supply chain security frameworks and the novel ' +
    'threat patterns introduced by LLM code generation, Li et al. characterised the specific ' +
    'supply chain threats that are unique to AI-generated code.',
    'Systematic characterisation of LLM-specific supply chain threat patterns, combining ' +
    'literature analysis with empirical code analysis. Comparison against classical supply ' +
    'chain CWE categories.',
    'LLM-generated code introduces supply chain threats beyond classical CWE classes, calling ' +
    'for LLM-aware supply chain defences and CI/CD integration. This paper directly supports ' +
    'the framing of this research\'s supply chain analysis dimension and argues that standard ' +
    'CWE-based analysis is insufficient for AI-generated code.',
    'The LLM-specific threat characterisation is genuinely novel and directly actionable for ' +
    'SecureLoop\'s supply chain module design. The limitation is the absence of iterative ' +
    'refinement analysis, which is precisely the dimension this research adds.'
));

children.push(...paperReview(
    'Paper 27: Endor Labs (2024). Most Common Security Vulnerabilities in AI-Generated Code. Industry Report.',
    'Motivated by the practical need to advise development teams on AI code generation risks, ' +
    'Endor Labs conducted an industry study documenting specific supply chain vectors arising ' +
    'from LLM training cutoffs.',
    'Industry analysis of LLM suggestions across a large sample of enterprise codebases, with ' +
    'specific focus on dependency recommendations and CVE status of suggested libraries.',
    'LLMs suggest libraries with known CVEs that have been patched after the model\'s training ' +
    'cutoff, effectively reintroducing resolved vulnerabilities into production code. This is a ' +
    'specific and underappreciated supply chain vector captured through the supply chain risk ' +
    'flagging in SecureLoop\'s scanner engine.',
    'The training cutoff CVE reintroduction finding is practically important and underrepresented ' +
    'in academic literature. The limitation is the industry report format without full ' +
    'methodological transparency or peer review.'
));

children.push(...paperReview(
    'Paper 28: ExtraHop (2025). 2025 Security Predictions: Attacks on the AI Supply Chain. Industry Report.',
    'Motivated by the rapid growth of AI-assisted development and its supply chain implications, ' +
    'ExtraHop\'s 2025 report examined the intersection of AI code adoption and software supply ' +
    'chain security at scale.',
    'Industry survey and telemetry analysis across enterprise environments. Developer survey ' +
    'combined with network traffic analysis to quantify AI code tool adoption and supply chain ' +
    'exposure.',
    '67% of developers say over a quarter of their code comes from open source libraries; only ' +
    '20% use Software Bills of Materials; PyPI requests increased 87% year-on-year driven by AI ' +
    'adoption. These statistics establish the scale at which AI-generated code enters the supply ' +
    'chain and directly motivate the supply chain risk dimension of this research.',
    'The scale statistics are practically important for establishing research significance. The ' +
    'limitation is the industry report format and the absence of controlled vulnerability analysis.'
));

children.push(...paperReview(
    'Paper 29: Dark Reading / SecurityWeek (2025). AI Code Tools Hallucinate Packages at Scale. Industry Reporting, April 2025.',
    'Motivated by the growing evidence of package hallucination risks, this industry reporting ' +
    'synthesised findings from multiple vendors and researchers to quantify the conversion of ' +
    'hallucinated names into actual malicious uploads.',
    'Synthesis of vendor data, researcher reports, and registry analysis to quantify ' +
    'hallucination-to-attack conversion rates across LLMs in 2024.',
    '20 to 35% of hallucinated package names were converted into actual malicious uploads in ' +
    '2023. Hallucination rates of 5 to 38% were observed across leading LLMs in 2024. These ' +
    'figures provide the quantitative basis for the slopsquatting risk score in SecureLoop\'s ' +
    'Supply Chain Risk Analyser module.',
    'The conversion rate statistics are practically important for calibrating risk scores. The ' +
    'limitation is the industry reporting format without peer review or full methodological ' +
    'transparency.'
));

children.push(...paperReview(
    'Paper 30: Ji, C., Jun, A., Wu, C., and Gelles, R. (2024). Cybersecurity Risks of AI-Generated Code. Georgetown CSET Policy Brief, November 2024.',
    'Motivated by the policy gap around AI-generated code security, Ji et al. produced a ' +
    'policy-level synthesis of cybersecurity risks for policymakers and technology ' +
    'decision-makers.',
    'Policy analysis combining literature synthesis, expert consultation, and risk assessment. ' +
    'Coverage of training data risks, adversarial attacks, and supply chain implications.',
    'Almost 50% of AI-generated code contains exploitable bugs. The brief covered training data ' +
    'risks, adversarial attacks, and supply chain implications at a policy level. This document ' +
    'establishes the policy significance of this research and is cited in the significance ' +
    'section of the proposal. It appears in both the supply chain and policy themes due to its ' +
    'cross-cutting coverage.',
    'The policy-level framing provides important legitimising context for this research\'s ' +
    'significance. The limitation is the non-technical nature of the analysis, which does not ' +
    'add empirical findings beyond synthesis.'
));

// ── 5.3 Thematic Discussion ───────────────────────────────────────────────────
children.push(h2('5.3  Thematic Discussion'));
children.push(body(
    'The supply chain literature established three things with confidence. First, package ' +
    'hallucination is a real and measurable phenomenon: Spracklen et al. (2025) documented ' +
    'hallucination rates of nearly 20% in Python samples across 576,000 code samples, with 43% ' +
    'of hallucinated names repeating predictably across prompts. Second, the attack is not ' +
    'theoretical: arXiv:2501.19012 (2025) demonstrated a successful end-to-end slopsquatting ' +
    'attack with thousands of real downloads. Third, LLM-specific supply chain threats extend ' +
    'beyond classical CWE categories: Li et al. (2025) established that standard CWE-based ' +
    'analysis is insufficient for AI-generated code, and Endor Labs (2024) documented the ' +
    'specific training cutoff CVE reintroduction vector.'
));
children.push(body(
    'The critical gap is the complete absence of iterative refinement analysis in this cluster. ' +
    'Every supply chain study was conducted in single-turn settings. As code complexity ' +
    'accumulates across multiple refinement iterations, the probability of hallucinated imports ' +
    'and CVE-adjacent dependency suggestions may increase non-linearly, mirroring the ' +
    'vulnerability accumulation pattern documented by Shukla et al. (2025). Whether this is ' +
    'the case is entirely unknown and constitutes the third research question this project ' +
    'addresses. The Supply Chain Risk Analyser module in SecureLoop is designed specifically ' +
    'to measure and flag this dimension across iterative refinement sessions.'
));

children.push(pageBreak());

module.exports = base;
