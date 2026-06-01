'use strict';
const base = require('./litreview_p3e.cjs');
const { children, h1, h2, h3, h4, body, bodyNI, sp, pageBreak, paperReview } = base;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 7 — THEME 6: SYSTEMATIC REVIEWS AND POLICY LITERATURE
// ═════════════════════════════════════════════════════════════════════════════

children.push(h1('7.  Theme 6: Systematic Reviews and Policy Literature'));

// ── 7.1 Overview ──────────────────────────────────────────────────────────────
children.push(h2('7.1  Overview'));
children.push(body(
    'Five papers form this cluster, comprising two systematic literature reviews, one research ' +
    'agenda paper, one educational analysis, and one policy brief. Together they provide ' +
    'overarching synthesis and policy context for the field. They confirm the field-wide ' +
    'consensus that AI code generation security is a serious and unsolved problem, establish ' +
    'the policy significance that motivates this research, and position the work within the ' +
    'broader software engineering and cybersecurity research communities.'
));
children.push(body(
    'The binding limitation of this cluster is temporal: the most rigorous systematic review, ' +
    'Negri-Ribalta et al. (2024), predates the IEEE-ISTAS 2025 base paper and the wave of 2025 ' +
    'supply chain studies reviewed in Theme 4. The updated SLR at arXiv:2412.15004 (2025) ' +
    'partially addresses this but remains a preprint. This means the field currently lacks a ' +
    'peer-reviewed systematic review that incorporates the iterative degradation evidence, ' +
    'further underscoring the novelty of this research.'
));

// ── 7.2 Individual Paper Reviews ──────────────────────────────────────────────
children.push(h2('7.2  Individual Paper Reviews'));

children.push(...paperReview(
    'Paper 38: Negri-Ribalta, C., Geraud-Stewart, R., Sergeeva, A., and Lenzini, G. (2024). A Systematic Literature Review on Security of AI-Generated Code. Frontiers in Big Data, 2024.',
    'Motivated by the rapid growth of primary studies without synthesis, Negri-Ribalta et al. ' +
    'conducted the first rigorous systematic literature review of the AI code generation ' +
    'security field.',
    'Five-stage systematic selection process starting from 3,104 peer-reviewed studies, narrowed ' +
    'to 19 studies meeting rigorous inclusion criteria. PRISMA methodology applied throughout.',
    'The review confirmed high-level agreement that AI models do not produce safe code and ' +
    'introduce vulnerabilities despite mitigation attempts. C was identified as particularly ' +
    'problematic for AI code generation. This SLR is the most authoritative overview of the ' +
    'field and its methodology informs the structure of this literature review.',
    'The rigorous PRISMA methodology and comprehensive scope are the key strengths. The ' +
    'limitation is the publication cutoff, which predates several important 2025 studies ' +
    'including the IEEE-ISTAS 2025 base paper, the FDSP study, and the slopsquatting ' +
    'literature reviewed in Theme 4.'
));

children.push(...paperReview(
    'Paper 39: arXiv:2412.15004 (2025). From Vulnerabilities to Remediation: A Systematic Literature Review of LLM Code Security.',
    'Motivated by the need for a more recent synthesis covering the 2024 to 2025 literature ' +
    'wave, this SLR updated and extended the Negri-Ribalta et al. review with coverage of ' +
    'memory, file management, injection, and deserialization vulnerabilities.',
    'Systematic literature review with updated search covering 2022 to 2025. CWE-level analysis ' +
    'of vulnerability patterns and remediation approaches.',
    'Deserialization vulnerabilities are identified as an open research question in AI-generated ' +
    'code. The CWE-level detail informs the constraint selection in SecureLoop\'s ' +
    'Security-Anchored Prompting Engine and the CWE-to-CVSS mapping in the scanner module.',
    'The updated coverage and CWE-level granularity extend the earlier Negri-Ribalta et al. ' +
    'SLR usefully. The limitation is the arXiv preprint status without peer review, which ' +
    'means its findings should be treated as provisional until formally published.'
));

children.push(...paperReview(
    'Paper 40: Nguyen-Duc, A., Cabrero-Daniel, B., Przybylek, A., et al. (2023). Generative AI for Software Engineering Research Agenda. arXiv:2310.18648.',
    'Motivated by the rapid expansion of generative AI in software engineering without a ' +
    'coordinating research agenda, Nguyen-Duc et al. produced a comprehensive mapping of open ' +
    'problems and research priorities.',
    'Research agenda development through systematic problem mapping, expert consultation, and ' +
    'analysis of the generative AI and software engineering literature.',
    'Security in AI-assisted development is identified as a priority research direction. This ' +
    'paper is useful for positioning this research within the broader software engineering ' +
    'community and validates the relevance of the project at a field-wide level.',
    'The research agenda framing provides useful community positioning context. The limitation ' +
    'is the high-level nature of the analysis, which does not add empirical findings and ' +
    'predates the iterative degradation evidence that has since emerged.'
));

children.push(...paperReview(
    'Paper 41: Becker, B.A., et al. (2023). Programming Is Hard — Or at Least It Used to Be: Educational Opportunities and Challenges of AI Code Generation. ACM SIGCSE 2023.',
    'Motivated by the educational implications of AI code generation, Becker et al. examined ' +
    'how AI tools change the nature of programming education and what this means for developer ' +
    'skill development.',
    'Educational analysis combining survey data from educators and students with analysis of ' +
    'AI code generation tool capabilities and limitations.',
    'AI code generation tools fundamentally change what programming education must cover, with ' +
    'implications for developer security awareness and skill development. This paper provides ' +
    'educational context for the human factors dimension of this research, informing the ' +
    'developer psychology component of the human-in-the-loop experimental design.',
    'The educational framing provides relevant background for the human factors design. The ' +
    'limitation is the educational rather than security focus, making it peripheral rather ' +
    'than central to this research.'
));

children.push(...paperReview(
    'Paper 42: Ji, C., Jun, A., Wu, C., and Gelles, R. (2024). Cybersecurity Risks of AI-Generated Code. Georgetown CSET Issue Brief, November 2024.',
    'This policy brief is reviewed above as Paper 30. It appears in both the Supply Chain and ' +
    'Policy themes due to its cross-cutting coverage of supply chain risks, training data ' +
    'vulnerabilities, and adversarial attack implications.',
    'Policy analysis as described in Paper 30, combining literature synthesis, expert ' +
    'consultation, and risk assessment across multiple dimensions of AI code generation risk.',
    'As described in Paper 30. The policy significance established by this brief is cited in ' +
    'both the supply chain risk and broader significance sections of the research proposal. ' +
    'Its placement in this theme reflects its role as a synthesising policy document that ' +
    'draws on the empirical literature reviewed across all six themes.',
    'As described in Paper 30. The dual theme placement reflects the cross-cutting nature of ' +
    'policy literature across empirical dimensions. The limitation remains the non-technical ' +
    'nature of the analysis.'
));

// ── 7.3 Thematic Discussion ───────────────────────────────────────────────────
children.push(h2('7.3  Thematic Discussion'));
children.push(body(
    'The systematic review and policy literature performs a legitimising function for this ' +
    'research. Negri-Ribalta et al. (2024) provides the most rigorous existing synthesis and ' +
    'confirms the field-wide consensus: AI models do not produce safe code, and mitigation ' +
    'attempts have not resolved the problem. The updated SLR at arXiv:2412.15004 (2025) ' +
    'extends this with CWE-level granularity and identifies deserialization vulnerabilities ' +
    'as an open research question. The Georgetown CSET policy brief establishes policy ' +
    'significance at a level that connects this research to national cybersecurity strategy.'
));
children.push(body(
    'The temporal gap in this cluster is itself a finding. The most rigorous peer-reviewed ' +
    'systematic review predates the iterative degradation evidence, the slopsquatting ' +
    'literature, and the 2025 wave of mitigation studies. This means the field currently ' +
    'lacks an authoritative synthesis that incorporates the most important recent findings. ' +
    'The synthesis section of this literature review, Section 8, is designed to fill that ' +
    'gap for the purposes of this research, drawing together all six themes into a coherent ' +
    'account of what is known, what is contested, and what remains entirely unknown.'
));

children.push(pageBreak());

module.exports = base;
