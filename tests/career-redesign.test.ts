import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app, createTestAdmin } from './helpers';
import { CareerModel } from '../src/models/career.model';
import { ScreeningModel } from '../src/models/screening.model';
import { CareerApplicationModel } from '../src/models/career-application.model';
import { CareerCounterModel } from '../src/models/career-counter.model';
import * as aiCvService from '../src/services/ai-cv.service';
import * as emailService from '../src/services/email.service';

describe('Career Redesign — Backend Test Suite', () => {
  let adminToken: string;

  beforeEach(async () => {
    const admin = await createTestAdmin('career-test-admin@ensis.in');
    adminToken = admin.token;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Public Job API (Contract §1)', () => {
    it('returns only open jobs with strict public projection (no CTC, KPIs, salary)', async () => {
      await CareerModel.deleteMany({});

      // Create an open job with internal fields
      const openJob = await CareerModel.create({
        title: 'Panchkarma Space Designer',
        department: 'Design',
        location: 'Delhi NCR',
        employmentType: 'Full Time',
        workplaceType: 'On-site',
        experienceMin: 2,
        experienceMax: 5,
        educationRequirements: 'B.Des / Architecture',
        shortDescription: 'Design therapeutic interior spaces for ayurvedic centres.',
        coverImage: 'https://res.cloudinary.com/ensis/image/upload/sample.webp',
        description: 'Comprehensive space design role.',
        responsibilities: ['Create 3D layouts', 'Coordinate with woodcraft team'],
        requirements: ['2+ years experience in spatial design', 'AutoCAD / Rhino proficiency'],
        aiCheckPoints: ['Verify portfolio', 'Check spatial CAD competence'],
        eligibilityThreshold: 70,
        partialMatchMin: 50,
        showMatchScoreToCandidate: true,
        showMatchBreakdown: true,
        featuredJob: true,
        applicationClosingDate: '2026-12-31T23:59:59.000Z',
        status: 'active',
        jobStatus: 'OPEN',
        slug: 'panchkarma-space-designer',
        // Internal fields that MUST NOT leak
        ctcMin: 800000,
        ctcMax: 1200000,
        salary: '8-12 LPA',
        salaryType: 'Annual',
        kpis: ['Complete 5 designs/month'],
        kras: ['Client delight'],
      });

      // Create a closed job
      await CareerModel.create({
        title: 'Closed Junior Drafter',
        department: 'Drafting',
        location: 'Delhi NCR',
        type: 'Full Time',
        experience: '1 Year',
        status: 'closed',
        jobStatus: 'CLOSED',
        slug: 'closed-junior-drafter',
      });

      const res = await request(app).get('/api/v1/careers');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const jobs = res.body.data;
      expect(jobs.length).toBe(1);
      expect(jobs[0].title).toBe('Panchkarma Space Designer');
      expect(jobs[0].slug).toBe('panchkarma-space-designer');
      expect(jobs[0].shortDescription).toBe('Design therapeutic interior spaces for ayurvedic centres.');
      expect(jobs[0].coverImage).toBe('https://res.cloudinary.com/ensis/image/upload/sample.webp');
      expect(jobs[0].aiCheckPoints).toEqual(['Verify portfolio', 'Check spatial CAD competence']);

      // Verify internal fields are omitted
      expect(jobs[0].ctcMin).toBeUndefined();
      expect(jobs[0].ctcMax).toBeUndefined();
      expect(jobs[0].salary).toBeUndefined();
      expect(jobs[0].kpis).toBeUndefined();
      expect(jobs[0].kras).toBeUndefined();
    });

    it('GET /careers/:slug returns public job or 404 if missing / closed', async () => {
      const openJob = await CareerModel.create({
        title: 'Spa Equipment Specialist',
        department: 'Operations',
        location: 'Bengaluru',
        type: 'Full Time',
        experience: '3 – 5 Years',
        status: 'active',
        jobStatus: 'OPEN',
        slug: 'spa-equipment-specialist',
        ctcMin: 700000,
      });

      // Valid open slug
      const res = await request(app).get('/api/v1/careers/spa-equipment-specialist');
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Spa Equipment Specialist');
      expect(res.body.data.ctcMin).toBeUndefined();

      // Missing slug -> 404
      const resMissing = await request(app).get('/api/v1/careers/non-existent-role');
      expect(resMissing.status).toBe(404);

      // Closed slug -> 404
      await CareerModel.findByIdAndUpdate(openJob._id, { status: 'closed', jobStatus: 'CLOSED' });
      const resClosed = await request(app).get('/api/v1/careers/spa-equipment-specialist');
      expect(resClosed.status).toBe(404);
    });
  });

  describe('2. AI Screening API (Contract §3)', () => {
    it('POST /careers/:jobId/screenings validates CV file and starts background processing', async () => {
      const job = await CareerModel.create({
        title: 'Ayurvedic Consultant',
        department: 'Consulting',
        location: 'Delhi NCR',
        type: 'Full Time',
        experience: '2 Years',
        status: 'active',
        jobStatus: 'OPEN',
        slug: 'ayurvedic-consultant',
      });

      // Missing file -> 422
      const resNoFile = await request(app).post(`/api/v1/careers/${job._id}/screenings`);
      expect(resNoFile.status).toBe(422);

      // Invalid file format -> 422
      const resInvalidExt = await request(app)
        .post(`/api/v1/careers/${job._id}/screenings`)
        .attach('cv', Buffer.from('fake image data'), 'test.png');
      expect(resInvalidExt.status).toBe(422);

      // Valid PDF file -> 201
      const fakePdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
      const resValid = await request(app)
        .post(`/api/v1/careers/${job._id}/screenings`)
        .attach('cv', fakePdfBuffer, 'candidate_resume.pdf');

      expect(resValid.status).toBe(201);
      expect(resValid.body.success).toBe(true);
      expect(resValid.body.data.screeningId).toBeDefined();
      expect(resValid.body.data.status).toBe('processing');
      expect(resValid.body.data.cv.fileName).toBe('candidate_resume.pdf');
    });

    it('GET /careers/screenings/:screeningId polls status and respects showMatchScore / showMatchBreakdown', async () => {
      const job = await CareerModel.create({
        title: 'Research Analyst',
        department: 'R&D',
        location: 'Delhi NCR',
        type: 'Full Time',
        experience: '2 Years',
        status: 'active',
        jobStatus: 'OPEN',
        showMatchScoreToCandidate: false, // hide score
        showMatchBreakdown: false,        // hide breakdown
      });

      const screening = await ScreeningModel.create({
        screeningId: 'test-screening-poll-123',
        jobId: String(job._id),
        status: 'done',
        progress: 100,
        steps: [
          { key: 'read_cv', label: 'Read CV', state: 'done' },
          { key: 'calculate_score', label: 'Calculate Score', state: 'done' },
        ],
        cv: { fileName: 'cv.pdf', size: 1024, uploadedAt: new Date().toISOString() },
        result: {
          score: 84,
          level: 'eligible',
          thresholds: { eligible: 70, partial: 50 },
          breakdown: [{ key: 'education', label: 'Education', sublabel: 'Sub', score: 85 }],
          strengths: ['Great experience'],
          gaps: [],
          suggestions: [],
          profile: {
            fullName: 'Rajesh Sharma',
            email: 'rajesh@example.com',
            phone: '+91 9876543210',
            education: [],
            experience: [],
            skills: [],
            certifications: [],
          },
        },
      });

      const res = await request(app).get(`/api/v1/careers/screenings/${screening.screeningId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('done');
      expect(res.body.data.result.level).toBe('eligible');
      // Score and breakdown should be stripped based on job flags
      expect(res.body.data.result.score).toBeUndefined();
      expect(res.body.data.result.breakdown).toBeUndefined();
      expect(res.body.data.result.strengths).toEqual(['Great experience']);
    });

    it('GET /careers/screenings/:id/report.pdf streams branded PDF', async () => {
      const job = await CareerModel.create({
        title: 'Lead Architect',
        department: 'Design',
        location: 'Delhi NCR',
        type: 'Full Time',
        experience: '5 Years',
        status: 'active',
        jobStatus: 'OPEN',
      });

      const screening = await ScreeningModel.create({
        screeningId: 'test-screening-pdf-123',
        jobId: String(job._id),
        status: 'done',
        progress: 100,
        steps: [],
        cv: { fileName: 'resume.pdf', size: 1024, uploadedAt: new Date().toISOString() },
        result: {
          score: 78,
          level: 'eligible',
          thresholds: { eligible: 70, partial: 50 },
          breakdown: [{ key: 'education', label: 'Education', sublabel: 'Academic', score: 80 }],
          strengths: ['Strong design portfolio'],
          gaps: [],
          suggestions: ['Include more site photos'],
          profile: {
            fullName: 'Anita Verma',
            email: 'anita@example.com',
            phone: '+91 9811223344',
            education: [],
            experience: [],
            skills: [],
            certifications: [],
          },
        },
      });

      const res = await request(app).get(`/api/v1/careers/screenings/${screening.screeningId}/report.pdf`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.body).toBeDefined();
    });
  });

  describe('3. Private Uploads API (Contract §4.1)', () => {
    it('POST /careers/uploads validates size and stores photos & documents privately', async () => {
      // Photo upload
      const photoBuffer = Buffer.from('fake image content');
      const resPhoto = await request(app)
        .post('/api/v1/careers/uploads')
        .attach('file', photoBuffer, 'headshot.jpg');

      expect(resPhoto.status).toBe(201);
      expect(resPhoto.body.data.fileId).toBeDefined();
      expect(resPhoto.body.data.kind).toBe('photo');

      // Document upload
      const docBuffer = Buffer.from('fake pdf content');
      const resDoc = await request(app)
        .post('/api/v1/careers/uploads')
        .attach('file', docBuffer, 'experience_certificate.pdf');

      expect(resDoc.status).toBe(201);
      expect(resDoc.body.data.kind).toBe('document');
    });
  });

  describe('4. Application Submission API (Contract §4)', () => {
    it('validates required fields and returns 422 with errors array', async () => {
      const res = await request(app).post('/api/v1/careers/applications').send({});
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(Array.isArray(res.body.data.errors)).toBe(true);
      expect(res.body.data.errors.length).toBeGreaterThan(0);
    });

    it('rejects submission if job is closed (410)', async () => {
      const closedJob = await CareerModel.create({
        title: 'Closed Workshop Lead',
        department: 'Production',
        location: 'Ghaziabad',
        type: 'Full Time',
        experience: '4 Years',
        status: 'closed',
        jobStatus: 'CLOSED',
        slug: 'closed-workshop-lead',
      });

      const screening = await ScreeningModel.create({
        screeningId: 'screen-closed-job',
        jobId: String(closedJob._id),
        status: 'done',
        progress: 100,
        cv: { fileName: 'cv.pdf', size: 1024, uploadedAt: new Date().toISOString() },
        result: {
          score: 80,
          level: 'eligible',
          thresholds: { eligible: 70, partial: 50 },
          breakdown: [],
          strengths: [],
          gaps: [],
          suggestions: [],
          profile: {
            fullName: 'Test Candidate',
            email: 'candidate@example.com',
            phone: '+91 9876543210',
            education: [],
            experience: [],
            skills: [],
            certifications: [],
          },
        },
      });

      const res = await request(app).post('/api/v1/careers/applications').send({
        screeningId: screening.screeningId,
        jobId: String(closedJob._id),
        profile: { fullName: 'Test', email: 'test@example.com', phone: '9876543210' },
        details: { preferredLocations: ['Delhi NCR'], noticePeriod: '30 Days', expectedCtc: '8 LPA', joiningPreference: 'Immediate' },
        additional: { whyJoin: 'Passionate about Ensis', workedWith: [] },
        references: [],
        documents: [],
        consents: { accurate: true, verify: true, futureContact: true, privacy: true },
      });

      expect(res.status).toBe(410);
    });

    it('rejects not_eligible screening with 409', async () => {
      const job = await CareerModel.create({
        title: 'Senior Wellness Architect',
        department: 'Design',
        location: 'Delhi NCR',
        type: 'Full Time',
        experience: '5 Years',
        status: 'active',
        jobStatus: 'OPEN',
      });

      const screening = await ScreeningModel.create({
        screeningId: 'screen-not-eligible',
        jobId: String(job._id),
        status: 'done',
        progress: 100,
        cv: { fileName: 'cv.pdf', size: 1024, uploadedAt: new Date().toISOString() },
        result: {
          score: 42,
          level: 'not_eligible',
          thresholds: { eligible: 70, partial: 50 },
          breakdown: [],
          strengths: [],
          gaps: ['Insufficient domain experience'],
          suggestions: [],
          profile: {
            fullName: 'Ineligible Candidate',
            email: 'ineligible@example.com',
            phone: '+91 9876543210',
            education: [],
            experience: [],
            skills: [],
            certifications: [],
          },
        },
      });

      const res = await request(app).post('/api/v1/careers/applications').send({
        screeningId: screening.screeningId,
        jobId: String(job._id),
        profile: { fullName: 'Ineligible', email: 'ineligible@example.com', phone: '9876543210' },
        details: { preferredLocations: ['Delhi NCR'], noticePeriod: '30 Days', expectedCtc: '8 LPA', joiningPreference: 'Immediate' },
        additional: { whyJoin: 'Interested', workedWith: [] },
        references: [],
        documents: [],
        consents: { accurate: true, verify: true, futureContact: true, privacy: true },
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('eligibility');
    });

    it('creates application with atomic ENS-CAR-YYYY-XXXXX sequence, sends emails, and rejects duplicates (409)', async () => {
      const emailSpy = vi.spyOn(emailService, 'sendEmail').mockResolvedValue(undefined);

      const job = await CareerModel.create({
        title: 'Project Coordinator',
        department: 'Operations',
        location: 'Delhi NCR',
        type: 'Full Time',
        experience: '2 Years',
        status: 'active',
        jobStatus: 'OPEN',
      });

      const screening = await ScreeningModel.create({
        screeningId: 'screen-eligible-success',
        jobId: String(job._id),
        status: 'done',
        progress: 100,
        cv: { fileName: 'candidate_cv.pdf', size: 1024, uploadedAt: new Date().toISOString() },
        result: {
          score: 82,
          level: 'eligible',
          thresholds: { eligible: 70, partial: 50 },
          breakdown: [
            { key: 'education', label: 'Education', sublabel: 'Relevance', score: 85 },
            { key: 'experience', label: 'Experience', sublabel: 'Domain', score: 80 },
          ],
          strengths: ['Great project execution'],
          gaps: [],
          suggestions: [],
          profile: {
            fullName: 'Vikas Mehra',
            email: 'vikas@example.com',
            phone: '+91 9876543210',
            education: [],
            experience: [],
            skills: [],
            certifications: [],
          },
        },
      });

      const payload = {
        screeningId: screening.screeningId,
        jobId: String(job._id),
        profile: {
          fullName: 'Vikas Mehra',
          email: 'vikas@example.com',
          phone: '+91 9876543210',
          currentLocation: 'New Delhi',
          education: [],
          experience: [],
          skills: [{ name: 'Project Coordination', level: 85 }],
          certifications: [],
        },
        details: {
          preferredLocations: ['Delhi NCR'],
          noticePeriod: '30 Days',
          expectedCtc: '9 LPA',
          joiningPreference: 'Within 1 Month',
          willingToRelocate: true,
        },
        additional: {
          whyJoin: 'Ensis is the industry leader in authentic Panchkarma setups.',
          workedWith: ['Woodwork', 'Interior Contractors'],
        },
        references: [],
        documents: [],
        consents: {
          accurate: true,
          verify: true,
          futureContact: true,
          privacy: true,
        },
      };

      const res = await request(app).post('/api/v1/careers/applications').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.applicationId).toMatch(/^ENS-CAR-\d{4}-\d{5}$/);
      expect(res.body.data.status).toBe('received');
      expect(res.body.data.email).toBe('vikas@example.com');

      // Duplicate submission within 30 days should return 409
      const resDup = await request(app).post('/api/v1/careers/applications').send(payload);
      expect(resDup.status).toBe(409);
      expect(resDup.body.message).toContain('30 days');
    });
  });

  describe('5. Admin Application Management API', () => {
    it('GET /careers/admin/applications returns stats and paginated list for admin', async () => {
      const res = await request(app)
        .get('/api/v1/careers/admin/applications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats).toBeDefined();
      expect(res.body.data.stats.total).toBeGreaterThanOrEqual(1);
    });

    it('PATCH /careers/admin/applications/:id/status updates status and triggers notification', async () => {
      const emailSpy = vi.spyOn(emailService, 'sendEmail').mockResolvedValue(undefined);

      const appDoc = await CareerApplicationModel.findOne();
      expect(appDoc).toBeDefined();

      const res = await request(app)
        .patch(`/api/v1/careers/admin/applications/${appDoc!.applicationId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'shortlisted',
          note: 'Profile passed initial review, proceed to interview round',
          notifyCandidate: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('shortlisted');
      expect(res.body.data.statusHistory.length).toBeGreaterThan(1);
    });
  });
});
