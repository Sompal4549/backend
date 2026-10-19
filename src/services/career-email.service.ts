import { sendEmail } from './email.service';
import { ICareerApplication } from '../models/career-application.model';
import { ICareer } from '../models/career.model';
import { getOrCreateCareerSettings } from '../models/career-settings.model';
import { generateSignedUrl } from './private-upload.service';

const ENSIS_GREEN = '#0f2518';
const ENSIS_GOLD = '#c9a86a';
const ENSIS_CREAM = '#fbf8f2';

function renderBreakdownBarsHtml(breakdown?: Array<{ label: string; score: number }>): string {
  if (!breakdown || breakdown.length === 0) return '';
  return breakdown
    .map((item) => {
      const color = item.score >= 70 ? '#047857' : item.score >= 50 ? '#b45309' : '#be123c';
      return `
      <div style="margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: #1e293b; margin-bottom: 4px;">
          <span>${item.label}</span>
          <span style="color: ${color};">${item.score}%</span>
        </div>
        <div style="background-color: #f1f5f9; height: 7px; border-radius: 9999px; overflow: hidden;">
          <div style="background-color: ${color}; width: ${item.score}%; height: 100%; border-radius: 9999px;"></div>
        </div>
      </div>
    `;
    })
    .join('');
}

export async function sendCandidateConfirmationEmail(
  application: ICareerApplication,
  job: ICareer
): Promise<void> {
  try {
    const settings = await getOrCreateCareerSettings();
    const candidateName = application.profile.fullName;
    const toEmail = application.profile.email;
    const score = application.screeningResult?.score ?? 0;
    const level = application.screeningResult?.level || 'eligible';
    const levelLabel =
      level === 'eligible' ? 'ELIGIBLE' : level === 'partial' ? 'PARTIAL MATCH' : 'NOT ELIGIBLE';
    const levelColor =
      level === 'eligible' ? '#047857' : level === 'partial' ? '#b45309' : '#be123c';

    const subject = `Application Received: ${job.title} — ${application.applicationId}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f8; padding: 30px 15px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="620" cellpadding="0" cellspacing="0" style="max-width: 620px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
              
              <!-- Header -->
              <tr>
                <td style="background-color: ${ENSIS_GREEN}; padding: 26px 32px; border-bottom: 4px solid ${ENSIS_GOLD}; text-align: left;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">ENSIS</h1>
                  <p style="margin: 4px 0 0 0; color: ${ENSIS_GOLD}; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Premium Panchkarma & Wellness Spaces</p>
                </td>
              </tr>

              <!-- Greeting & Status -->
              <tr>
                <td style="padding: 28px 32px 16px 32px;">
                  <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #0f172a;">Application Confirmed</h2>
                  <p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: #334155;">
                    Dear <strong>${candidateName}</strong>,<br>
                    Thank you for applying to <strong>ENSIS</strong>. Your application for <strong>${job.title}</strong> has been successfully received and registered in our talent management system.
                  </p>
                </td>
              </tr>

              <!-- Application Details Table -->
              <tr>
                <td style="padding: 0 32px 20px 32px;">
                  <table width="100%" cellpadding="10" cellspacing="0" style="background-color: ${ENSIS_CREAM}; border: 1px solid #e7e0d3; border-radius: 6px; font-size: 12px;">
                    <tr>
                      <td style="color: #64748b; font-weight: 600; width: 40%; border-bottom: 1px solid #e7e0d3;">Application ID</td>
                      <td style="color: #0f2518; font-weight: 700; border-bottom: 1px solid #e7e0d3;">${application.applicationId}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; font-weight: 600; border-bottom: 1px solid #e7e0d3;">Role</td>
                      <td style="color: #1e293b; font-weight: 600; border-bottom: 1px solid #e7e0d3;">${job.title}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; font-weight: 600; border-bottom: 1px solid #e7e0d3;">Department / Location</td>
                      <td style="color: #1e293b; border-bottom: 1px solid #e7e0d3;">${job.department || 'Ayurveda & Wellness'} • ${job.location}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; font-weight: 600;">Submitted Date</td>
                      <td style="color: #1e293b;">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- AI Match Score Card -->
              <tr>
                <td style="padding: 0 32px 20px 32px;">
                  <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 18px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
                      <div>
                        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">AI Match Assessment</span>
                        <div style="font-size: 16px; font-weight: 700; color: #047857; margin-top: 2px;">${score}% Match</div>
                      </div>
                      <span style="display: inline-block; padding: 4px 10px; border-radius: 4px; background-color: ${levelColor}; color: #ffffff; font-size: 10px; font-weight: 700; text-transform: uppercase;">
                        ${levelLabel}
                      </span>
                    </div>

                    <!-- Breakdown -->
                    <div style="margin-top: 10px;">
                      <span style="font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; display: block; margin-bottom: 8px;">Competency Breakdown</span>
                      ${renderBreakdownBarsHtml(application.screeningResult?.breakdown)}
                    </div>
                  </div>
                </td>
              </tr>

              <!-- What Happens Next Timeline -->
              <tr>
                <td style="padding: 0 32px 24px 32px;">
                  <h3 style="margin: 0 0 14px 0; font-size: 13px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">What Happens Next</h3>
                  
                  <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 12px;">
                    <tr>
                      <td width="24" valign="top" style="color: ${ENSIS_GOLD}; font-weight: 700; font-size: 14px;">1.</td>
                      <td><strong>Application Review:</strong> Our Talent Acquisition and Technical team reviews your profile within 1–3 business days.</td>
                    </tr>
                    <tr>
                      <td width="24" valign="top" style="color: ${ENSIS_GOLD}; font-weight: 700; font-size: 14px;">2.</td>
                      <td><strong>Initial Screening:</strong> Qualified candidates are contacted for a brief introductory conversation.</td>
                    </tr>
                    <tr>
                      <td width="24" valign="top" style="color: ${ENSIS_GOLD}; font-weight: 700; font-size: 14px;">3.</td>
                      <td><strong>Technical / Domain Interaction:</strong> In-depth discussion with project leads and founders.</td>
                    </tr>
                    <tr>
                      <td width="24" valign="top" style="color: ${ENSIS_GOLD}; font-weight: 700; font-size: 14px;">4.</td>
                      <td><strong>Decision & Offer:</strong> Offer rollout and onboarding timeline confirmation.</td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Assistance Footer -->
              <tr>
                <td style="background-color: #fafbfc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.5;">
                  <p style="margin: 0 0 6px 0;"><strong>Need assistance with your application?</strong></p>
                  <p style="margin: 0;">Email: <a href="mailto:${settings.hrContact.email}" style="color: #1e40af; text-decoration: none;">${settings.hrContact.email}</a> • Phone: ${settings.hrContact.phone}</p>
                  <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 10px;">ENSIS — Design House India Pvt. Ltd. | ${settings.hrContact.address}</p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    await sendEmail(
      toEmail,
      subject,
      `Your application for ${job.title} (ID: ${application.applicationId}) has been received by Ensis.`,
      html
    );
  } catch (err) {
    console.error('[Career Email] Failed to send candidate confirmation:', (err as Error).message);
  }
}

export async function sendHrNotificationEmail(
  application: ICareerApplication,
  job: ICareer
): Promise<void> {
  try {
    const settings = await getOrCreateCareerSettings();
    const recipients = settings.hrEmails && settings.hrEmails.length > 0 ? settings.hrEmails : ['careers@ensis.in'];
    const candidateName = application.profile.fullName;
    const score = application.screeningResult?.score ?? 0;
    const level = application.screeningResult?.level || 'eligible';
    const levelLabel =
      level === 'eligible' ? 'ELIGIBLE' : level === 'partial' ? 'PARTIAL MATCH' : 'NOT ELIGIBLE';
    const levelColor =
      level === 'eligible' ? '#047857' : level === 'partial' ? '#b45309' : '#be123c';

    // Build resume link (signed admin link)
    let resumeLink = '#';
    const cvFileId = (application.documents && application.documents[0]?.fileId) || application.screeningId;
    if (cvFileId) {
      resumeLink = `http://localhost:5000${generateSignedUrl(cvFileId, 60 * 24)}`;
    }

    const subject = `[New Application] ${job.title} — ${candidateName} (${score}% ${levelLabel})`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f8; padding: 30px 15px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="640" cellpadding="0" cellspacing="0" style="max-width: 640px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
              
              <!-- Header -->
              <tr>
                <td style="background-color: ${ENSIS_GREEN}; padding: 22px 30px; border-bottom: 4px solid ${ENSIS_GOLD}; text-align: left;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">ENSIS HR NOTIFICATION</h1>
                      <p style="margin: 3px 0 0 0; color: ${ENSIS_GOLD}; font-size: 10px; font-weight: 600; text-transform: uppercase;">New Candidate Submission</p>
                    </div>
                  </div>
                </td>
              </tr>

              <!-- Role & Score Hero -->
              <tr>
                <td style="padding: 22px 30px 16px 30px; background-color: #fbfbfd; border-bottom: 1px solid #e2e8f0;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td valign="middle">
                        <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Job Role</span>
                        <h2 style="margin: 4px 0 0 0; font-size: 17px; color: #0f172a;">${job.title}</h2>
                        <span style="font-size: 11px; color: #64748b;">ID: ${application.applicationId}</span>
                      </td>
                      <td align="right" valign="middle">
                        <div style="display: inline-block; text-align: right;">
                          <span style="font-size: 22px; font-weight: 800; color: ${levelColor};">${score}%</span>
                          <span style="display: block; font-size: 9.5px; font-weight: 700; text-transform: uppercase; color: ${levelColor};">${levelLabel}</span>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Candidate Profile Card -->
              <tr>
                <td style="padding: 20px 30px 14px 30px;">
                  <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Candidate Profile</h3>
                  <table width="100%" cellpadding="8" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px;">
                    <tr>
                      <td style="color: #64748b; width: 35%;">Full Name</td>
                      <td style="font-weight: 700; color: #0f172a;">${candidateName}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b;">Email Address</td>
                      <td><a href="mailto:${application.profile.email}" style="color: #1e40af; text-decoration: none;">${application.profile.email}</a></td>
                    </tr>
                    <tr>
                      <td style="color: #64748b;">Phone Number</td>
                      <td>${application.profile.phone}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b;">Current Location</td>
                      <td>${application.profile.currentLocation || 'Not specified'}</td>
                    </tr>
                    ${application.profile.linkedin ? `
                    <tr>
                      <td style="color: #64748b;">LinkedIn Profile</td>
                      <td><a href="${application.profile.linkedin}" target="_blank" style="color: #1e40af; text-decoration: none;">View Profile</a></td>
                    </tr>
                    ` : ''}
                  </table>
                </td>
              </tr>

              <!-- Application Details -->
              <tr>
                <td style="padding: 0 30px 16px 30px;">
                  <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Application Details</h3>
                  <table width="100%" cellpadding="8" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px;">
                    <tr>
                      <td style="color: #64748b; width: 35%;">Notice Period</td>
                      <td style="font-weight: 600;">${application.details.noticePeriod}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b;">Expected CTC</td>
                      <td style="font-weight: 600;">${application.details.expectedCtc}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b;">Preferred Locations</td>
                      <td>${application.details.preferredLocations?.join(', ') || job.location}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b;">Joining Preference</td>
                      <td>${application.details.joiningPreference}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b;">Willing to Relocate</td>
                      <td>${application.details.willingToRelocate ? 'Yes' : 'No'}</td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Match Breakdown -->
              <tr>
                <td style="padding: 0 30px 16px 30px;">
                  <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Match Breakdown</h3>
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px;">
                    ${renderBreakdownBarsHtml(application.screeningResult?.breakdown)}
                  </div>
                </td>
              </tr>

              <!-- Highlights & Strengths -->
              <tr>
                <td style="padding: 0 30px 16px 30px;">
                  <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #047857; text-transform: uppercase;">Key Highlights (AI Strengths)</h3>
                  <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #334155; line-height: 1.6;">
                    ${(application.screeningResult?.strengths || []).map((s) => `<li>${s}</li>`).join('')}
                  </ul>
                </td>
              </tr>

              <!-- Resume & Admin Actions -->
              <tr>
                <td style="padding: 10px 30px 24px 30px;">
                  <div style="background-color: ${ENSIS_CREAM}; border: 1px solid #d5c8ad; border-radius: 6px; padding: 18px; text-align: center;">
                    <p style="margin: 0 0 12px 0; font-size: 12px; font-weight: 600; color: #0f2518;">
                      Access candidate resume & review full profile in the Admin Panel
                    </p>
                    <a href="http://localhost:3001/career-applications" style="display: inline-block; background-color: #0f2518; color: #ffffff; text-decoration: none; padding: 9px 18px; border-radius: 4px; font-size: 12px; font-weight: 700; margin: 4px;">
                      Open Applications in Admin
                    </a>
                    ${resumeLink !== '#' ? `
                    <a href="${resumeLink}" style="display: inline-block; background-color: ${ENSIS_GOLD}; color: #0f2518; text-decoration: none; padding: 9px 18px; border-radius: 4px; font-size: 12px; font-weight: 700; margin: 4px;">
                      Download Candidate CV
                    </a>
                    ` : ''}
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #fafbfc; padding: 16px 30px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center;">
                  Automated notification sent to Ensis HR • Confirmed recipients: ${recipients.join(', ')}
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    for (const recipient of recipients) {
      await sendEmail(
        recipient,
        subject,
        `New application received for ${job.title} from ${candidateName} (${score}% match).`,
        html
      );
    }
  } catch (err) {
    console.error('[Career Email] Failed to send HR notification:', (err as Error).message);
  }
}

export async function sendCandidateStatusUpdateEmail(
  application: ICareerApplication,
  job: ICareer,
  newStatus: string,
  note?: string,
  interviewDetails?: any
): Promise<void> {
  try {
    const toEmail = application.profile.email;
    const candidateName = application.profile.fullName;

    let statusTitle = 'Application Status Update';
    let statusMessage = '';

    if (newStatus === 'shortlisted') {
      statusTitle = 'Congratulations! You Have Been Shortlisted';
      statusMessage = `We are pleased to inform you that your application for <strong>${job.title}</strong> has been shortlisted. Our HR team will reach out to you shortly with next steps.`;
    } else if (newStatus === 'interview_scheduled') {
      statusTitle = 'Interview Scheduled';
      statusMessage = `Your interview for the role of <strong>${job.title}</strong> has been scheduled.
        ${interviewDetails?.date ? `<br><strong>Date:</strong> ${interviewDetails.date}` : ''}
        ${interviewDetails?.time ? `<br><strong>Time:</strong> ${interviewDetails.time}` : ''}
        ${interviewDetails?.mode ? `<br><strong>Mode:</strong> ${interviewDetails.mode}` : ''}
        ${interviewDetails?.linkOrLocation ? `<br><strong>Details:</strong> ${interviewDetails.linkOrLocation}` : ''}
        ${interviewDetails?.instructions ? `<br><strong>Instructions:</strong> ${interviewDetails.instructions}` : ''}
      `;
    } else if (newStatus === 'hired') {
      statusTitle = 'Welcome to Ensis!';
      statusMessage = `We are delighted to extend our congratulations on your selection for the position of <strong>${job.title}</strong> at ENSIS. Our team will share the formal offer and onboarding details.`;
    } else if (newStatus === 'rejected') {
      statusTitle = 'Update on Your Application';
      statusMessage = `Thank you for taking the time to apply for the position of <strong>${job.title}</strong> at ENSIS. While we were impressed with your qualifications, we have decided to proceed with other candidates whose experience more closely matches our current requirements. We will keep your resume in our talent network for future opportunities.`;
    } else {
      statusMessage = `Your application status for <strong>${job.title}</strong> has been updated to: <strong>${newStatus}</strong>.`;
    }

    const subject = `${statusTitle} — ${job.title} (${application.applicationId})`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>${subject}</title></head>
    <body style="font-family: -apple-system, sans-serif; background-color: #f8fafc; padding: 25px; color: #1e293b;">
      <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background: ${ENSIS_GREEN}; padding: 20px 28px; border-bottom: 3px solid ${ENSIS_GOLD}; color: #ffffff;">
          <h2 style="margin: 0; font-size: 18px;">ENSIS</h2>
          <p style="margin: 3px 0 0 0; font-size: 10px; color: ${ENSIS_GOLD}; text-transform: uppercase;">Careers & Talent</p>
        </div>
        <div style="padding: 24px 28px;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #0f172a;">${statusTitle}</h3>
          <p style="font-size: 13px; line-height: 1.6; color: #334155;">
            Dear <strong>${candidateName}</strong>,<br><br>
            ${statusMessage}
          </p>
          ${note ? `<div style="background-color: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 12px; margin: 15px 0;"><strong>Note from HR:</strong> ${note}</div>` : ''}
          <p style="font-size: 11px; color: #64748b; margin-top: 20px;">
            Application Reference: <strong>${application.applicationId}</strong>
          </p>
        </div>
      </div>
    </body>
    </html>
    `;

    await sendEmail(toEmail, subject, statusMessage.replace(/<[^>]+>/g, ''), html);
  } catch (err) {
    console.error('[Career Email] Status update email failed:', (err as Error).message);
  }
}
