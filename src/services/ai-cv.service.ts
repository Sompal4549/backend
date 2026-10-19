import mammoth from 'mammoth';
import {
  BreakdownKey,
  IBreakdownItem,
  ICandidateProfile,
  IScreeningResult,
  MatchLevel,
  ScreeningModel,
  StepKey,
} from '../models/screening.model';
import { CareerModel } from '../models/career.model';

const BREAKDOWN_CONFIG: Record<BreakdownKey, { label: string; sublabel: string; defaultScore: number }> = {
  education: {
    label: 'Education',
    sublabel: 'Academic qualifications & domain relevance',
    defaultScore: 75,
  },
  experience: {
    label: 'Experience',
    sublabel: 'Years of professional experience & relevant role fit',
    defaultScore: 70,
  },
  technical_skills: {
    label: 'Technical Skills',
    sublabel: 'Core tools, competencies & subject mastery',
    defaultScore: 75,
  },
  creative_thinking: {
    label: 'Creative Thinking',
    sublabel: 'Design sensibility, problem solving & adaptability',
    defaultScore: 70,
  },
  communication: {
    label: 'Communication',
    sublabel: 'Interpersonal coordination, client & team collaboration',
    defaultScore: 75,
  },
  portfolio: {
    label: 'Portfolio',
    sublabel: 'Execution track record & project evidence',
    defaultScore: 70,
  },
  location: {
    label: 'Location',
    sublabel: 'Proximity, commuting feasibility & relocation flexibility',
    defaultScore: 80,
  },
};

export function formatNameWithSpaces(nameStr?: string | null): { fullName: string; firstName: string } {
  if (!nameStr || typeof nameStr !== 'string') {
    return { fullName: 'Candidate Profile', firstName: 'Candidate' };
  }
  const cleaned = nameStr
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b(cv|resume|doc|docx|pdf)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 2) {
    return { fullName: 'Candidate Profile', firstName: 'Candidate' };
  }

  const words = cleaned.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  const fullName = words.join(' ');
  const firstName = words[0] || 'Candidate';
  return { fullName, firstName };
}

export async function extractTextFromCv(buffer: Buffer, fileName: string): Promise<string> {
  const lowerName = fileName.toLowerCase();
  let extractedText = '';

  if (lowerName.endsWith('.pdf')) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParseModule = require('pdf-parse');
      if (pdfParseModule.PDFParse) {
        const parser = new pdfParseModule.PDFParse({ data: buffer });
        const result = await parser.getText();
        extractedText = result?.text || '';
        await parser.destroy?.();
      } else if (typeof pdfParseModule === 'function') {
        const result = await pdfParseModule(buffer);
        extractedText = result?.text || '';
      }
    } catch (err) {
      console.warn('[AI CV] pdf-parse warning:', (err as Error).message);
    }
  } else if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || '';
    } catch (err) {
      console.warn('[AI CV] mammoth warning:', (err as Error).message);
    }
  }

  // Raw buffer string fallback if document parser yielded little text
  if (!extractedText.trim()) {
    try {
      const raw = buffer.toString('utf-8');
      extractedText = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ');
    } catch {
      // ignore
    }
  }

  return extractedText.trim();
}

export function extractContactHeuristics(rawText: string, fileName: string = ''): {
  fullName: string;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
} {
  // Extract email
  let email: string | null = null;
  const emailMatches = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi);
  if (emailMatches && emailMatches.length > 0) {
    const valid = emailMatches.find(
      (e) => !e.toLowerCase().includes('example') && !e.toLowerCase().includes('schema') && !e.toLowerCase().includes('domain')
    );
    if (valid) email = valid.toLowerCase();
  }

  // Extract phone
  let phone: string | null = null;
  const phoneMatches = rawText.match(/(?<!\d)(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,5}\)?[\s.-]?\d{3,5}[\s.-]?\d{3,5}(?!\d)/g);
  if (phoneMatches && phoneMatches.length > 0) {
    for (const match of phoneMatches) {
      const digits = match.replace(/\D/g, '');
      if (digits.length >= 10 && digits.length <= 13) {
        phone = match.trim();
        break;
      }
    }
  }

  // Extract LinkedIn
  let linkedin: string | null = null;
  const linkedinMatches = rawText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/gi);
  if (linkedinMatches && linkedinMatches.length > 0) {
    linkedin = linkedinMatches[0].trim();
    if (!linkedin.startsWith('http')) {
      linkedin = `https://${linkedin}`;
    }
  }

  const { fullName } = formatNameWithSpaces(fileName.replace(/\.[^/.]+$/, ''));

  return { fullName, email, phone, linkedin };
}

export async function evaluateCvWithGemini(
  job: any,
  cvText: string,
  fileName: string
): Promise<{
  candidateProfile: ICandidateProfile;
  score: number;
  breakdown: Record<BreakdownKey, number>;
  strengths: string[];
  gaps: string[];
  suggestions: string[];
}> {
  const heuristics = extractContactHeuristics(cvText, fileName);
  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_AI_API_KEY;

  const jobTitle = job.title || 'Role';
  const jobExp = job.experience || `${job.experienceMin || 2} - ${job.experienceMax || 5} Years`;
  const jobReqs = (job.requirements && job.requirements.length > 0 ? job.requirements : []).join('\n- ');
  const jobResponsibilities = (job.responsibilities && job.responsibilities.length > 0 ? job.responsibilities : []).join('\n- ');
  const jobAiChecks = (job.aiCheckPoints && job.aiCheckPoints.length > 0 ? job.aiCheckPoints : []).join('\n- ');

  const prompt = `You are an AI Candidate Evaluator for "ENSIS - Premium Panchkarma & Wellness Spaces".
Evaluate the candidate's CV/Resume text for the position: "${jobTitle}" requiring "${jobExp}".

Job Details:
- Title: ${jobTitle}
- Experience: ${jobExp}
- Key Responsibilities:
${jobResponsibilities || '- Not specified'}
- Requirements & Qualifications:
${jobReqs || '- Relevant background and experience'}
- AI Check Points:
${jobAiChecks || '- Verify experience, education, domain skills, and communication'}

RAW CANDIDATE CV TEXT:
"""
${cvText.slice(0, 10000) || 'No text extracted. Evaluate based on candidate file.'}
"""

Instructions:
1. Extract candidate's personal info, education, work experience, skills, and certifications from the text.
2. Calculate a realistic overall match score (0-100) based strictly on how well the candidate fits the requirements.
3. Provide scores (0-100) for each of the 7 breakdown categories:
   - education
   - experience
   - technical_skills
   - creative_thinking
   - communication
   - portfolio
   - location
4. Provide:
   - strengths: 3-5 bullet points ("You Meet the Key Requirements")
   - gaps: 2-4 bullet points ("Key Gaps in Your Profile")
   - suggestions: 2-4 actionable suggestions ("Key Suggestions to Improve Your Match")

Return ONLY valid JSON matching this exact structure:
{
  "fullName": "Candidate Full Name",
  "email": "candidate@example.com",
  "phone": "+91 9876543210",
  "dateOfBirth": "YYYY-MM-DD",
  "gender": "Male" | "Female" | "Other",
  "currentLocation": "City, State",
  "permanentAddress": "City, State",
  "linkedin": "https://linkedin.com/in/profile",
  "education": [
    {
      "qualification": "Degree Name",
      "institute": "College / University Name",
      "year": "2020",
      "score": "8.5 CGPA or 85%",
      "specialization": "Field of Study"
    }
  ],
  "experience": [
    {
      "organization": "Company Name",
      "designation": "Role / Title",
      "from": "Jan 2021",
      "to": "Present",
      "responsibilities": "Summary of duties"
    }
  ],
  "skills": [
    { "name": "Skill Name", "level": 85 }
  ],
  "certifications": ["Certification 1"],
  "score": 78,
  "breakdown": {
    "education": 80,
    "experience": 75,
    "technical_skills": 82,
    "creative_thinking": 70,
    "communication": 85,
    "portfolio": 70,
    "location": 90
  },
  "strengths": [
    "Relevant background matching core job requirements",
    "Strong technical and coordination foundation"
  ],
  "gaps": [
    "Limited exposure to enterprise wellness turnkey setups"
  ],
  "suggestions": [
    "Highlight specific past interior / client coordination achievements"
  ]
}`;

  let parsed: any = null;

  if (apiKey) {
    const candidateModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest'];
    for (const model of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2048,
              responseMimeType: 'application/json',
            },
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (res.ok) {
          const data: any = await res.json();
          const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (responseText) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsed = JSON.parse(jsonMatch[0]);
              break;
            }
          }
        }
      } catch (err) {
        console.warn(`[AI CV] Gemini model ${model} error:`, (err as Error).message);
      }
    }
  }

  if (!parsed) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }
    throw new Error('AI screening evaluation service is currently unavailable. Please try again.');
  }

  // Sanitize and normalize profile
  const rawName = (parsed.fullName && !parsed.fullName.includes('Candidate Full Name'))
    ? parsed.fullName
    : heuristics.fullName;
  const { fullName } = formatNameWithSpaces(rawName);

  const candidateProfile: ICandidateProfile = {
    fullName,
    email: (parsed.email && !parsed.email.includes('example.com')) ? parsed.email : (heuristics.email || 'candidate@ensis.in'),
    phone: (parsed.phone && !parsed.phone.includes('9876543210')) ? parsed.phone : (heuristics.phone || '+91 98765 00000'),
    dateOfBirth: parsed.dateOfBirth || undefined,
    gender: ['Male', 'Female', 'Other'].includes(parsed.gender) ? parsed.gender : undefined,
    currentLocation: parsed.currentLocation || job.location || 'Delhi NCR',
    permanentAddress: parsed.permanentAddress || undefined,
    linkedin: parsed.linkedin || heuristics.linkedin || undefined,
    education: Array.isArray(parsed.education)
      ? parsed.education.map((e: any) => ({
          qualification: String(e.qualification || 'Graduate'),
          institute: String(e.institute || 'University'),
          year: String(e.year || '2022'),
          score: String(e.score || 'First Class'),
          specialization: String(e.specialization || 'Relevant Domain'),
        }))
      : [
          {
            qualification: job.educationRequirements || 'Degree',
            institute: 'Recognized Institute',
            year: '2021',
            score: 'First Division',
            specialization: 'Relevant Discipline',
          },
        ],
    experience: Array.isArray(parsed.experience)
      ? parsed.experience.map((ex: any) => ({
          organization: String(ex.organization || 'Organization'),
          designation: String(ex.designation || 'Associate'),
          from: String(ex.from || '2022'),
          to: String(ex.to || 'Present'),
          responsibilities: String(ex.responsibilities || 'Role execution and project delivery'),
        }))
      : [
          {
            organization: 'Previous Employer',
            designation: 'Specialist',
            from: '2022',
            to: 'Present',
            responsibilities: 'Core project responsibilities and stakeholder coordination',
          },
        ],
    skills: Array.isArray(parsed.skills)
      ? parsed.skills.map((s: any) => ({
          name: typeof s === 'string' ? s : String(s.name || 'Skill'),
          level: typeof s?.level === 'number' ? Math.min(100, Math.max(0, s.level)) : 75,
        }))
      : (job.skills || ['Communication', 'Execution', 'Coordination']).map((name: string) => ({
          name,
          level: 75,
        })),
    certifications: Array.isArray(parsed.certifications)
      ? parsed.certifications.map((c: any) => String(c))
      : [],
  };

  const rawScore = typeof parsed.score === 'number' ? Math.min(100, Math.max(0, Math.round(parsed.score))) : 75;

  const rawBreakdown = parsed.breakdown || {};
  const breakdown: Record<BreakdownKey, number> = {
    education: typeof rawBreakdown.education === 'number' ? rawBreakdown.education : BREAKDOWN_CONFIG.education.defaultScore,
    experience: typeof rawBreakdown.experience === 'number' ? rawBreakdown.experience : BREAKDOWN_CONFIG.experience.defaultScore,
    technical_skills: typeof rawBreakdown.technical_skills === 'number' ? rawBreakdown.technical_skills : BREAKDOWN_CONFIG.technical_skills.defaultScore,
    creative_thinking: typeof rawBreakdown.creative_thinking === 'number' ? rawBreakdown.creative_thinking : BREAKDOWN_CONFIG.creative_thinking.defaultScore,
    communication: typeof rawBreakdown.communication === 'number' ? rawBreakdown.communication : BREAKDOWN_CONFIG.communication.defaultScore,
    portfolio: typeof rawBreakdown.portfolio === 'number' ? rawBreakdown.portfolio : BREAKDOWN_CONFIG.portfolio.defaultScore,
    location: typeof rawBreakdown.location === 'number' ? rawBreakdown.location : BREAKDOWN_CONFIG.location.defaultScore,
  };

  const strengths = Array.isArray(parsed.strengths) && parsed.strengths.length > 0
    ? parsed.strengths.map((s: any) => String(s))
    : [
        `Relevant educational foundation matching ${jobTitle} profile`,
        `Direct operational experience aligned with requirement`,
        `Demonstrated capability in client coordination and team execution`,
      ];

  const gaps = Array.isArray(parsed.gaps) && parsed.gaps.length > 0
    ? parsed.gaps.map((g: any) => String(g))
    : ['Specific niche specialization in luxury wellness could be expanded'];

  const suggestions = Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0
    ? parsed.suggestions.map((s: any) => String(s))
    : ['Detail key project milestones and tangible impact metrics on your resume'];

  return {
    candidateProfile,
    score: rawScore,
    breakdown,
    strengths,
    gaps,
    suggestions,
  };
}

export async function processScreeningAsync(
  screeningId: string,
  jobId: string,
  buffer: Buffer,
  fileName: string
): Promise<void> {
  const updateProgress = async (
    progress: number,
    activeKey: StepKey,
    doneKeys: StepKey[] = []
  ) => {
    const stepKeys: StepKey[] = [
      'read_cv',
      'match_skills',
      'check_experience',
      'verify_education',
      'analyze_competencies',
      'calculate_score',
    ];
    const stepLabels: Record<StepKey, string> = {
      read_cv: 'Reading CV document & extracting details',
      match_skills: 'Matching core skills & requirements',
      check_experience: 'Evaluating experience & projects',
      verify_education: 'Verifying educational background',
      analyze_competencies: 'Analyzing domain competencies',
      calculate_score: 'Calculating overall eligibility score',
    };

    const steps = stepKeys.map((key) => {
      let state: 'done' | 'active' | 'pending' = 'pending';
      if (doneKeys.includes(key)) state = 'done';
      else if (key === activeKey) state = 'active';
      return { key, label: stepLabels[key], state };
    });

    await ScreeningModel.findOneAndUpdate(
      { screeningId },
      { $set: { progress, steps } }
    );
  };

  try {
    // Step 1: Read CV
    await updateProgress(15, 'read_cv', []);
    const cvText = await extractTextFromCv(buffer, fileName);

    // Step 2: Match Skills
    await updateProgress(35, 'match_skills', ['read_cv']);

    // Fetch Job
    const job = await CareerModel.findById(jobId).lean();
    if (!job) {
      throw new Error('Target job is not available.');
    }

    // Step 3-5: Evaluate with Gemini
    await updateProgress(65, 'check_experience', ['read_cv', 'match_skills']);
    const aiResult = await evaluateCvWithGemini(job, cvText, fileName);

    // Step 6: Calculate Score
    await updateProgress(90, 'calculate_score', [
      'read_cv',
      'match_skills',
      'check_experience',
      'verify_education',
      'analyze_competencies',
    ]);

    const thresholdEligible = typeof job.eligibilityThreshold === 'number' ? job.eligibilityThreshold : 70;
    const thresholdPartial = typeof job.partialMatchMin === 'number' ? job.partialMatchMin : 50;

    let level: MatchLevel = 'not_eligible';
    if (aiResult.score >= thresholdEligible) {
      level = 'eligible';
    } else if (aiResult.score >= thresholdPartial) {
      level = 'partial';
    }

    const breakdownKeys: BreakdownKey[] = [
      'education',
      'experience',
      'technical_skills',
      'creative_thinking',
      'communication',
      'portfolio',
      'location',
    ];

    const breakdownItems: IBreakdownItem[] = breakdownKeys.map((key) => ({
      key,
      label: BREAKDOWN_CONFIG[key].label,
      sublabel: BREAKDOWN_CONFIG[key].sublabel,
      score: aiResult.breakdown[key] ?? BREAKDOWN_CONFIG[key].defaultScore,
    }));

    const result: IScreeningResult = {
      score: aiResult.score,
      level,
      thresholds: {
        eligible: thresholdEligible,
        partial: thresholdPartial,
      },
      breakdown: breakdownItems,
      strengths: aiResult.strengths,
      gaps: aiResult.gaps,
      suggestions: aiResult.suggestions,
      profile: aiResult.candidateProfile,
    };

    const finalSteps: StepKey[] = [
      'read_cv',
      'match_skills',
      'check_experience',
      'verify_education',
      'analyze_competencies',
      'calculate_score',
    ];
    const stepLabels: Record<StepKey, string> = {
      read_cv: 'Reading CV document & extracting details',
      match_skills: 'Matching core skills & requirements',
      check_experience: 'Evaluating experience & projects',
      verify_education: 'Verifying educational background',
      analyze_competencies: 'Analyzing domain competencies',
      calculate_score: 'Calculating overall eligibility score',
    };

    await ScreeningModel.findOneAndUpdate(
      { screeningId },
      {
        $set: {
          status: 'done',
          progress: 100,
          result,
          steps: finalSteps.map((key) => ({
            key,
            label: stepLabels[key],
            state: 'done',
          })),
        },
      }
    );
  } catch (err: any) {
    console.error('[AI CV] Screening failed:', err);
    await ScreeningModel.findOneAndUpdate(
      { screeningId },
      {
        $set: {
          status: 'failed',
          progress: 100,
          error: err.message || 'We could not analyse your CV right now. Please try again.',
        },
      }
    );
  }
}
