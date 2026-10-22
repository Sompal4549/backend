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
    .replace(/\b(cv|resume|doc|docx|pdf|new|final|updated|latest|copy|my|version|v\d+|\d+)\b/gi, '')
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

  // Raw buffer fallback only for legacy .doc (mammoth can't read it and it stores plain text).
  // PDF/DOCX are compressed binaries — their raw bytes are noise, and sending that noise to the AI
  // made it echo the example JSON from the prompt as if it were a real evaluation.
  if (!extractedText.trim() && lowerName.endsWith('.doc')) {
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

async function callOpenAiForCvEvaluation(prompt: string): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an AI Candidate Evaluator for ENSIS. You must respond with valid JSON strictly matching the requested schema without any markdown formatting.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[AI CV] OpenAI (${model}) HTTP ${res.status}:`, errText);
      return null;
    }

    const data: any = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (content) {
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn('[AI CV] OpenAI request failed:', (err as Error).message);
  }
  return null;
}

async function callGeminiForCvEvaluation(prompt: string): Promise<any> {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GEMINI_AI_API_KEY)?.trim();
  if (!apiKey) return null;

  const configuredModel = process.env.GEMINI_MODEL?.trim();
  const candidateModels = [
    ...(configuredModel ? [configuredModel] : []),
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-1.5-flash',
  ];

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
            return JSON.parse(jsonMatch[0]);
          }
        }
      } else {
        const errText = await res.text();
        console.warn(`[AI CV] Gemini (${model}) HTTP ${res.status}:`, errText);
      }
    } catch (err) {
      console.warn(`[AI CV] Gemini model ${model} error:`, (err as Error).message);
    }
  }
  return null;
}

export async function evaluateCvWithAI(
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

  const configuredProvider = (process.env.CV_AI_PROVIDER || process.env.AI_PROVIDER || 'auto').toLowerCase().trim();

  let parsed: any = null;
  let activeProviderName = '';

  if (configuredProvider === 'openai') {
    parsed = await callOpenAiForCvEvaluation(prompt);
    if (parsed) {
      activeProviderName = `OpenAI (${process.env.OPENAI_MODEL || 'gpt-4o-mini'})`;
    } else {
      console.warn('[AI CV] OpenAI evaluation failed or returned empty; attempting fallback to Gemini...');
      parsed = await callGeminiForCvEvaluation(prompt);
      if (parsed) activeProviderName = `Gemini (fallback)`;
    }
  } else if (configuredProvider === 'gemini') {
    parsed = await callGeminiForCvEvaluation(prompt);
    if (parsed) {
      activeProviderName = `Gemini (${process.env.GEMINI_MODEL || 'gemini-2.5-flash'})`;
    } else {
      console.warn('[AI CV] Gemini evaluation failed or returned empty; attempting fallback to OpenAI...');
      parsed = await callOpenAiForCvEvaluation(prompt);
      if (parsed) activeProviderName = `OpenAI (fallback)`;
    }
  } else {
    // 'auto' mode: prefer OpenAI if key is present, otherwise Gemini
    if (process.env.OPENAI_API_KEY) {
      parsed = await callOpenAiForCvEvaluation(prompt);
      if (parsed) activeProviderName = `OpenAI (${process.env.OPENAI_MODEL || 'gpt-4o-mini'})`;
    }
    if (!parsed && (process.env.GEMINI_API_KEY || process.env.GEMINI_AI_API_KEY)) {
      parsed = await callGeminiForCvEvaluation(prompt);
      if (parsed) activeProviderName = `Gemini (${process.env.GEMINI_MODEL || 'gemini-2.5-flash'})`;
    }
  }

  if (activeProviderName) {
    console.log(`[AI CV] Evaluated CV using AI provider: ${activeProviderName}`);
  }

  if (!parsed) {
    const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);
    const hasGemini = Boolean(process.env.GEMINI_API_KEY || process.env.GEMINI_AI_API_KEY);
    if (!hasOpenAi && !hasGemini) {
      throw new Error('Neither OPENAI_API_KEY nor GEMINI_API_KEY is configured in backend/.env.');
    }
    throw new Error(`AI screening evaluation failed with provider "${configuredProvider}". Please check API key status, network, and quota.`);
  }

  // A reply identical to the example JSON above means the model had nothing real to evaluate
  const b = parsed.breakdown || {};
  const echoedTemplate =
    Number(parsed.score) === 78 &&
    [b.education, b.experience, b.technical_skills, b.creative_thinking, b.communication, b.portfolio, b.location]
      .map(Number)
      .join(',') === '80,75,82,70,85,70,90';
  if (echoedTemplate) {
    throw new Error(
      "We couldn't evaluate your CV reliably. Please make sure it is a text-based PDF or Word (DOCX) file and try again."
    );
  }

  // Sanitize and normalize profile. The model sometimes echoes the example values from the
  // JSON template above when a field is missing from the CV — treat those as "not found"
  // so the candidate fills them in on the review step instead of submitting placeholders.
  const PLACEHOLDER_VALUES = new Set([
    'candidate full name',
    'candidate@example.com',
    '+91 9876543210',
    'yyyy-mm-dd',
    'city, state',
    'https://linkedin.com/in/profile',
    'linkedin.com/in/profile',
  ]);
  const real = (value: unknown): string | undefined => {
    const v = typeof value === 'string' ? value.trim() : '';
    if (!v || PLACEHOLDER_VALUES.has(v.toLowerCase())) return undefined;
    return v;
  };
  const realEmail = (value: unknown) => {
    const v = real(value);
    return v && !/@example\.(com|org)$/i.test(v) ? v : undefined;
  };
  const realPhone = (value: unknown) => {
    const v = real(value);
    return v && v.replace(/\D/g, '').slice(-10) !== '9876543210' ? v : undefined;
  };

  const rawName = real(parsed.fullName) || heuristics.fullName;
  const { fullName } = formatNameWithSpaces(rawName);

  const candidateProfile: ICandidateProfile = {
    fullName,
    email: realEmail(parsed.email) || heuristics.email || '',
    phone: realPhone(parsed.phone) || heuristics.phone || '',
    dateOfBirth: real(parsed.dateOfBirth),
    gender: ['Male', 'Female', 'Other'].includes(parsed.gender) ? parsed.gender : undefined,
    currentLocation: real(parsed.currentLocation),
    permanentAddress: real(parsed.permanentAddress),
    linkedin: real(parsed.linkedin) || heuristics.linkedin || undefined,
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

export const evaluateCvWithGemini = evaluateCvWithAI;

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

    // Scanned/image-only CVs have no extractable text; stop here instead of letting the AI guess
    const readableWords = (cvText.match(/[A-Za-z]{3,}/g) || []).length;
    if (readableWords < 40) {
      throw new Error(
        "We couldn't read the text in your CV — it may be a scanned image. Please upload a text-based PDF or a Word (DOCX) file."
      );
    }

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

/**
 * Generates structured Job Description (The Opportunity, Key Responsibilities,
 * Who Can Apply, Skills, KRAs, KPIs) using OpenAI / Gemini with smart domain fallback.
 */
export async function generateJobDescriptionWithAI(params: {
  title: string;
  department?: string;
  location?: string;
  experienceMin?: number;
  experienceMax?: number;
  educationRequirements?: string;
  employmentType?: string;
  workplaceType?: string;
  designation?: string;
  company?: string;
}): Promise<any> {
  const {
    title,
    department = 'General',
    location = 'Delhi NCR',
    experienceMin = 2,
    experienceMax = 5,
    educationRequirements = 'Graduate',
    employmentType = 'Full Time',
    workplaceType = 'On-site',
  } = params;

  const prompt = `You are a Senior Talent Acquisition & Organizational Design Leader for ENSIS Wellness (luxury wellness spaces, treatment furniture, and Ayurvedic equipment).
Generate a structured, professional job description for this role:
- Role Title: ${title}
- Department: ${department}
- Location: ${location}
- Experience: ${experienceMin} to ${experienceMax} years
- Education Requirements: ${educationRequirements}
- Employment Type: ${employmentType} (${workplaceType})

CRITICAL RULES:
- "opportunity": concise high-impact summary under 25 words (maximum 25 words).
- "keyResponsibilities": array of 4 to 6 strong bullet points starting with action verbs.
- "whoCanApply": array of 4 to 6 qualification criteria bullets.
- "requiredSkills": array of 5 to 7 key skills.
- "preferredSkills": array of 3 to 5 bonus skills.
- "targetIndustrySegments": array of 3 to 5 relevant industry sectors.
- "specificExperience": 1 clear sentence describing required niche experience.
- "reportingTo": title of reporting manager (e.g. "Head of Technology", "Director of Design", "Operations Head").
- "kras": array of 3 objects with { "label": string, "result": string }.
- "kpis": array of 3 objects with { "label": string, "measurement": string }.
- "referenceIndustries": array of 2 to 4 industries.
- "screeningQuestions": array of 3 to 5 screening questions.

Respond with ONLY valid JSON:
{
  "opportunity": "string (under 25 words)",
  "keyResponsibilities": ["string"],
  "whoCanApply": ["string"],
  "requiredSkills": ["string"],
  "preferredSkills": ["string"],
  "targetIndustrySegments": ["string"],
  "specificExperience": "string",
  "reportingTo": "string",
  "kras": [{ "label": "string", "result": "string" }],
  "kpis": [{ "label": "string", "measurement": "string" }],
  "referenceIndustries": ["string"],
  "screeningQuestions": ["string"]
}`;

  let parsed: any = null;
  try {
    if (process.env.OPENAI_API_KEY) {
      parsed = await callOpenAiForCvEvaluation(prompt);
    }
    if (!parsed && (process.env.GEMINI_API_KEY || process.env.GEMINI_AI_API_KEY)) {
      parsed = await callGeminiForCvEvaluation(prompt);
    }
  } catch (err) {
    console.warn('[AI Job Gen] LLM call failed, switching to intelligent fallback:', (err as Error).message);
  }

  if (parsed && parsed.opportunity && Array.isArray(parsed.keyResponsibilities) && parsed.keyResponsibilities.length > 0) {
    const words = parsed.opportunity.trim().split(/\s+/);
    if (words.length > 25) {
      parsed.opportunity = words.slice(0, 24).join(' ') + '.';
    }
    return parsed;
  }

  // Intelligent domain fallback
  const tLower = title.toLowerCase();
  const isTech = tLower.includes('software') || tLower.includes('developer') || tLower.includes('engineer') || tLower.includes('frontend') || tLower.includes('full stack') || tLower.includes('tech') || tLower.includes('react');
  const isDesign = tLower.includes('design') || tLower.includes('interior') || tLower.includes('product') || tLower.includes('spatial') || tLower.includes('architect');
  const isSales = tLower.includes('sale') || tLower.includes('business') || tLower.includes('partnership') || tLower.includes('client') || tLower.includes('marketing');

  if (isTech) {
    return {
      opportunity: "Engineer luxury wellness digital experiences, responsive applications, and AI screening workflows for global users.",
      keyResponsibilities: [
        "Architect and develop high-performance web applications using React, Next.js, and TypeScript.",
        "Collaborate with UI/UX designers to translate Figma luxury mockups into pixel-perfect code.",
        "Integrate secure REST APIs, authentication state, and AI screening services.",
        "Optimize Core Web Vitals, SEO performance, and responsive layout across all viewports.",
        "Maintain high test coverage, clean code quality, and reliable CI/CD deployment pipelines."
      ],
      whoCanApply: [
        `${experienceMin}+ years of production experience in React, Next.js, and modern TypeScript.`,
        `Degree in ${educationRequirements} or equivalent proven engineering portfolio.`,
        "Strong foundation in asynchronous state management and component architecture.",
        "Hands-on experience with RESTful APIs, database integrations, and performance optimization.",
        "Excellent communication skills and eagerness to build world-class luxury wellness software."
      ],
      requiredSkills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "REST APIs", "Git"],
      preferredSkills: ["Node.js", "AI APIs (OpenAI/Gemini)", "SEO Optimization", "CI/CD"],
      targetIndustrySegments: ["Ecommerce & Luxury Retail", "HealthTech & Wellness", "SaaS & Cloud Platforms"],
      specificExperience: `Demonstrated track record of delivering responsive, production-ready web apps with Next.js and TypeScript.`,
      reportingTo: "Head of Engineering",
      kras: [
        { label: "Frontend Architecture", result: "Scalable, high-performance web applications" },
        { label: "Code Quality & Delivery", result: "99.9% uptime with zero critical regressions" },
        { label: "User Experience", result: "Sub-second page loads and seamless mobile UX" }
      ],
      kpis: [
        { label: "Sprint Delivery Rate", measurement: ">= 90% planned sprint points delivered" },
        { label: "Lighthouse Performance Score", measurement: ">= 90 across mobile and desktop" },
        { label: "Bug Escape Rate", measurement: "< 2 critical bugs per release" }
      ],
      referenceIndustries: ["Technology", "Ecommerce", "Digital Agencies"],
      screeningQuestions: [
        "Describe your experience with Next.js App Router and server-side rendering.",
        "How do you optimize Core Web Vitals and frontend bundle performance?",
        "Have you integrated AI APIs or real-time streaming in production?"
      ]
    };
  }

  if (isDesign) {
    return {
      opportunity: "Design luxury wellness furniture, ergonomic treatment solutions, and serene spa spaces combining aesthetics and comfort.",
      keyResponsibilities: [
        "Create innovative wellness furniture concepts, 3D visualizations, and production drawings.",
        "Collaborate with manufacturing and sourcing teams to ensure structural integrity and craftsmanship.",
        "Research ergonomic principles and sustainable materials for holistic wellness environments.",
        "Present design concepts and spatial setups to luxury hospitality clients and architects.",
        "Oversee prototyping, sample sign-offs, and quality assurance benchmarks."
      ],
      whoCanApply: [
        `${experienceMin}+ years of experience in furniture, industrial, or spatial luxury design.`,
        `Degree in ${educationRequirements} (Product, Industrial, or Interior Design).`,
        "Proficiency in 3D CAD modeling tools (AutoCAD, SolidWorks, Rhino, or SketchUp).",
        "Strong visual portfolio showcasing executed furniture or luxury wellness projects.",
        "Passion for ergonomic wellness design and holistic aesthetics."
      ],
      requiredSkills: ["Product Design", "3D CAD Modeling", "AutoCAD", "SketchUp / Rhino", "Material Exploration"],
      preferredSkills: ["Rendering & VR", "Joinery & Woodwork", "Luxury Hospitality Design"],
      targetIndustrySegments: ["Luxury Furniture & Decor", "Spa & Wellness Resorts", "Ayurvedic Healthcare"],
      specificExperience: `Proven experience designing ergonomic furniture or turnkey wellness spa environments.`,
      reportingTo: "Director of Design & Innovation",
      kras: [
        { label: "Design Excellence", result: "Award-winning wellness furniture and spaces" },
        { label: "Prototyping Feasibility", result: "100% manufacturable technical blueprints" },
        { label: "Client Satisfaction", result: "High adoption by luxury spa and resort clients" }
      ],
      kpis: [
        { label: "New Concept Development", measurement: "4 new product lines per fiscal year" },
        { label: "First-pass Prototyping Yield", measurement: ">= 85% approval on first sample" },
        { label: "Client Project Approval", measurement: ">= 90% client approval on 3D proposals" }
      ],
      referenceIndustries: ["Luxury Furniture", "Architecture & Interiors", "Hospitality"],
      screeningQuestions: [
        "Share a highlight from your portfolio involving furniture or spatial design.",
        "Which 3D modeling and rendering software are you most proficient in?",
        "How do you balance aesthetic luxury with ergonomic durability in physical products?"
      ]
    };
  }

  if (isSales) {
    return {
      opportunity: "Drive client relationships and revenue growth for luxury wellness and institutional spa projects.",
      keyResponsibilities: [
        "Identify and cultivate relationships with luxury hotels, wellness resorts, and architectural firms.",
        "Present ENSIS wellness products and customized spatial solutions to decision-makers.",
        "Prepare consultative proposals, negotiate commercial contracts, and close enterprise deals.",
        "Collaborate with design and operations teams to guarantee seamless project fulfillment.",
        "Track sales pipeline metrics and deliver predictable revenue against quarterly targets."
      ],
      whoCanApply: [
        `${experienceMin}+ years of B2B sales or business development experience in luxury/hospitality/wellness.`,
        `Degree in ${educationRequirements} (Business, Marketing, or related field).`,
        "Proven track record of exceeding revenue quotas and managing high-ticket accounts.",
        "Articulate communicator with strong executive presence and consultative selling skills.",
        "Willingness to travel for client meetings and major trade exhibitions."
      ],
      requiredSkills: ["B2B Sales", "Client Relationship Management", "Contract Negotiation", "Lead Generation", "CRM"],
      preferredSkills: ["Luxury Hospitality Network", "Spa Industry Knowledge", "Strategic Partnerships"],
      targetIndustrySegments: ["Luxury Hospitality & Resorts", "Wellness & Ayurvedic Centers", "Interior Architecture"],
      specificExperience: `Demonstrated success in high-value B2B consultative selling or luxury wellness partnerships.`,
      reportingTo: "VP of Business Development",
      kras: [
        { label: "Revenue Target Achievement", result: "Consistent achievement of quarterly sales quotas" },
        { label: "Account Expansion", result: "Long-term relationships with key hospitality chains" },
        { label: "Pipeline Quality", result: "High-conversion pipeline with active enterprise leads" }
      ],
      kpis: [
        { label: "Quarterly Revenue Quota", measurement: ">= 100% target met" },
        { label: "Proposal Conversion Rate", measurement: ">= 30% proposals won" },
        { label: "Client Retention / Repeat Rate", measurement: ">= 80% repeat business" }
      ],
      referenceIndustries: ["Hospitality & Resorts", "Luxury Retail", "Architectural Consulting"],
      screeningQuestions: [
        "What is the largest deal or contract you personally closed in a B2B environment?",
        "How do you approach outreach and relationship-building with high-net-worth clients or luxury brands?",
        "Which CRM systems and sales methodologies are you experienced with?"
      ]
    };
  }

  return {
    opportunity: `Drive impact and growth at ENSIS as ${title}, creating inspiring wellness solutions for global clients.`,
    keyResponsibilities: [
      `Lead and execute core strategic initiatives for the ${department} department.`,
      "Collaborate across multidisciplinary teams to ensure operational and delivery excellence.",
      "Engage with clients and stakeholders to deliver high-touch luxury wellness solutions.",
      "Maintain standards of premium craftsmanship, compliance, and brand integrity.",
      "Monitor KPIs, identify process improvements, and contribute to team growth."
    ],
    whoCanApply: [
      `${experienceMin}+ years of relevant experience in ${department} or related domain.`,
      `Qualification in ${educationRequirements} or equivalent professional track record.`,
      "Proven problem-solving, organizational, and interpersonal capabilities.",
      "Ability to thrive in an innovation-led, high-quality wellness brand environment.",
      "Commitment to excellence and customer-centric delivery."
    ],
    requiredSkills: ["Strategic Planning", "Project Management", "Team Leadership", "Communication", "Problem Solving"],
    preferredSkills: ["Cross-functional Coordination", "Data-driven Decision Making", "Client Advisory"],
    targetIndustrySegments: ["Luxury Wellness & Healthcare", "Hospitality & Resorts", "Premium Lifestyle Products"],
    specificExperience: `Proven experience matching core requirements of the ${title} role.`,
    reportingTo: "Department Head",
    kras: [
      { label: "Operational Excellence", result: "High-quality delivery within timelines" },
      { label: "Team & Process Leadership", result: "Scalable SOPs and team mentoring" }
    ],
    kpis: [
      { label: "Quarterly Objective Completion", measurement: ">= 90% of targets achieved" },
      { label: "Stakeholder Satisfaction", measurement: ">= 95% positive feedback" }
    ],
    referenceIndustries: ["Wellness & Health", "Hospitality", "Corporate Operations"],
    screeningQuestions: [
      `What makes you uniquely suited for the ${title} position at ENSIS?`,
      "Describe a challenging project you successfully led from concept to completion."
    ]
  };
}
