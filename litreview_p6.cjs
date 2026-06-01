'use strict';
const base = require('./litreview_p5.cjs');
const {
    children, h1, h2, h3, h4,
    body, bodyNI, bullet, sp, pageBreak,
    run, runB, runI, centered,
    Document, Packer, Paragraph, TextRun, Footer,
    AlignmentType, HeadingLevel, BorderStyle, WidthType,
    LevelFormat, PageNumber, PageBreak,
    BLACK, WHITE, DGRAY, MGRAY, BORDER
} = base;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 12 — CONCLUSION
// ═════════════════════════════════════════════════════════════════════════════

children.push(h1('12.  Conclusion'));

children.push(body(
    'This literature review has examined 42 papers across six thematic clusters to establish ' +
    'the scholarly foundations for the SecureLoop research project. Three overarching ' +
    'conclusions emerge from the synthesis.'
));

children.push(body(
    'First, the foundational evidence base is robust and convergent. AI code generation tools ' +
    'produce vulnerable code at significant rates in one-shot settings, experienced developers ' +
    'fail to identify these vulnerabilities due to automation bias, and newer model versions do ' +
    'not resolve the problem. This is not a contested finding but a well-replicated empirical ' +
    'consensus across eight independent studies spanning 2022 to 2025, confirmed in both ' +
    'controlled laboratory settings and production codebases.'
));

children.push(body(
    'Second, the iterative literature confirms that the problem is substantially worse than ' +
    'one-shot studies suggest. Shukla et al. (2025) established a 37.6% increase in critical ' +
    'vulnerabilities after five iterations under automated conditions, with vulnerability counts ' +
    'rising non-linearly from 2.1 to 6.2 per sample across ten iterations. Every mitigation ' +
    'approach that exists was designed before this finding was published and has not been ' +
    'evaluated against it. The entire mitigation literature requires re-evaluation in iterative ' +
    'contexts, which is the primary technical contribution of this research.'
));

children.push(body(
    'Third, the supply chain dimension is real, demonstrated, and entirely unstudied in ' +
    'iterative contexts. Slopsquatting is not theoretical: it has been executed successfully ' +
    'at scale with thousands of real downloads of a malicious hallucinated package. Whether ' +
    'the iterative refinement process amplifies supply chain risk through accumulating code ' +
    'complexity is one of the most practically important unanswered questions in the field.'
));

children.push(body(
    'The proposed research will produce four contributions. First, the first empirical ' +
    'characterisation of human-in-the-loop iterative security degradation across multiple ' +
    'LLMs. Second, the first multi-model iterative degradation comparison across Claude, ' +
    'GPT-4o, and GitHub Copilot. Third, the first empirical mapping of iterative refinement ' +
    'to supply chain CWE patterns. Fourth, the first evaluated end-to-end mitigation artifact ' +
    'for iterative AI code refinement security. The annotated iterative code sample dataset ' +
    'produced as a byproduct will itself be a community resource that does not currently ' +
    'exist anywhere in the literature.'
));

children.push(body(
    'With Gartner projecting that 70% of developers will use AI coding assistants by 2027, ' +
    'and Veracode documenting a tenfold increase in AI-introduced vulnerabilities in a single ' +
    'year, the absence of validated human oversight frameworks specifically designed for ' +
    'iterative refinement workflows represents a growing and urgent risk. This research is ' +
    'designed to fill that gap with theoretical rigour, empirical grounding, and practical ' +
    'deployability.'
));

children.push(pageBreak());

// ═════════════════════════════════════════════════════════════════════════════
// REFERENCES
// ═════════════════════════════════════════════════════════════════════════════

children.push(h1('References'));

const refs = [
    'Becker, B.A., et al. (2023). Programming is hard — or at least it used to be: Educational opportunities and challenges of AI code generation. ACM SIGCSE 2023.',
    'Bhatt, M., et al. / Meta. (2023, updated 2024). CyberSecEval: A benchmark for evaluating the cybersecurity risks of large language models. Meta AI Research.',
    'Chong, Z., Yao, Y., and Neamtiu, I. (2024). Artificial-intelligence generated code considered harmful. arXiv:2409.19182.',
    'CodingCare Framework. (2025). CodingCare: Static analysis with LLM-based remediation for supply chain security. ACM ISCCN 2025.',
    'Cotroneo, D., De Luca, G., and Liguori, P. (2025). DeVAIC: A tool for security assessment of AI-generated code. Information and Software Technology, 2025.',
    'Dark Reading / SecurityWeek. (2025). AI code tools hallucinate packages at scale. April 2025.',
    'Endor Labs. (2024). Most common security vulnerabilities in AI-generated code. Industry Report.',
    'ExtraHop. (2025). 2025 security predictions: Attacks on the AI supply chain. Industry Report.',
    'Fakih, M., Dhiman, A., Keshk, M., Moustafa, N., and Turnbull, B. (2025). LLM4CVE: Iterative automated vulnerability repair using LLMs. arXiv:2501.03446.',
    'Gartner. (2024). Gartner predicts 70% of developers will use AI coding assistants by 2027. Gartner Research.',
    'GitHub. (2024). Survey reveals AI\'s impact on the developer experience. GitHub Blog.',
    'Hevner, A.R., March, S.T., Park, J., and Ram, S. (2004). Design science in information systems research. MIS Quarterly, 28(1), 75-105.',
    'Islam, M.R., Karkevandi, M.S., and Najafirad, P. (2024). Towards a robust framework for RL-based vulnerability repair. arXiv:2401.07031.',
    'Ji, C., Jun, A., Wu, C., and Gelles, R. (2024). Cybersecurity risks of AI-generated code. Georgetown Center for Security and Emerging Technology Policy Brief, November 2024.',
    'Khoury, R., Avila, A.R., Brunelle, J., and Camara, B.M. (2023). How secure is code generated by ChatGPT? IEEE SMC 2023.',
    'Li, J., et al. (2025). Emergent supply chain threats from LLM-generated code. 2025.',
    'Liu, S., Le-Cong, T., Widyasari, R., and Lo, D., et al. (2024). Refining ChatGPT-generated code: Characterizing and mitigating code quality issues. ACM TOSEM 2024.',
    'Majdinasab, V., Nikanjam, A., Khomh, F., and Desmarais, M.C. (2024). Assessing the effectiveness of LLMs in Android application vulnerability analysis. IEEE SANER 2024.',
    'McAleese, N., et al. (2024). LLM critics help catch LLM bugs. arXiv:2407.00215.',
    'Mohsin, A., Janicke, H., Wood, A., and Sarker, S. (2024). Evaluating security of LLM-generated code: A multi-model analysis. arXiv:2406.12513.',
    'Negri-Ribalta, C., Geraud-Stewart, R., Sergeeva, A., and Lenzini, G. (2024). A systematic literature review on security of AI-generated code. Frontiers in Big Data, 2024.',
    'Nguyen-Duc, A., Cabrero-Daniel, B., Przybylek, A., et al. (2023). Generative AI for software engineering research agenda. arXiv:2310.18648.',
    'Pearce, H., Ahmad, B., Tan, B., Dolan-Gavitt, B., and Karri, R. (2022). Asleep at the keyboard? Assessing the security of GitHub Copilot\'s code contributions. IEEE S&P 2022.',
    'Pearce, H., Tan, B., Ahmad, B., Karri, R., and Dolan-Gavitt, B. (2023). Examining zero-shot vulnerability repair with large language models. IEEE S&P 2023.',
    'Peffers, K., Tuunanen, T., Rothenberger, M.A., and Chatterjee, S. (2007). A design science research methodology for information systems research. Journal of Management Information Systems, 24(3), 45-77.',
    'Perry, N., Srivastava, M., Kumar, D., and Boneh, D. (2023). Do users write more insecure code with AI assistants? ACM CCS 2023.',
    'Sandoval, G., Pearce, H., Nys, T., Karri, R., Garg, S., and Dolan-Gavitt, B. (2023). Lost at C: A user study on the security implications of large language model code assistants. USENIX Security 2023.',
    'Shahid, U., Al-Shaer, E., and Rashid, A. (2025). LLM-CSEC: Evaluating LLMs for cybersecurity code generation. arXiv, 2025.',
    'Shukla, R., Joshi, A., and Syed, Z. (2025). Security degradation in iterative AI code generation: A systematic analysis of the paradox. IEEE-ISTAS 2025. arXiv:2506.11022.',
    'Siddiq, M.L., and Santos, J.C.S. (2022). SecurityEval dataset: Mining vulnerability examples to evaluate machine learning-based code generation techniques. MSR4P&S 2022.',
    'Siddiq, M.L., and Santos, J.C.S. (2023). LLMSecEval: A dataset of natural language prompts for security evaluations. IEEE MSR 2023.',
    'Sonar. (2026). State of code: Developer survey 2026.',
    'Spracklen, L., et al. (2025). We have a package for you! A comprehensive analysis of package hallucinations by code generating LLMs. USENIX Security 2025.',
    'Tony, C., Ferreyra, N.E.D., Mutas, M., Dhiff, S., and Scandariato, R. (2024). LLMSecGuard: A framework for evaluating secure code generation by LLMs. arXiv:2407.07064.',
    'Tony, C., Ferreyra, N.E.D., Scandariato, R., and Bose, D. (2023). LLMSecEval: A dataset of natural language prompts for security evaluations. IEEE MSR 2023.',
    'Venable, J.R., Pries-Heje, J., and Baskerville, R. (2012). A comprehensive framework for evaluation in design science research. DESRIST 2012.',
    'Veracode. (2025). 2025 GenAI code security report. Veracode Research.',
    'Wang, J., et al. (2024). CodeSecEval: A comprehensive benchmark for code security evaluation. arXiv:2407.02395.',
    'Yang, Z., et al. (2024). SecCodePLT: A unified platform for evaluating the security of code GenAI. 2024.',
    'arXiv:2412.15004. (2025). From vulnerabilities to remediation: A systematic literature review of LLM code security.',
    'arXiv:2501.19012. (2025). Importing phantoms: Evidencing the slopsquatting supply chain attack. ICML 2025.',
    'arXiv:2502.06039. (2025). Benchmarking prompt engineering techniques for secure code generation.',
    'arXiv:2503.15554. (2025). Rethinking the evaluation of secure code generation: A comprehensive study of mitigation methods.',
    'arXiv:2506.23034. (2025). Feedback-driven security patching (FDSP) for LLM-generated code.',
    'arXiv:2507.02976. (2025). Safety of LLM-generated patches in agentic automated program repair.',
    'arXiv:2509.22097. (2025). SecureAgentBench: Benchmarking LLM agents for secure coding.',
    'arXiv:2510.26103. (2025). Large-scale analysis of AI-generated code vulnerabilities in public GitHub repositories.',
    'arXiv:2601.07084. (2025). Adversarial robustness of secure code generation defences.',
];

refs.forEach(ref => {
    children.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 0, after: 160, line: 320 },
        indent: { left: 720, hanging: 720 },
        children: [new TextRun({ text: ref, font: 'Times New Roman', size: 22, color: DGRAY })]
    }));
});

// ═════════════════════════════════════════════════════════════════════════════
// FINAL DOCUMENT BUILD
// ═════════════════════════════════════════════════════════════════════════════

const doc = new Document({
    numbering: {
        config: [{
            reference: 'bullets',
            levels: [{
                level: 0,
                format: LevelFormat.BULLET,
                text: '\u2022',
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 720, hanging: 360 } } }
            }]
        }]
    },
    styles: {
        default: {
            document: { run: { font: 'Times New Roman', size: 24, color: DGRAY } }
        },
        paragraphStyles: [
            {
                id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
                run: { size: 36, bold: true, font: 'Times New Roman', color: BLACK },
                paragraph: { spacing: { before: 480, after: 200 }, outlineLevel: 0 }
            },
            {
                id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
                run: { size: 30, bold: true, font: 'Times New Roman', color: BLACK },
                paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 }
            },
            {
                id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
                run: { size: 26, bold: true, font: 'Times New Roman', color: BLACK },
                paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 }
            }
        ]
    },
    sections: [{
        properties: {
            page: {
                size: { width: 11906, height: 16838 },
                margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 }
            }
        },
        headers: {
            default: new (require('docx').Header)({
                children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER, space: 4 } },
                    children: [new TextRun({
                        text: 'SecureLoop: MPhil Literature Review',
                        font: 'Times New Roman', size: 18, color: MGRAY
                    })]
                })]
            })
        },
        footers: {
            default: new Footer({
                children: [new Paragraph({
                    alignment: AlignmentType.CENTER,
                    border: { top: { style: BorderStyle.SINGLE, size: 4, color: BORDER, space: 4 } },
                    children: [
                        new TextRun({ text: 'Page ', font: 'Times New Roman', size: 18, color: MGRAY }),
                        new TextRun({ children: [PageNumber.CURRENT], font: 'Times New Roman', size: 18, color: MGRAY }),
                        new TextRun({ text: ' of ', font: 'Times New Roman', size: 18, color: MGRAY }),
                        new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Times New Roman', size: 18, color: MGRAY }),
                    ]
                })]
            })
        },
        children
    }]
});

const fs = require('fs');
fs.mkdirSync('./outputs', { recursive: true });

Packer.toBuffer(doc).then(buf => {
    fs.writeFileSync('./outputs/SecureLoop_LitReview_Final.docx', buf);
    console.log('Done. File: ./outputs/SecureLoop_LitReview_Final.docx');
    console.log('Total children:', children.length);
}).catch(e => {
    console.error('Build error:', e.message);
    process.exit(1);
});
