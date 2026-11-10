from copy import deepcopy
from pathlib import Path

from docx import Document
from docx.enum.text import WD_BREAK


TEMPLATE = Path(r"C:\Users\MUNASHE\Desktop\Proposal template.docx")
OUTPUT = Path(r"C:\Users\MUNASHE\Desktop\defense-sim\output\Jonga_Project_Proposal.docx")


def set_existing_text(paragraph, text):
    """Replace the visible text without changing the template paragraph/run formatting."""
    if paragraph.runs:
        paragraph.runs[0].text = text
        for run in paragraph.runs[1:]:
            run.text = ""
    else:
        paragraph.add_run(text)


def copy_para_format(target, source_ppr, source_rpr):
    target_ppr = target._p.pPr
    if target_ppr is not None:
        target._p.remove(target_ppr)
    if source_ppr is not None:
        target._p.insert(0, deepcopy(source_ppr))
    run = target.add_run()
    if source_rpr is not None:
        target_rpr = run._r.get_or_add_rPr()
        for child in source_rpr:
            target_rpr.append(deepcopy(child))
    return run


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = Document(TEMPLATE)

    # The source template controls the cover-page form and typography.
    cover = {
        0: "A Multilayered Model for Concept Drift Resilient Keystroke Dynamics Authentication",
        2: "By",
        4: "Munashe O. Jonga R228204W",
        7: "Submitted to the University of Zimbabwe in partial fulfilment of the requirements for the",
        9: "BACHELOR OF SCIENCE (HONOURS) DEGREE IN DATA SCIENCE AND INFORMATICS",
        11: "in the",
        12: "Department of Analytics and Informatics",
        13: "FACULTY OF COMPUTER ENGINEERING, INFORMATICS AND COMMUNICATIONS",
        14: "UNIVERSITY OF ZIMBABWE",
        17: "Supervisor: Mr J. Kasiroori",
        18: "",
        20: "JUNE 2026",
    }
    for index, text in cover.items():
        set_existing_text(doc.paragraphs[index], text)

    # Abstract and keywords occupy the template's dedicated slots.
    set_existing_text(doc.paragraphs[26], "Abstract")
    set_existing_text(
        doc.paragraphs[27],
        "Continuous keystroke dynamics authentication can strengthen password-based access control, "
        "but its reliability can decline when legitimate typing behaviour changes because of fatigue, "
        "device changes, stress, injury, and natural behavioural variation. This project aims to design, "
        "develop, and evaluate a multilayered model for concept drift resilient keystroke dynamics "
        "authentication. It uses a Design Science Research methodology supported by quantitative "
        "experimental evaluation. The CMU DSL Keystroke Dynamics Benchmark is used to develop the "
        "benchmark authentication model, while a controlled synthetic stream is used to test drift "
        "monitoring and adaptation. The proposed prototype uses dwell-time and flight-time features, "
        "profile-centred dwell and flight deltas, a class-balanced logistic regression deployment model, "
        "a Streaming Random Patches stream model with Hoeffding Tree learners, and ADWIN for drift "
        "detection. The project produces a reproducible data science pipeline, a browser-based "
        "demonstration dashboard, and a model linking behavioural biometric scoring with model-health "
        "monitoring and decision support.",
    )
    set_existing_text(
        doc.paragraphs[29],
        "Keywords: keystroke dynamics, continuous authentication, behavioural biometrics, concept drift, "
        "stream mining, ADWIN, adaptive learning.",
    )

    # Capture the template's exact formats before removing its instructional placeholder body.
    headings = doc.paragraphs[68]
    normal = doc.paragraphs[69]
    list_item = doc.paragraphs[80]
    heading_ppr = deepcopy(headings._p.pPr)
    heading_rpr = deepcopy(headings.runs[0]._r.rPr)
    normal_ppr = deepcopy(normal._p.pPr)
    normal_rpr = deepcopy(normal.runs[0]._r.rPr)
    list_ppr = deepcopy(list_item._p.pPr)
    list_rpr = deepcopy(list_item.runs[0]._r.rPr)

    # The template contains instructional text from this point onwards, not proposal content.
    body = doc._element.body
    abstract_keywords = doc.paragraphs[29]._element
    after_abstract = False
    for child in list(body):
        if child is abstract_keywords:
            after_abstract = True
            continue
        # Remove both ordinary instruction paragraphs and the template's stale TOC field.
        # Keep the section properties, which contain the template's page geometry.
        if after_abstract and child.tag != "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}sectPr":
            body.remove(child)

    def add_paragraph(text="", kind="normal"):
        p = doc.add_paragraph()
        if kind == "heading":
            run = copy_para_format(p, heading_ppr, heading_rpr)
        elif kind == "list":
            run = copy_para_format(p, list_ppr, list_rpr)
        else:
            run = copy_para_format(p, normal_ppr, normal_rpr)
        run.text = text
        return p

    def heading(text):
        return add_paragraph(text, "heading")

    def body_text(text):
        return add_paragraph(text, "normal")

    def bullet(text):
        return add_paragraph(text, "list")

    # Start the substantive proposal on a fresh page, retaining the reference document's page system.
    page_break = doc.add_paragraph()
    page_break.add_run().add_break(WD_BREAK.PAGE)

    heading("Introduction")
    body_text(
        "Reliable identity verification and authentication are central to digital identity management [1]. "
        "Conventional authentication is commonly concentrated at session entry, while stolen or misused "
        "credentials remain an important attack path [4]. Continuous authentication provides additional "
        "identity evidence during an active session rather than relying solely on the entry-point login "
        "decision [2], [3]."
    )
    body_text(
        "Keystroke dynamics measures timing patterns produced when a person types. Key-press and "
        "key-release timestamps produce dwell-time and flight-time features; this captures how a user "
        "types rather than the content typed. The approach can be collected from ordinary keyboard events "
        "without specialised hardware [5]-[10]."
    )

    heading("Motivation")
    body_text(
        "Typing behaviour is not stationary. Fatigue, device changes, stress, injury, and natural "
        "behavioural variation can alter keystroke timing [11]-[13]. Concept-drift research shows that a "
        "model may lose reliability when the data-generating context changes [14], [15]. A static "
        "keystroke model can therefore increase false rejections when legitimate behaviour evolves, even "
        "when its initial benchmark accuracy is high."
    )
    body_text(
        "The source literature identifies an integration gap: classification, drift detection, adaptation, "
        "and operational feedback are commonly evaluated in isolation. The proposed project brings them "
        "together in one multilayered resilience model and evaluates it through a public benchmark protocol "
        "and a controlled drift stream."
    )

    heading("Premises of the Research")
    body_text(
        "The project is grounded in Behavioural Biometrics Theory and Concept Drift Theory. Behavioural "
        "biometrics treats repeated human actions as measurable identity evidence, while concept drift "
        "explains why a model trained on historical observations may become less reliable when conditions "
        "evolve. Together, these premises support a model that classifies current behaviour relative to an "
        "enrolled profile and monitors whether prediction error indicates a changed profile-model relationship."
    )
    body_text(
        "The source identifies NIST Digital Identity Guidelines [1], ISO/IEC 24745:2022 on biometric "
        "information protection [23], and ISO/IEC 19795-1:2021 on biometric performance testing and "
        "reporting [36] as relevant standards and guidance."
    )

    heading("Related Work")
    body_text(
        "Continuous authentication extends identity assurance beyond the entry-point decision by collecting "
        "additional evidence while a session remains active [2], [3]. Keystroke dynamics derives behavioural "
        "features from key-event timestamps and has been shown to discriminate users under controlled "
        "protocols [5]-[7], [19]."
    )
    body_text(
        "Prior work also identifies important limitations: performance depends on feature representation, "
        "dataset, classifier, and evaluation protocol [8]-[10]; typing timing varies under fatigue and across "
        "devices [11], [12]; and adaptive updates can introduce imitation, replay, and poisoning concerns "
        "[23]-[25]."
    )
    body_text(
        "Drift detection methods include DDM, EDDM, support-vector approaches, and Adaptive Windowing "
        "(ADWIN). ADWIN is selected because it can monitor a binary prediction-error stream independently "
        "of the classifier [16], [32]-[34]. The literature gap is limited integrated evaluation of profile-centred "
        "timing features, biometric classification, error monitoring, adaptive stream learning, threshold policy, "
        "and user-facing feedback in one reproducible authentication artifact."
    )

    heading("Problem Statement")
    body_text(
        "Keystroke dynamics can support post-login behavioural verification, but practical systems must manage "
        "user variability, device conditions, privacy, and response latency. Keystroke behaviour is not permanently "
        "stable: fatigue, input devices, and behavioural change can affect timing features and model reliability. "
        "The problem addressed by this project is the limited evidence of an integrated, reproducible keystroke-"
        "authentication model combining profile-centred features, authentication scoring, drift detection, adaptive "
        "response, and interpretable feedback."
    )

    heading("Technical Objectives")
    body_text("The technical objectives are as follows:")
    bullet("To determine the discriminative power of profile-centred timing features in separating genuine-user from impostor keystroke behaviour.")
    bullet("To develop a multilayered keystroke authentication model incorporating drift detection to sustain authentication performance under concept drift.")
    bullet("To evaluate the multilayered keystroke authentication model's resilience to concept drift.")

    heading("Justification")
    body_text(
        "The project provides a reproducible example of how static keystroke classification can be evaluated "
        "together with model-health monitoring in one artifact. It links timing features, authentication probability, "
        "threshold logic, drift detection, and model adaptation. It also considers false acceptance, which affects "
        "security, and false rejection, which affects legitimate access."
    )

    heading("Hypothesis")
    body_text(
        "A multilayered model that integrates profile-centred timing features, authentication scoring, drift detection, "
        "adaptive response, and interpretable feedback can sustain keystroke-authentication performance when concept drift is introduced."
    )

    heading("Proposed tools")
    body_text("The project uses the following tools and resources identified in the source PDF:")
    bullet("CMU DSL Strong Password Benchmark for benchmark authentication modelling.")
    bullet("A deterministic synthetic stream for controlled drift evaluation.")
    bullet("Python, Pandas, NumPy, and scikit-learn for data preparation, model training, threshold tuning, and model export.")
    bullet("River for streaming simulation, prequential evaluation, and drift monitoring.")
    bullet("A Streaming Random Patches classifier with Hoeffding Tree learners and ADWIN error monitoring.")
    bullet("JSON for the exported model artifact, and TypeScript with Vite for the browser-based dashboard.")

    heading("Expected Results")
    body_text("The expected project outputs described in the source are:")
    bullet("A multilayered resilience model combining feature processing, authentication classification, and a drift watchdog.")
    bullet("A reproducible data science pipeline using profile-centred dwell and flight timing features.")
    bullet("A browser-based demonstration dashboard that presents authentication probability, threshold logic, drift alerts, and decision support.")
    bullet("Benchmark and streaming evaluations reporting accuracy, balanced accuracy, false acceptance rate, false rejection rate, AUC-ROC, drift-event count, and recovery evidence.")

    heading("Ethics Consideration")
    body_text(
        "The project uses a publicly released, de-identified benchmark and generated synthetic stream observations. "
        "No new human participants are recruited. Research integrity is supported by documenting the data source, "
        "preserving the defined protocol, reporting favourable and unfavourable errors, distinguishing synthetic drift "
        "from human drift, and avoiding production-readiness claims. Model artifacts and timing data are restricted to the project workspace."
    )

    heading("Time Table")
    body_text("No timetable information is provided in the source PDF.")

    heading("Estimated Budget")
    body_text("No estimated budget information is provided in the source PDF.")

    heading("References")
    references = [
        "[1] D. Temoshok et al., Digital Identity Guidelines: Authentication and Authenticator Management, NIST Special Publication 800-63B-4, Gaithersburg, MD, USA, 2025. [Online]. Available: https://pages.nist.gov/800-63-4/sp800-63b.html",
        "[2] P. Bours and S. Mondal, \"Continuous authentication with keystroke dynamics,\" in Proc. Norwegian Information Security Conf. (NISK), 2015.",
        "[3] V. M. Patel, R. Chellappa, D. Chandra, and B. Barbello, \"Continuous user authentication on mobile devices: Recent progress and remaining challenges,\" IEEE Signal Process. Mag., vol. 33, no. 4, pp. 49-61, 2016.",
        "[4] Verizon Business, 2025 Data Breach Investigations Report, 2025. [Online]. Available: https://www.verizon.com/business/resources/reports/dbir/ (accessed Jun. 7, 2026).",
        "[5] R. Joyce and G. Gupta, \"Identity authentication based on keystroke latencies,\" Commun. ACM, vol. 33, no. 2, pp. 168-176, 1990.",
        "[6] F. Monrose and A. D. Rubin, \"Keystroke dynamics as a biometric for authentication,\" Future Gener. Comput. Syst., vol. 16, no. 4, pp. 351-359, 2000.",
        "[7] F. Bergadano, D. Gunetti, and C. Picardi, \"Identity verification through dynamic keystroke analysis,\" Intell. Data Anal., vol. 7, no. 5, pp. 469-496, 2003, doi: 10.3233/IDA-2003-7506.",
        "[8] S. P. Banerjee and D. L. Woodard, \"Biometric authentication and identification using keystroke dynamics: A survey,\" J. Pattern Recognit. Res., vol. 7, no. 1, pp. 116-139, 2012.",
        "[9] P. S. Teh, A. B. J. Teoh, and S. Yue, \"A survey of keystroke dynamics biometrics,\" Sci. World J., vol. 2013, Art. no. 408280, 2013, doi: 10.1155/2013/408280.",
        "[10] S. Roy, J. Pradhan, A. Kumar, D. R. D. Adhikary, U. Roy, D. Sinha, and R. K. Pal, \"A systematic literature review on latest keystroke dynamics based models,\" IEEE Access, vol. 10, pp. 92192-92236, 2022, doi: 10.1109/ACCESS.2022.3197756.",
        "[11] A. Acien, A. Morales, R. Vera-Rodriguez, J. Fierrez, I. Mondesire-Crump, and T. Arroyo-Gallego, \"Detection of mental fatigue in the general population: Feasibility study of keystroke dynamics as a real-world biomarker,\" JMIR Biomed. Eng., vol. 7, no. 2, Art. no. e41003, 2022, doi: 10.2196/41003.",
        "[12] P. Kang and S. Cho, \"Keystroke dynamics-based user authentication using long and free text strings from various input devices,\" Inf. Sci., vol. 308, pp. 72-93, 2015, doi: 10.1016/j.ins.2014.08.070.",
        "[13] A. Mhenni, E. Cherrier, C. Rosenberger, and N. Essoukri Ben Amara, \"Double serial adaptation mechanism for keystroke dynamics authentication based on a single password,\" Comput. Secur., vol. 83, pp. 151-166, 2019, doi: 10.1016/j.cose.2019.02.002.",
        "[14] G. Widmer and M. Kubat, \"Learning in the presence of concept drift and hidden contexts,\" Mach. Learn., vol. 23, no. 1, pp. 69-101, 1996, doi: 10.1023/A:1018046501280.",
        "[15] J. Gama, I. Zliobaite, A. Bifet, M. Pechenizkiy, and A. Bouchachia, \"A survey on concept drift adaptation,\" ACM Comput. Surv., vol. 46, no. 4, Art. no. 44, Apr. 2014, doi: 10.1145/2523813.",
        "[16] A. Bifet and R. Gavalda, \"Learning from time-changing data with adaptive windowing,\" in Proc. SIAM Int. Conf. Data Mining (SDM), 2007, pp. 443-448.",
        "[17] A. R. Hevner, S. T. March, J. Park, and S. Ram, \"Design science in information systems research,\" MIS Q., vol. 28, no. 1, pp. 75-105, 2004.",
        "[18] K. Peffers, T. Tuunanen, M. A. Rothenberger, and S. Chatterjee, \"A design science research methodology for information systems research,\" J. Manage. Inf. Syst., vol. 24, no. 3, pp. 45-77, 2007.",
        "[19] K. S. Killourhy and R. A. Maxion, \"Comparing anomaly detectors for keystroke dynamics,\" in Proc. 39th Annu. IEEE/IFIP Int. Conf. Dependable Systems and Networks (DSN), 2009, pp. 125-134.",
        "[20] E. Yu and S. Cho, \"Keystroke dynamics identity verification-its problems and practical solutions,\" Comput. Secur., vol. 23, no. 5, pp. 428-440, 2004, doi: 10.1016/j.cose.2004.02.004.",
        "[21] J. V. Monaco, \"A tutorial on behavioral biometrics for computer security,\" Computer, vol. 51, no. 4, pp. 80-84, 2018.",
        "[22] D. Gunetti and C. Picardi, \"Keystroke analysis of free text,\" ACM Trans. Inf. Syst. Secur., vol. 8, no. 3, pp. 312-347, 2005.",
        "[23] Information Security, Cybersecurity and Privacy Protection-Biometric Information Protection, ISO/IEC 24745:2022, 2022.",
        "[24] B. Biggio and F. Roli, \"Wild patterns: Ten years after the rise of adversarial machine learning,\" Pattern Recognit., vol. 84, pp. 317-331, 2018.",
        "[25] N. Carlini and D. Wagner, \"Towards evaluating the robustness of neural networks,\" in Proc. IEEE Symposium on Security and Privacy, 2017, pp. 39-57.",
        "[32] J. Gama, P. Medas, G. Castillo, and P. Rodrigues, \"Learning with drift detection,\" in Proc. Brazilian Symposium on Artificial Intelligence, 2004, pp. 286-295.",
        "[33] M. Baena-Garcia, J. del Campo-Avila, R. Fidalgo, A. Bifet, R. Gavalda, and R. Morales-Bueno, \"Early drift detection method,\" in Proc. Fourth Int. Workshop Knowledge Discovery from Data Streams, 2006.",
        "[34] R. Klinkenberg and T. Joachims, \"Detecting concept drift with support vector machines,\" in Proc. Int. Conf. Mach. Learn., 2000, pp. 487-494.",
        "[36] Information Technology-Biometric Performance Testing and Reporting-Part 1: Principles and Framework, ISO/IEC 19795-1:2021, 2021.",
    ]
    for ref in references:
        body_text(ref)

    heading("Glossary")
    glossary = [
        "Continuous authentication: repeated verification of an active user using evidence collected during a session.",
        "Keystroke dynamics: behavioural biometric analysis of timing measurements derived from key-press and key-release events.",
        "Dwell time: the duration between pressing and releasing a key.",
        "Flight time: the interval between releasing one key and pressing the next key.",
        "Concept drift: change over time in the statistical relationship represented by a predictive model.",
        "ADWIN: Adaptive Windowing.",
        "FAR: False Acceptance Rate, the proportion of impostor attempts incorrectly accepted.",
        "FRR: False Rejection Rate, the proportion of genuine attempts incorrectly rejected.",
        "SRP: Streaming Random Patches.",
    ]
    for term in glossary:
        body_text(term)

    doc.core_properties.title = "A Multilayered Model for Concept Drift Resilient Keystroke Dynamics Authentication"
    doc.core_properties.author = "Munashe O. Jonga"
    doc.core_properties.subject = "Project proposal"
    doc.save(OUTPUT)


if __name__ == "__main__":
    main()
