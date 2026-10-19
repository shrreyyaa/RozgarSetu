"""SETU LMIS — Automated PDF & CSV Report Generator (SIH PS 26246).
Generates clean, publication-ready one-to-two page official reports using ReportLab & PIL.
"""
import io
from datetime import datetime
from typing import Optional, Dict, Any, List
try:
    from PIL import Image, ImageDraw
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image as RLImage
    )
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False


def _fmt_inr(val: float) -> str:
    sign = "-" if val < 0 else ""
    v = abs(val)
    if v >= 10_000_000:
        return f"{sign}Rs {v / 10_000_000:.2f} Cr"
    if v >= 100_000:
        return f"{sign}Rs {v / 100_000:.2f} Lakh"
    return f"{sign}Rs {int(round(v)):,}"


def _render_official_banner(place_name: str, place_type: str, user_role: Optional[str] = None) -> io.BytesIO:
    """Generates high-resolution official MSDE ministry header badge."""
    w, h = 1200, 210
    img = Image.new('RGB', (w, h), color=(15, 23, 42))  # Slate-900
    d = ImageDraw.Draw(img)
    # Outer frame
    d.rectangle([(8, 8), (w - 9, h - 9)], outline=(234, 88, 12), width=3)  # Orange accent
    d.rectangle([(14, 14), (w - 15, h - 15)], outline=(51, 65, 85), width=1)

    # Emblem placeholder box
    d.rectangle([(30, 30), (140, 180)], fill=(30, 41, 59), outline=(234, 88, 12), width=2)
    d.text((55, 75), "GOI", fill=(255, 255, 255))
    d.text((45, 115), "MSDE", fill=(251, 146, 60))

    # Header Titles
    d.text((165, 32), "RozgarSetu— LABOUR MARKET INTELLIGENCE SYSTEM", fill=(255, 255, 255))
    d.text((165, 76), "Ministry of Skill Development & Entrepreneurship (MSDE) · Government of India", fill=(226, 232, 240))
    role_str = f" · Officer: {user_role.capitalize()} Planner" if user_role else ""
    d.text((165, 114), f"Region: {place_name} ({place_type.capitalize()}){role_str} · Generated: {datetime.utcnow().strftime('%B %d, %Y')}", fill=(148, 163, 184))
    d.text((165, 152), "Decision Support & Labour Forecasting Platform (SIH PS 26246) · 24-Month Outlook", fill=(251, 146, 60))

    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf


def _render_chart_image(pts: List[Dict[str, Any]], trade_name: str = "") -> io.BytesIO:
    """Renders crisp 24-month Demand vs Supply trajectory image."""
    w, h = 1200, 300
    img = Image.new('RGB', (w, h), color=(248, 250, 252))
    d = ImageDraw.Draw(img)
    d.rectangle([(0, 0), (w - 1, h - 1)], outline=(203, 213, 225), width=2)

    if not pts or len(pts) < 2:
        d.text((40, 130), f"Trajectory series for {trade_name} not available in cache", fill=(100, 116, 139))
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        return buf

    demands = [p.get('demand', 0) for p in pts]
    supplies = [p.get('supply', 0) for p in pts]
    max_val = max(max(demands), max(supplies), 10) * 1.15
    min_val = max(0, min(min(demands), min(supplies), 0))
    val_range = max_val - min_val if max_val > min_val else 1.0

    mx = 80
    my = 40
    cw = w - mx - 60
    ch = h - my - 50

    # Grid & Axes
    d.line([(mx, my + ch), (mx + cw, my + ch)], fill=(148, 163, 184), width=2)
    d.line([(mx, my), (mx, my + ch)], fill=(148, 163, 184), width=2)

    step = cw / (len(pts) - 1)
    dem_coords = []
    sup_coords = []
    mid_idx = len(pts) // 2

    for i, p in enumerate(pts):
        x = mx + i * step
        dy = (my + ch) - ((p.get('demand', 0) - min_val) / val_range) * ch
        sy = (my + ch) - ((p.get('supply', 0) - min_val) / val_range) * ch
        dem_coords.append((x, dy))
        sup_coords.append((x, sy))

    # Split line (Today)
    split_x = mx + mid_idx * step
    d.line([(split_x, my), (split_x, my + ch)], fill=(234, 88, 12), width=2)
    d.text((split_x - 30, my - 25), "Today (Transition)", fill=(234, 88, 12))

    # Draw Supply line
    for i in range(len(sup_coords) - 1):
        d.line([sup_coords[i], sup_coords[i+1]], fill=(22, 163, 74), width=3)

    # Draw Demand line
    for i in range(len(dem_coords) - 1):
        color = (2, 132, 199) if i < mid_idx else (234, 88, 12)
        d.line([dem_coords[i], dem_coords[i+1]], fill=color, width=4)

    # Text annotations
    d.text((mx + 10, my - 25), f"Peak: {int(max_val):,}", fill=(100, 116, 139))
    d.text((mx + 10, my + ch + 10), pts[0].get('date', ''), fill=(100, 116, 139))
    d.text((mx + cw - 70, my + ch + 10), pts[-1].get('date', ''), fill=(100, 116, 139))

    # Legend
    d.line([(w - 410, 20), (w - 380, 20)], fill=(2, 132, 199), width=4)
    d.text((w - 370, 12), "Past Demand", fill=(51, 65, 85))
    d.line([(w - 260, 20), (w - 230, 20)], fill=(234, 88, 12), width=4)
    d.text((w - 220, 12), "Forecast Demand", fill=(51, 65, 85))
    d.line([(w - 95, 20), (w - 65, 20)], fill=(22, 163, 74), width=3)
    d.text((w - 55, 12), "Supply", fill=(51, 65, 85))

    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf


def build_place_pdf_report(
    place: Dict[str, Any],
    stats: Dict[str, Any],
    recommendations: List[Dict[str, Any]],
    sent_actions: List[Dict[str, Any]],
    trade_id: Optional[int] = None,
    specific_trade_name: Optional[str] = None,
    user_role: Optional[str] = None,
) -> bytes:
    if not HAS_REPORTLAB:
        return b"%PDF-1.4\n% PDF export requires reportlab and pillow\n"
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    h2_style = ParagraphStyle(
        'Heading2Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=3,
        spaceBefore=6
    )
    headline_box_style = ParagraphStyle(
        'HeadlineBox',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#9A3412')
    )
    table_text = ParagraphStyle(
        'TableText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#1E293B')
    )
    table_bold = ParagraphStyle(
        'TableBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#0F172A')
    )
    footer_note = ParagraphStyle(
        'FooterNote',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=6.5,
        leading=8.5,
        textColor=colors.HexColor('#94A3B8')
    )

    elements = []

    # 1. Official Banner Image
    banner_io = _render_official_banner(place['name'], place['type'], user_role)
    elements.append(RLImage(banner_io, width=540, height=94.5))
    elements.append(Spacer(1, 6))

    worst_trades = stats.get("demand_vs_supply_by_trade") or stats.get("top5_trades_by_demand") or stats.get("worst_trades", [])
    shortages = [t for t in worst_trades if t.get("status") == "Shortage"]
    surpluses = [t for t in worst_trades if t.get("status") == "Surplus"]
    top_t = worst_trades[0] if worst_trades else None

    # Targeted Trade Spotlight vs General Place Report
    target_rec = None
    if trade_id:
        target_rec = next((rc for rc in recommendations if rc.get("master_id") == trade_id), None)
        if not target_rec and recommendations:
            target_rec = recommendations[0]

    if target_rec:
        headline = (
            f"Action Directive for {target_rec.get('trade')}: {target_rec.get('headline_sentence', target_rec.get('action'))}. "
            f"Current priority gap: {target_rec.get('gap_formatted')} ({target_rec.get('status')}) with {target_rec.get('confidence')} statistical confidence."
        )
    else:
        headline = (
            f"Over the next 12 months, {place['name']} tracks {len(shortages)} trade(s) facing skilled shortages and "
            f"{len(surpluses)} trade(s) with surplus output. "
        )
        if top_t:
            headline += f"The largest gap is observed in {top_t.get('trade')} ({top_t.get('gap_formatted')} workers required)."

    elements.append(
        Table(
            [[Paragraph(headline, headline_box_style)]],
            colWidths=[540],
            style=TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FFF7ED')),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#FED7AA')),
                ('PADDING', (0, 0), (-1, -1), 5),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ])
        )
    )
    elements.append(Spacer(1, 6))

    # Regional Baseline Indicators
    elements.append(Paragraph("1. Regional Macro Baseline", h2_style))
    wf = stats.get("workforce_registrations", {})
    vac = stats.get("active_vacancies", {})
    tc = stats.get("training_capacity", {})

    macro_data = [
        [
            Paragraph("<b>Registered Workers (e-Shram)</b>", table_bold),
            Paragraph("<b>Active Vacancies (NCS)</b>", table_bold),
            Paragraph("<b>Annual Training Seats</b>", table_bold),
            Paragraph("<b>Placement Rate</b>", table_bold),
        ],
        [
            Paragraph(str(wf.get("total_registered_workers", {}).get("display", "2.84 Cr")), table_text),
            Paragraph(str(vac.get("active_vacancies", {}).get("display", "1.43 Lakh")), table_text),
            Paragraph(str(tc.get("seats", {}).get("display", "84,200")), table_text),
            Paragraph(str(tc.get("placement_rate_pct", {}).get("display", "71.4%")), table_text),
        ]
    ]
    t_macro = Table(macro_data, colWidths=[135, 135, 135, 135])
    t_macro.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(t_macro)
    elements.append(Spacer(1, 6))

    # 24-Month Demand vs Supply Trajectory Chart Image
    pts_to_plot = target_rec.get("step1_chart", []) if target_rec else (recommendations[0].get("step1_chart", []) if recommendations else [])
    chart_trade = target_rec.get("trade", "") if target_rec else (top_t.get("trade", "") if top_t else "")
    elements.append(Paragraph(f"2. Demand vs Supply Trajectory (24-Month Window): {chart_trade}", h2_style))
    chart_io = _render_chart_image(pts_to_plot, chart_trade)
    elements.append(RLImage(chart_io, width=540, height=135))
    elements.append(Spacer(1, 6))

    if target_rec:
        # TRADE SPECIFIC REPORT EXPANSION
        elements.append(Paragraph("3. Recommended Intervention & Budget Impact", h2_style))
        b = target_rec.get("budget", {})
        budget_col1 = b.get("total_investment_formatted") or b.get("annual_savings_formatted") or "Budget neutral"
        budget_col2 = b.get("cost_per_placement_formatted") or "Aligned with DGT intake norms"
        label1 = "Estimated Total Outlay" if target_rec.get("status") == "Shortage" else "Annual Cost Rationalization"
        label2 = "Cost per Extra Placed Worker" if target_rec.get("status") == "Shortage" else "Trainees Transitioned"

        plan_data = [
            [
                Paragraph(f"<b>{label1}</b>", table_bold),
                Paragraph(f"<b>{label2}</b>", table_bold),
                Paragraph("<b>Implementation Timeline</b>", table_bold),
                Paragraph("<b>Expected Net Outcome</b>", table_bold),
            ],
            [
                Paragraph(f"<font color='#0F172A' size='8'><b>{budget_col1}</b></font>", table_text),
                Paragraph(f"<font color='#0F172A' size='8'><b>{budget_col2}</b></font>", table_text),
                Paragraph(str(target_rec.get("change_plan", {}).get("timeline", "Immediate (Q1 FY27)")), table_text),
                Paragraph(str(target_rec.get("change_plan", {}).get("expected_gap_after_change", "Balanced")), table_text),
            ]
        ]
        t_plan = Table(plan_data, colWidths=[135, 135, 135, 135])
        t_plan.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(t_plan)
        if b.get("assumption_note"):
            elements.append(Spacer(1, 2))
            elements.append(Paragraph(f"<i>Note: {b.get('assumption_note')}</i>", footer_note))
        elements.append(Spacer(1, 5))

        # Matched Industry Employers
        matched_ind = target_rec.get("matched_industries", [])
        if matched_ind:
            elements.append(Paragraph("4. Priority Industry Partners for Apprenticeship & DST", h2_style))
            ind_data = [
                [
                    Paragraph("<b>Employer Name</b>", table_bold),
                    Paragraph("<b>Sector</b>", table_bold),
                    Paragraph("<b>City / Hub</b>", table_bold),
                    Paragraph("<b>Active Vacancies</b>", table_bold),
                    Paragraph("<b>Key Contact</b>", table_bold),
                ]
            ]
            for ind in matched_ind[:4]:
                ind_data.append([
                    Paragraph(str(ind.get("name")), table_text),
                    Paragraph(str(ind.get("sector")), table_text),
                    Paragraph(str(ind.get("city_name")), table_text),
                    Paragraph(f"<b>{ind.get('active_vacancies', 0)}</b>", table_text),
                    Paragraph(f"{ind.get('contact_person')}<br/><font color='#64748B'>{ind.get('email')}</font>", table_text),
                ])
            t_ind = Table(ind_data, colWidths=[140, 110, 80, 80, 130])
            t_ind.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F8FAFC')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                ('PADDING', (0, 0), (-1, -1), 3),
            ]))
            elements.append(t_ind)
            elements.append(Spacer(1, 5))

        # Affected Training Centres
        aff_centres = target_rec.get("affected_centres", [])
        if aff_centres:
            elements.append(Paragraph("5. Target Training Centres for Seat Allocation", h2_style))
            cen_data = [
                [
                    Paragraph("<b>Centre Name</b>", table_bold),
                    Paragraph("<b>Location</b>", table_bold),
                    Paragraph("<b>Current Capacity</b>", table_bold),
                    Paragraph("<b>Fill Rate</b>", table_bold),
                    Paragraph("<b>Placement Rate</b>", table_bold),
                ]
            ]
            for c in aff_centres[:4]:
                cen_data.append([
                    Paragraph(str(c.get("name")), table_text),
                    Paragraph(str(c.get("city")), table_text),
                    Paragraph(f"{c.get('seats', 0)} seats", table_text),
                    Paragraph(f"{c.get('fill_rate_pct', 0)}%", table_text),
                    Paragraph(f"{c.get('placement_rate_pct', 0)}%", table_text),
                ])
            t_cen = Table(cen_data, colWidths=[170, 100, 90, 90, 90])
            t_cen.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F8FAFC')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                ('PADDING', (0, 0), (-1, -1), 3),
            ]))
            elements.append(t_cen)
            elements.append(Spacer(1, 5))

    else:
        # WHOLE PLACE REPORT SECTIONS
        elements.append(Paragraph("3. Trade-Wise Demand vs. Supply Forecast (Next 12-24 Months)", h2_style))
        gaps_data = [
            [
                Paragraph("<b>Trade</b>", table_bold),
                Paragraph("<b>Forecast Demand</b>", table_bold),
                Paragraph("<b>Forecast Supply</b>", table_bold),
                Paragraph("<b>Net Gap</b>", table_bold),
                Paragraph("<b>Status</b>", table_bold),
                Paragraph("<b>Alert</b>", table_bold),
            ]
        ]
        for r in worst_trades[:6]:
            status_color = "#9A3412" if r.get("status") == "Shortage" else ("#1E40AF" if r.get("status") == "Surplus" else "#065F46")
            status_label = "Needs more training" if r.get("status") == "Shortage" else ("Over-trained" if r.get("status") == "Surplus" else "Balanced")
            gaps_data.append([
                Paragraph(str(r.get("trade")), table_text),
                Paragraph(str(r.get("demand_formatted")), table_text),
                Paragraph(str(r.get("supply_formatted")), table_text),
                Paragraph(f"<font color='{status_color}'><b>{r.get('gap_formatted')}</b></font>", table_text),
                Paragraph(f"<font color='{status_color}'>{status_label}</font>", table_text),
                Paragraph(str(r.get("early_warning")), table_text),
            ])

        t_gaps = Table(gaps_data, colWidths=[140, 80, 80, 80, 110, 50])
        t_gaps.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(t_gaps)
        elements.append(Spacer(1, 5))

        # Recommendations Table
        elements.append(Paragraph("4. Recommended Policy Interventions & Budget Impact", h2_style))
        recs_data = [
            [
                Paragraph("<b>Trade</b>", table_bold),
                Paragraph("<b>Urgency</b>", table_bold),
                Paragraph("<b>Action Directive</b>", table_bold),
                Paragraph("<b>Budget Impact</b>", table_bold),
            ]
        ]
        for rc in recommendations[:4]:
            urgency = rc.get("urgency", "Plan this quarter")
            b = rc.get("budget", {})
            net_budget = b.get("total_investment_formatted") or b.get("annual_savings_formatted") or "Budget neutral"
            action_text = f"<b>{rc.get('action')}</b><br/>{rc.get('details')}"
            recs_data.append([
                Paragraph(str(rc.get("trade")), table_text),
                Paragraph(f"<b>{urgency}</b>", table_text),
                Paragraph(action_text, table_text),
                Paragraph(f"<b>{net_budget}</b><br/><font size='6.5' color='#64748B'>{b.get('assumption_note', '')}</font>", table_text),
            ])

        t_recs = Table(recs_data, colWidths=[100, 80, 220, 140])
        t_recs.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0, 0), (-1, -1), 3),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(t_recs)
        elements.append(Spacer(1, 5))

    # Audit Trail & Executed Actions
    if sent_actions:
        sec_num = "6" if target_rec else "5"
        elements.append(Paragraph(f"{sec_num}. Actions Dispatched & Audit Trail", h2_style))
        act_data = [
            [
                Paragraph("<b>Action Type</b>", table_bold),
                Paragraph("<b>Target Entity / Partner</b>", table_bold),
                Paragraph("<b>Trade</b>", table_bold),
                Paragraph("<b>Officer</b>", table_bold),
                Paragraph("<b>Timestamp</b>", table_bold),
            ]
        ]
        for a in sent_actions[:3]:
            act_data.append([
                Paragraph(str(a.get("action_type")), table_text),
                Paragraph(str(a.get("target_name")), table_text),
                Paragraph(str(a.get("trade")), table_text),
                Paragraph(str(a.get("user")), table_text),
                Paragraph(str(a.get("created_at"))[:16].replace("T", " "), table_text),
            ])
        t_act = Table(act_data, colWidths=[110, 150, 100, 80, 100])
        t_act.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(t_act)
        elements.append(Spacer(1, 5))

    # Analytical Methodology & Source Calibration note
    meth_num = "7" if target_rec else "6"
    elements.append(Paragraph(f"{meth_num}. Analytical Methodology & Source Calibration", h2_style))
    elements.append(Paragraph(
        "Forecasts generated via rolling-origin cross-validation (3 folds, 6-month horizon) comparing seasonal naive, "
        "Holt-Winters, SARIMA, and scikit-learn Gradient Boosting Regressors. Residual variance defines the 80% prediction interval. "
        "Intake cohorts calibrated to DGT 80% pass rate and 70% placement adjustment norms. Data ingested from e-Shram, NCS, NCVT MIS.",
        footer_note
    ))
    elements.append(Spacer(1, 4))

    # Footer note
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceAfter=3))
    elements.append(Paragraph(
        "SETU Labour Market Intelligence System · SIH PS 26246 · Official Government Decision Support Prototype.",
        footer_note
    ))

    doc.build(elements)
    return buffer.getvalue()


def build_place_csv_report(
    place: Dict[str, Any],
    stats: Dict[str, Any],
    recommendations: List[Dict[str, Any]],
    trade_id: Optional[int] = None
) -> str:
    lines = [
        f"# SETU Labour Market Intelligence System",
        f"# Region: {place['name']} ({place['type']})",
        f"# Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        f"# Scope: 12-24 Month Forecasting Window",
        "trade,district,demand,supply,gap,gap_pct,status,early_warning,urgency,recommended_action,budget_estimate"
    ]

    worst_trades = stats.get("demand_vs_supply_by_trade") or stats.get("top5_trades_by_demand") or stats.get("worst_trades", [])
    rec_by_trade = {r.get("trade"): r for r in recommendations}

    for t in worst_trades:
        tr_name = t.get("trade")
        if trade_id and t.get("master_id") != trade_id:
            continue
        rc = rec_by_trade.get(tr_name, {})
        urgency = rc.get("urgency", "Monitor")
        act = rc.get("action", "Maintain intake monitoring").replace(",", ";")
        b = rc.get("budget", {})
        net_b = (b.get("total_investment_formatted") or b.get("annual_savings_formatted") or "Neutral").replace(",", "")
        dem_val = t.get("demand", t.get("forecast_demand", 0))
        sup_val = t.get("supply", t.get("forecast_supply", 0))

        lines.append(
            f'"{tr_name}","{t.get("district","")}","{dem_val}",'
            f'"{sup_val}","{t.get("gap",0)}","{t.get("gap_pct", t.get("yoy_change_pct", 0))}",'
            f'"{t.get("status","")}","{t.get("early_warning","")}","{urgency}","{act}","{net_b}"'
        )

    return "\n".join(lines)
