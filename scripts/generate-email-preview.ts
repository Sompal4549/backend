import fs from 'fs';
import path from 'path';
import {
  renderCandidateConfirmationEmailHtml,
  renderHrNotificationEmailHtml,
} from '../src/services/career-email.service';

async function main() {
  const dummyApp: any = {
    applicationId: 'ENS-CAR-2026-00187',
    jobTitle: 'Product Designer',
    status: 'received',
    createdAt: new Date('2026-10-17T11:24:00'),
    profile: {
      fullName: 'Vijay Sharma',
      email: 'vijay.sharma@gmail.com',
      phone: '+91 98765 43210',
      currentLocation: 'Delhi NCR, Kalkaji Clinic',
      dateOfBirth: new Date('1995-11-14'),
      gender: 'Male',
      linkedin: 'https://linkedin.com/in/vijay-sharma',
      photoUrl: fs.existsSync('c:/Users/sompa/Desktop/namo-gange/ensis-Frontend/src/assets/career/new/Smiling Entrepreneur in a Lush Home Office.png')
        ? 'data:image/png;base64,' + fs.readFileSync('c:/Users/sompa/Desktop/namo-gange/ensis-Frontend/src/assets/career/new/Smiling Entrepreneur in a Lush Home Office.png').toString('base64')
        : undefined,
    },
    details: {
      preferredLocations: ['Delhi NCR', 'Bengaluru'],
      noticePeriod: '30 Days',
      expectedCtc: '12 LPA',
    },
    screeningResult: {
      score: 85,
      level: 'eligible',
      breakdown: [
        { key: 'education', label: 'Educational Qualification', score: 90 },
        { key: 'creative_thinking', label: 'Creative & Design Thinking', score: 88 },
        { key: 'experience', label: 'Relevant Experience', score: 85 },
        { key: 'communication', label: 'Communication Skills', score: 75 },
        { key: 'technical_skills', label: 'Design & Technical Skills', score: 80 },
        { key: 'portfolio', label: 'Portfolio Quality', score: 80 },
      ],
      strengths: [
        'B.Des / M.Des qualified (Product or Industrial Design)',
        '3+ years of relevant design experience',
        'Experience in product and spatial design',
        'Strong portfolio with concept development and 3D modeling',
        'Good communication, presentation and collaboration skills',
        'Willing to work from Delhi NCR',
      ],
    },
  };

  const dummyJob: any = {
    title: 'Product Designer',
    location: 'Delhi NCR, Bengaluru',
  };

  const candidateHtml = await renderCandidateConfirmationEmailHtml(dummyApp, dummyJob, { isEmailMime: false });
  const hrHtml = await renderHrNotificationEmailHtml(dummyApp, dummyJob, { isEmailMime: false });

  const outDir = path.resolve(process.cwd(), 'email-previews');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const candidatePath = path.join(outDir, 'candidate-email.html');
  const hrPath = path.join(outDir, 'hr-email.html');

  fs.writeFileSync(candidatePath, candidateHtml, 'utf8');
  fs.writeFileSync(hrPath, hrHtml, 'utf8');

  console.log('Candidate email generated at:', candidatePath);
  console.log('HR email generated at:', hrPath);
}

main().catch((err) => {
  console.error('Error generating previews:', err);
  process.exit(1);
});
