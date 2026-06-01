from PIL import Image, ImageDraw, ImageFont
import os, math

OUT = "/Users/apexcode/Desktop/parcel/diagrams"
os.makedirs(OUT, exist_ok=True)

NAVY   = (13, 43, 85)
ACCENT = (26, 111, 175)
GREEN  = (26, 122, 74)
AMBER  = (184, 92, 0)
RED    = (139, 0, 0)
LIGHT  = (234, 242, 251)
LGREEN = (232, 245, 238)
LGRAY  = (244, 244, 244)
WHITE  = (255, 255, 255)
GRAY   = (120, 120, 120)
DGRAY  = (50, 50, 50)
LRED   = (252, 235, 235)

def font(size=14, bold=False):
    try:
        name = "Arial Bold" if bold else "Arial"
        return ImageFont.truetype(f"/System/Library/Fonts/Supplemental/{name}.ttf", size)
    except:
        try:
            return ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size)
        except:
            return ImageFont.load_default()

def draw_rounded_rect(draw, xy, radius, fill, outline=None, width=2):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def centered_text(draw, text, x, y, w, fnt, fill=DGRAY):
    tw = draw.textlength(text, font=fnt)
    draw.text((x + (w - tw) / 2, y), text, font=fnt, fill=fill)

# ── Fig 1: Feedback Loop Security Degradation ─────────────────────────────────
def diagram1():
    W, H = 1100, 420
    img = Image.new("RGB", (W, H), WHITE)
    d = ImageDraw.Draw(img)

    tf = font(16, bold=True)
    title = "Figure 1: The Feedback Loop Security Degradation Phenomenon"
    tw = d.textlength(title, font=tf)
    d.text(((W - tw)/2, 18), title, font=tf, fill=NAVY)

    steps = [
        ("Developer\nRefines Code",   ACCENT, WHITE),
        ("AI Generates\nRefined Code", GREEN,  WHITE),
        ("Vulnerability\nScanner",     AMBER,  WHITE),
        ("Iteration N+1\n(Loop)",      NAVY,   WHITE),
    ]
    box_w, box_h = 170, 72
    gap = 60
    start_x = 55
    y = 160
    positions = []
    for i, (label, bg, fg) in enumerate(steps):
        x = start_x + i * (box_w + gap)
        draw_rounded_rect(d, [x, y, x+box_w, y+box_h], 10, bg, WHITE, 2)
        lines = label.split("\n")
        bf = font(13, bold=True)
        ty = y + (box_h - len(lines)*18) // 2
        for ln in lines:
            lw = d.textlength(ln, font=bf)
            d.text((x + (box_w - lw)/2, ty), ln, font=bf, fill=fg)
            ty += 18
        positions.append((x, y, box_w, box_h))

    af = font(11)
    arrow_labels = ["Refinement\nRequest", "AI Output\n+ Code", "Findings\nInjected"]
    for i in range(3):
        x1 = positions[i][0] + box_w
        x2 = positions[i+1][0]
        mid_y = y + box_h // 2
        d.line([(x1, mid_y), (x2, mid_y)], fill=DGRAY, width=2)
        d.polygon([(x2, mid_y), (x2-10, mid_y-6), (x2-10, mid_y+6)], fill=DGRAY)
        lns = arrow_labels[i].split("\n")
        lx = (x1 + x2) / 2
        for j, ln in enumerate(lns):
            lw = d.textlength(ln, font=af)
            d.text((lx - lw/2, mid_y - 34 + j*15), ln, font=af, fill=GRAY)

    bar_y = y + box_h + 28
    vuln_counts = [0, 2, 5, 9]
    bar_max_h = 60
    bar_col_w = 28
    for i, cnt in enumerate(vuln_counts):
        bx = positions[i][0] + box_w//2 - bar_col_w//2
        bh = int((cnt / 10) * bar_max_h)
        col = GREEN if cnt == 0 else AMBER if cnt < 5 else RED
        d.rectangle([bx, bar_y + bar_max_h - bh, bx + bar_col_w, bar_y + bar_max_h], fill=col)
        d.rectangle([bx, bar_y, bx + bar_col_w, bar_y + bar_max_h], outline=LGRAY, width=1)
        lbl = f"{cnt} vulns"
        lw = d.textlength(lbl, font=af)
        d.text((bx + bar_col_w//2 - lw//2, bar_y + bar_max_h + 4), lbl, font=af, fill=DGRAY)

    lx_start = positions[3][0] + box_w//2
    lx_end   = positions[0][0] + box_w//2
    loop_y   = y - 55
    d.line([(lx_start, y), (lx_start, loop_y)], fill=RED, width=2)
    d.line([(lx_start, loop_y), (lx_end, loop_y)], fill=RED, width=2)
    d.line([(lx_end, loop_y), (lx_end, y)], fill=RED, width=2)
    d.polygon([(lx_end, y), (lx_end-7, y-12), (lx_end+7, y-12)], fill=RED)
    lbl = "37.6% increase in critical vulnerabilities after 5 iterations (Shukla et al., 2025)"
    lw = d.textlength(lbl, font=af)
    d.text(((W - lw)/2, loop_y - 22), lbl, font=af, fill=RED)

    img.save(f"{OUT}/fig1_feedback_loop.png")
    print("Fig 1 saved")

# ── Fig 2: DSR Process Model ──────────────────────────────────────────────────
def diagram2():
    W, H = 1100, 480
    img = Image.new("RGB", (W, H), WHITE)
    d = ImageDraw.Draw(img)

    tf = font(16, bold=True)
    title = "Figure 2: DSR Process Model (Peffers et al., 2007) Mapped to This Research"
    tw = d.textlength(title, font=tf)
    d.text(((W - tw)/2, 16), title, font=tf, fill=NAVY)

    phases = [
        ("1\nProblem\nIdentification",
         "Feedback loop security\ndegradation documented\n(Shukla et al., 2025).\nNo HITL framework exists.", ACCENT),
        ("2\nObjective\nDefinition",
         "Design framework that\nmitigates vulnerability\naccumulation through\nstructured human oversight.", GREEN),
        ("3\nDesign &\nDevelopment",
         "Build Human-AI\nCollaborative Security\nIntervention Framework\n(the DSR artefact).", NAVY),
        ("4\nDemon-\nstration",
         "Apply framework in\ncontrolled iterative\ncoding sessions with\ndeveloper participants.", AMBER),
        ("5\nEvaluation",
         "Measure vulnerability\nreduction vs baseline.\nExpert review.\nFormative + summative.", GREEN),
        ("6\nCommunication",
         "MPhil thesis, open\nbenchmark dataset,\nconference paper,\npractitioner guidelines.", ACCENT),
    ]

    box_w, box_h = 148, 280
    gap = 24
    total = len(phases) * box_w + (len(phases)-1) * gap
    start_x = (W - total) // 2
    top_y = 60

    for i, (label, detail, col) in enumerate(phases):
        x = start_x + i * (box_w + gap)
        draw_rounded_rect(d, [x, top_y, x+box_w, top_y+62], 8, col, WHITE, 2)
        bf = font(13, bold=True)
        lns = label.split("\n")
        ty = top_y + (62 - len(lns)*17) // 2
        for ln in lns:
            lw = d.textlength(ln, font=bf)
            d.text((x + (box_w - lw)/2, ty), ln, font=bf, fill=WHITE)
            ty += 17
        draw_rounded_rect(d, [x, top_y+68, x+box_w, top_y+box_h], 8, LIGHT, col, 1)
        sf = font(11)
        dlns = detail.split("\n")
        dy = top_y + 80
        for ln in dlns:
            lw = d.textlength(ln, font=sf)
            d.text((x + (box_w - lw)/2, dy), ln, font=sf, fill=DGRAY)
            dy += 17
        if i < len(phases) - 1:
            ax = x + box_w + 2
            ay = top_y + 31
            d.line([(ax, ay), (ax+gap-4, ay)], fill=DGRAY, width=2)
            d.polygon([(ax+gap-4, ay), (ax+gap-14, ay-6), (ax+gap-14, ay+6)], fill=DGRAY)

    nf = font(11)
    note = "Evaluation framework: Venable et al. (2012) — Formative (expert review) + Summative (controlled experiment)"
    nw = d.textlength(note, font=nf)
    d.text(((W-nw)/2, top_y + box_h + 20), note, font=nf, fill=GRAY)

    img.save(f"{OUT}/fig2_dsr_process.png")
    print("Fig 2 saved")

# ── Fig 3: Automation Bias Cycle ──────────────────────────────────────────────
def diagram3():
    W, H = 900, 520
    img = Image.new("RGB", (W, H), WHITE)
    d = ImageDraw.Draw(img)

    tf = font(16, bold=True)
    title = "Figure 3: The Automation Bias Cycle in AI-Assisted Code Development"
    tw = d.textlength(title, font=tf)
    d.text(((W - tw)/2, 16), title, font=tf, fill=NAVY)

    cx, cy = W//2, H//2 + 10
    r = 170
    nodes = [
        (0,   "AI Generates\nRefined Code",         ACCENT, WHITE),
        (60,  "Code Appears\nMore Sophisticated",    GREEN,  WHITE),
        (120, "Developer\nTrusts Output",            AMBER,  WHITE),
        (180, "Review is\nSkipped / Rushed",         RED,    WHITE),
        (240, "Vulnerability\nUndetected",           RED,    WHITE),
        (300, "Next Iteration\nBuilds on Flaw",      NAVY,   WHITE),
    ]
    node_r = 62
    positions = []
    for deg, label, bg, fg in nodes:
        rad = math.radians(deg - 90)
        nx = int(cx + r * math.cos(rad))
        ny = int(cy + r * math.sin(rad))
        positions.append((nx, ny))
        draw_rounded_rect(d, [nx-node_r, ny-32, nx+node_r, ny+32], 8, bg, WHITE, 2)
        bf = font(11, bold=True)
        lns = label.split("\n")
        ty = ny - len(lns)*9
        for ln in lns:
            lw = d.textlength(ln, font=bf)
            d.text((nx - lw//2, ty), ln, font=bf, fill=fg)
            ty += 18

    for i in range(len(positions)):
        n1 = positions[i]
        n2 = positions[(i+1) % len(positions)]
        dx = n2[0] - n1[0]; dy = n2[1] - n1[1]
        dist = math.sqrt(dx**2 + dy**2)
        if dist == 0: continue
        ux, uy = dx/dist, dy/dist
        sx = n1[0] + ux * node_r; sy = n1[1] + uy * 32
        ex = n2[0] - ux * node_r; ey = n2[1] - uy * 32
        d.line([(sx, sy), (ex, ey)], fill=DGRAY, width=2)
        angle = math.atan2(ey - sy, ex - sx)
        al = 12
        d.polygon([(ex, ey),
                   (ex - al*math.cos(angle-0.4), ey - al*math.sin(angle-0.4)),
                   (ex - al*math.cos(angle+0.4), ey - al*math.sin(angle+0.4))], fill=DGRAY)

    draw_rounded_rect(d, [cx-68, cy-26, cx+68, cy+26], 8, LRED, RED, 2)
    bf = font(12, bold=True)
    for j, ln in enumerate(["AUTOMATION", "BIAS CYCLE"]):
        lw = d.textlength(ln, font=bf)
        d.text((cx - lw//2, cy - 13 + j*18), ln, font=bf, fill=RED)

    nf = font(10)
    note = "Source: Perry et al. (2023); CSET (2024); Horowitz & Kahn (2024); Sonar (2026) — 38% of developers skip review due to cognitive burden"
    nw = d.textlength(note, font=nf)
    d.text((max(10, (W-nw)//2), H-28), note, font=nf, fill=GRAY)

    img.save(f"{OUT}/fig3_automation_bias.png")
    print("Fig 3 saved")

# ── Fig 4: Research Gap Positioning Map ───────────────────────────────────────
def diagram4():
    W, H = 1000, 560
    img = Image.new("RGB", (W, H), WHITE)
    d = ImageDraw.Draw(img)

    tf = font(16, bold=True)
    title = "Figure 4: Research Gap Positioning — Prior Work vs This Research"
    tw = d.textlength(title, font=tf)
    d.text(((W - tw)/2, 14), title, font=tf, fill=NAVY)

    ax_x, ax_y = 120, 80
    ax_w, ax_h = W - 180, H - 160

    d.rectangle([ax_x, ax_y, ax_x+ax_w//2, ax_y+ax_h//2], fill=(240,248,255))
    d.rectangle([ax_x+ax_w//2, ax_y, ax_x+ax_w, ax_y+ax_h//2], fill=(240,255,240))
    d.rectangle([ax_x, ax_y+ax_h//2, ax_x+ax_w//2, ax_y+ax_h], fill=(255,250,235))
    d.rectangle([ax_x+ax_w//2, ax_y+ax_h//2, ax_x+ax_w, ax_y+ax_h], fill=(255,235,235))

    d.line([(ax_x, ax_y+ax_h//2), (ax_x+ax_w, ax_y+ax_h//2)], fill=NAVY, width=2)
    d.line([(ax_x+ax_w//2, ax_y), (ax_x+ax_w//2, ax_y+ax_h)], fill=NAVY, width=2)

    sf = font(11, bold=True)
    d.text((ax_x, ax_y-24), "Single-shot Generation Only", font=sf, fill=GRAY)
    d.text((ax_x+ax_w-140, ax_y-24), "Iterative / Multi-turn", font=sf, fill=GREEN)
    d.text((10, ax_y+10), "No\nHuman\nOversight", font=sf, fill=GRAY)
    d.text((10, ax_y+ax_h-70), "Structured\nHuman\nOversight", font=sf, fill=GREEN)

    papers = [
        (0.15, 0.25, "Pearce et al.\n2022",        ACCENT,      10),
        (0.20, 0.32, "Perry et al.\n2023",          ACCENT,      10),
        (0.25, 0.20, "Negri-Ribalta\n2024",         ACCENT,      10),
        (0.18, 0.40, "Sandoval\n2023",              ACCENT,       9),
        (0.30, 0.28, "Majdinasab\n2024",            ACCENT,       9),
        (0.60, 0.22, "Shukla et al.\n2025 (base)",  (180,0,0),   12),
        (0.65, 0.35, "Liu et al.\n2024",            AMBER,        9),
        (0.15, 0.72, "CodingCare\n2025",            GREEN,        9),
        (0.22, 0.78, "Akinsanya\n2025",             GREEN,        9),
        (0.18, 0.65, "Mohsin SOC\n2024",            GREEN,       10),
        (0.75, 0.62, "THIS\nRESEARCH",              NAVY,        16),
    ]
    for xf, yf, label, col, sz in papers:
        px = ax_x + int(xf * ax_w)
        py = ax_y + int(yf * ax_h)
        d.ellipse([px-sz, py-sz, px+sz, py+sz], fill=col, outline=WHITE, width=2)
        lf = font(9)
        ly = py + sz + 3
        for ln in label.split("\n"):
            lw = d.textlength(ln, font=lf)
            d.text((px - lw//2, ly), ln, font=lf, fill=DGRAY)
            ly += 13

    qf = font(11, bold=True)
    d.text((ax_x+8, ax_y+8),        "Single-shot, No HITL\n(Most prior work)",         font=qf, fill=GRAY)
    d.text((ax_x+ax_w//2+8, ax_y+8),"Iterative, No HITL\n(Shukla 2025)",               font=qf, fill=AMBER)
    d.text((ax_x+8, ax_y+ax_h//2+8),"Single-shot + Framework\n(CodingCare, Akinsanya)", font=qf, fill=ACCENT)
    d.text((ax_x+ax_w//2+8, ax_y+ax_h//2+8), "Iterative + HITL Framework\n← THIS RESEARCH", font=qf, fill=GREEN)

    nf = font(10)
    note = "Gap: No prior work occupies the Iterative + Structured HITL quadrant — this research is the first to do so."
    nw = d.textlength(note, font=nf)
    d.text(((W-nw)//2, H-28), note, font=nf, fill=RED)

    img.save(f"{OUT}/fig4_gap_map.png")
    print("Fig 4 saved")

# ── Fig 5: Thematic Convergence ───────────────────────────────────────────────
def diagram5():
    W, H = 1000, 500
    img = Image.new("RGB", (W, H), WHITE)
    d = ImageDraw.Draw(img)

    tf = font(16, bold=True)
    title = "Figure 5: Thematic Convergence Towards the Proposed DSR Artefact"
    tw = d.textlength(title, font=tf)
    d.text(((W - tw)/2, 14), title, font=tf, fill=NAVY)

    themes = [
        ("Theme 1\nAI Code\nSecurity",
         "40-65% vulnerable\ncode in single-shot.\n37.6% increase\niteratively.",
         ACCENT, 60, 140),
        ("Theme 2\nDSR\nMethodology",
         "Peffers (2007)\nHevner (2004)\nPastor (2024)\nChan SHAPR (2026)",
         GREEN, 60, 310),
        ("Theme 3\nHuman-AI\nCollaboration",
         "Hamza (2023)\nFragiadakis (2024)\nAbbasi (2025)\nBobba (2025)",
         NAVY, 220, 80),
        ("Theme 4\nAutomation\nBias",
         "Perry (2023)\nCSET (2024)\nHorowitz & Kahn\n(2024)",
         AMBER, 220, 365),
        ("Theme 5\nHITL &\nFrameworks",
         "Mohsin SOC (2024)\nMohsin CodingCare\n(2025) EU AI Act\n(2024)",
         (140,0,80), 380, 80),
        ("Theme 6\nRegulatory\nContext",
         "EU AI Act Art.14\nOWASP LLM Top 10\nNIST AI RMF\nSLSA Framework",
         RED, 380, 365),
    ]

    box_w, box_h = 175, 115
    sf = font(11, bold=True)
    df = font(10)
    theme_centres = []

    for label, detail, col, bx, by in themes:
        draw_rounded_rect(d, [bx, by, bx+box_w, by+box_h], 10, col, WHITE, 2)
        ty = by + 8
        for ln in label.split("\n"):
            lw = d.textlength(ln, font=sf)
            d.text((bx + (box_w-lw)//2, ty), ln, font=sf, fill=WHITE)
            ty += 16
        ty += 2
        for ln in detail.split("\n"):
            lw = d.textlength(ln, font=df)
            d.text((bx + (box_w-lw)//2, ty), ln, font=df, fill=WHITE)
            ty += 14
        theme_centres.append((bx + box_w//2, by + box_h//2))

    art_x, art_y, art_w, art_h = 590, 200, 360, 120
    draw_rounded_rect(d, [art_x, art_y, art_x+art_w, art_y+art_h], 14, NAVY, ACCENT, 3)
    bf = font(14, bold=True)
    ty = art_y + 16
    for ln in ["Human-AI Collaborative", "Security Intervention", "Framework (DSR Artefact)"]:
        lw = d.textlength(ln, font=bf)
        d.text((art_x + (art_w-lw)//2, ty), ln, font=bf, fill=WHITE)
        ty += 22
    nf2 = font(10)
    sub = "Addresses gap across all 6 themes"
    sw = d.textlength(sub, font=nf2)
    d.text((art_x + (art_w-sw)//2, ty+2), sub, font=nf2, fill=(180,220,255))

    arc = (art_x + art_w//2, art_y + art_h//2)
    for cx, cy in theme_centres:
        dx = arc[0] - cx; dy = arc[1] - cy
        dist = math.sqrt(dx**2 + dy**2)
        if dist == 0: continue
        ux, uy = dx/dist, dy/dist
        sx = cx + ux * (box_w//2 + 5); sy = cy + uy * (box_h//2 + 5)
        ex = arc[0] - ux * (art_w//2 + 5); ey = arc[1] - uy * (art_h//2 + 5)
        d.line([(sx, sy), (ex, ey)], fill=GRAY, width=2)
        angle = math.atan2(ey-sy, ex-sx)
        al = 10
        d.polygon([(ex, ey),
                   (ex - al*math.cos(angle-0.4), ey - al*math.sin(angle-0.4)),
                   (ex - al*math.cos(angle+0.4), ey - al*math.sin(angle+0.4))], fill=DGRAY)

    img.save(f"{OUT}/fig5_convergence.png")
    print("Fig 5 saved")

# ── Fig 6: Framework Design Requirements ──────────────────────────────────────
def diagram6():
    W, H = 1000, 460
    img = Image.new("RGB", (W, H), WHITE)
    d = ImageDraw.Draw(img)

    tf = font(16, bold=True)
    title = "Figure 6: Three Core Design Requirements for the Proposed Framework"
    tw = d.textlength(title, font=tf)
    d.text(((W - tw)/2, 14), title, font=tf, fill=NAVY)

    reqs = [
        ("DR1", "Structured Intervention\nTrigger Criteria",
         "Define WHEN human\nreview must occur:\n• Iteration count thresholds\n• Complexity increase triggers\n• Supply chain CWE detection\n• CVSS score thresholds", ACCENT),
        ("DR2", "Role-Differentiated\nReview Protocols",
         "Define WHO reviews WHAT:\n• Junior developer scope\n• Senior developer scope\n• Security engineer scope\n• Escalation pathways", GREEN),
        ("DR3", "Cognitive Feasibility\nof Review Process",
         "Counter automation bias:\n• Targeted review (not blanket)\n• AI-summarised findings\n• Time-bounded checkpoints\n• Decision support tools", AMBER),
    ]

    box_w, box_h = 280, 330
    gap = 40
    total = len(reqs)*box_w + (len(reqs)-1)*gap
    start_x = (W - total)//2
    top_y = 60

    for i, (num, title2, detail, col) in enumerate(reqs):
        x = start_x + i*(box_w+gap)
        draw_rounded_rect(d, [x, top_y, x+box_w, top_y+50], 10, col, WHITE, 2)
        bf = font(18, bold=True)
        nw = d.textlength(num, font=bf)
        d.text((x + (box_w-nw)//2, top_y+12), num, font=bf, fill=WHITE)
        draw_rounded_rect(d, [x, top_y+56, x+box_w, top_y+110], 0, LIGHT, col, 1)
        sf = font(12, bold=True)
        ty = top_y + 66
        for ln in title2.split("\n"):
            lw = d.textlength(ln, font=sf)
            d.text((x + (box_w-lw)//2, ty), ln, font=sf, fill=col)
            ty += 20
        draw_rounded_rect(d, [x, top_y+116, x+box_w, top_y+box_h], 10, LGRAY, LIGHT, 1)
        df = font(11)
        ty = top_y + 130
        for ln in detail.split("\n"):
            if ln.startswith("•"):
                d.text((x+16, ty), ln, font=df, fill=DGRAY)
            else:
                lw = d.textlength(ln, font=df)
                d.text((x + (box_w-lw)//2, ty), ln, font=df, fill=DGRAY)
            ty += 18

    nf = font(10)
    note = "Design requirements derived from: Shukla et al. (2025), Mohsin et al. (2024), Fragiadakis et al. (2024), Sonar (2026)"
    nw = d.textlength(note, font=nf)
    d.text(((W-nw)//2, H-24), note, font=nf, fill=GRAY)

    img.save(f"{OUT}/fig6_design_reqs.png")
    print("Fig 6 saved")

diagram1()
diagram2()
diagram3()
diagram4()
diagram5()
diagram6()
print("All diagrams generated.")
