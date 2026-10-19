import PDFDocument from 'pdfkit';
import { IScreening } from '../models/screening.model';
import { ICareer } from '../models/career.model';

export function generateScreeningReportPdf(
  screening: IScreening,
  job?: ICareer | null
): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    margin: 40,
    size: 'A4',
    info: {
      Title: `Ensis AI Screening Report - ${screening.screeningId}`,
      Author: 'Ensis Careers AI',
      Subject: 'Candidate Eligibility & Match Assessment',
    },
  });

  const result = screening.result;
  const candidateName = result?.profile?.fullName || screening.cv.fileName.replace(/\.[^/.]+$/, '');
  const jobTitle = job?.title || 'Open Position';
  const score = result?.score ?? 0;
  const level = result?.level || 'eligible';
  const levelLabel =
    level === 'eligible' ? 'ELIGIBLE' : level === 'partial' ? 'PARTIAL MATCH' : 'NOT ELIGIBLE';
  const levelColor =
    level === 'eligible' ? '#047857' : level === 'partial' ? '#b45309' : '#be123c';

  // Header Banner
  doc.rect(40, 40, 515, 60).fill('#0f2518');
  doc.rect(40, 98, 515, 4).fill('#c9a86a');

  doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text('ENSIS', 55, 52);
  doc
    .fillColor('#c9a86a')
    .fontSize(8.5)
    .font('Helvetica-Bold')
    .text('WELLNESS & PANCHKARMA SPACES', 55, 72);

  doc
    .fillColor('#ffffff')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('AI ELIGIBILITY & MATCH REPORT', 320, 56, { align: 'right', width: 220 });
  doc
    .fillColor('#a7f3d0')
    .fontSize(8)
    .font('Helvetica')
    .text(`Date: ${new Date(screening.createdAt || Date.now()).toLocaleDateString('en-GB')}`, 320, 72, {
      align: 'right',
      width: 220,
    });

  // Candidate & Job Info Box
  let y = 120;
  doc.rect(40, y, 515, 65).fillAndStroke('#fbf8f2', '#e5e7eb');

  doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('CANDIDATE NAME', 55, y + 10);
  doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(candidateName, 55, y + 22);

  doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('EMAIL / CONTACT', 55, y + 38);
  doc
    .fillColor('#334155')
    .fontSize(8.5)
    .font('Helvetica')
    .text(result?.profile?.email || 'N/A', 55, y + 48);

  doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('POSITION APPLIED FOR', 260, y + 10);
  doc.fillColor('#0f2518').fontSize(11).font('Helvetica-Bold').text(jobTitle, 260, y + 22);

  doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('SCREENING ID', 260, y + 38);
  doc.fillColor('#334155').fontSize(8.5).font('Helvetica').text(screening.screeningId, 260, y + 48);

  // Score & Level Card
  y = 200;
  doc.rect(40, y, 515, 70).fillAndStroke('#ffffff', '#e2e8f0');

  // Score display
  doc.rect(55, y + 10, 80, 50).fillAndStroke('#f0fdf4', '#86efac');
  doc.fillColor('#047857').fontSize(22).font('Helvetica-Bold').text(`${score}%`, 55, y + 18, {
    width: 80,
    align: 'center',
  });
  doc.fillColor('#065f46').fontSize(7).font('Helvetica-Bold').text('OVERALL MATCH', 55, y + 44, {
    width: 80,
    align: 'center',
  });

  // Level Pill
  doc.rect(150, y + 16, 120, 22).fillAndStroke(levelColor, levelColor);
  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold').text(levelLabel, 150, y + 22, {
    width: 120,
    align: 'center',
  });

  const thresholdText = `Eligible Threshold: ${result?.thresholds?.eligible ?? 70}%  |  Partial Match Min: ${result?.thresholds?.partial ?? 50}%`;
  doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(thresholdText, 150, y + 44);

  // Summary message
  const statusSummary =
    level === 'eligible'
      ? 'Candidate meets the core threshold requirements and is eligible to proceed with the application.'
      : level === 'partial'
        ? 'Candidate has a moderate match with transferable competencies; review of gaps recommended.'
        : 'Candidate does not meet minimum eligibility criteria for this specific role at this time.';
  doc.fillColor('#334155').fontSize(8).font('Helvetica-Oblique').text(statusSummary, 290, y + 18, {
    width: 250,
  });

  // Breakdown Bars (7 categories)
  y = 285;
  doc.fillColor('#0f2518').fontSize(11).font('Helvetica-Bold').text('EVALUATION BREAKDOWN', 40, y);
  y += 18;

  if (result?.breakdown && result.breakdown.length > 0) {
    result.breakdown.forEach((item) => {
      doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica-Bold').text(item.label, 40, y);
      doc.fillColor('#64748b').fontSize(7).font('Helvetica').text(item.sublabel, 40, y + 10);

      // Score bar
      const barX = 260;
      const barWidth = 240;
      const fillWidth = Math.round((item.score / 100) * barWidth);

      doc.rect(barX, y + 4, barWidth, 8).fill('#f1f5f9');
      const barColor = item.score >= 70 ? '#047857' : item.score >= 50 ? '#b45309' : '#e11d48';
      doc.rect(barX, y + 4, fillWidth, 8).fill(barColor);

      doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text(`${item.score}%`, 510, y + 3, {
        align: 'right',
        width: 45,
      });

      y += 24;
    });
  }

  // Strengths Card
  y += 6;
  doc.fillColor('#047857').fontSize(10).font('Helvetica-Bold').text('KEY STRENGTHS', 40, y);
  y += 14;

  const strengths = result?.strengths && result.strengths.length > 0
    ? result.strengths
    : ['Demonstrated relevant experience', 'Strong functional background'];

  strengths.slice(0, 4).forEach((str) => {
    doc.fillColor('#047857').fontSize(9).font('Helvetica').text('✓', 45, y);
    doc.fillColor('#334155').fontSize(8).font('Helvetica').text(str, 60, y, { width: 490 });
    y += 14;
  });

  // Gaps & Suggestions
  y += 4;
  if (level === 'not_eligible' && result?.gaps && result.gaps.length > 0) {
    doc.fillColor('#be123c').fontSize(10).font('Helvetica-Bold').text('IDENTIFIED GAPS', 40, y);
    y += 14;
    result.gaps.slice(0, 3).forEach((gap) => {
      doc.fillColor('#be123c').fontSize(9).font('Helvetica').text('✕', 45, y);
      doc.fillColor('#334155').fontSize(8).font('Helvetica').text(gap, 60, y, { width: 490 });
      y += 14;
    });
  } else if (result?.suggestions && result.suggestions.length > 0) {
    doc.fillColor('#b45309').fontSize(10).font('Helvetica-Bold').text('RECOMMENDED SUGGESTIONS', 40, y);
    y += 14;
    result.suggestions.slice(0, 3).forEach((sug) => {
      doc.fillColor('#b45309').fontSize(9).font('Helvetica').text('•', 45, y);
      doc.fillColor('#334155').fontSize(8).font('Helvetica').text(sug, 60, y, { width: 490 });
      y += 14;
    });
  }

  // Footer
  const footerY = 770;
  doc.rect(40, footerY - 10, 515, 1).fill('#e2e8f0');
  doc
    .fillColor('#94a3b8')
    .fontSize(7)
    .font('Helvetica')
    .text(
      'Ensis - Design House India Pvt. Ltd. | Confidential Candidate Screening Assessment | Generated automatically via Ensis AI Careers Engine',
      40,
      footerY,
      { align: 'center', width: 515 }
    );

  doc.end();
  return doc;
}
