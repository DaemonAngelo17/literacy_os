import { useState, useRef, useEffect, useCallback } from 'react';
import html2pdf from 'html2pdf.js';
import { 
  Grid, Calendar, Lock, Moon, Sun, Unlock, Settings, Eye, EyeOff,
  Map, BookA, Download, PenTool, CheckCircle,
  Check, X, UploadCloud, ScrollText, TableProperties, Plus, Trash2,
  Languages, Mic2, AlertCircle, Play, Pause, RotateCcw, Key, 
  BarChart, Target, FileText, LayoutList, BookOpen, MessageCircle, TextSelect, Trash, Star
} from 'lucide-react';
import { useGeminiQuery } from './hooks/useGeminiQuery';
import { useLocalStorageState } from './hooks/useLocalStorageState';
import { encryptData, decryptData } from './utils/crypto';
import { useAILogger } from './contexts/AILoggerContext';
import PrintLayout from './components/PrintLayout';
import ToolErrorBoundary from './components/ToolErrorBoundary';
import { ThesisSchema, CrossLingualSchema, PeerSchema, QuizSchema, SummarySchema } from './utils/schemas';
import { ELA_TAXONOMY } from './utils/elaTaxonomy';
import { useDropzone } from 'react-dropzone';
import './App.css';

const GRADE_LEVELS = ['Elementary (Grades K-2)', 'Upper Elementary (Grades 3-5)', 'Middle School (Grades 6-8)', 'High School (Grades 9-12)', 'Higher Education', 'Adult Learner'];
const PROFICIENCIES = ['Beginner (A1-A2)', 'Intermediate (B1-B2)', 'Advanced (C1-C2)', 'Native / Fluent'];
const DURATIONS = ['25 Minutes', '50 Minutes (1 Hour)', '100 Minutes (2 Hours)'];

const DAILY_FLOW_STEPS = [
  { num: 1, title: 'Caterpillar', desc: '• Distribute and review the vocabulary homework (1-42 words).\n• Administer the short vocab quiz to assess retention and meaning accuracy.' },
  { num: 2, title: 'Review', desc: '• Always review the previous lesson.\n• Check for understanding on past concepts before moving forward.' },
  { num: 3, title: 'Focus Skill', desc: '• Introduce the target reading/writing skills selected for today.\n• Explain the definitions and importance of these skills.' },
  { num: 4, title: 'Background Knowledge', desc: '• Contextualize the material.\n• Provide historical context, thematic background, or author information to prime the students.' },
  { num: 5, title: 'Annotate', desc: '• Instruct students to highlight and label the text based on the focus skills.\n• Look for main ideas, evidence, and unfamiliar words.' },
  { num: 6, title: 'Orienteering', desc: '• Navigate the text structure.\n• Guide students through the layout, headings, and overall narrative arc of the material.' },
  { num: 7, title: 'Discuss', desc: '• Explain and expound concepts.\n• Facilitate a classroom discussion addressing student questions and deeper themes.' },
  { num: 8, title: 'Recall/Review', desc: '• Pause to check comprehension.\n• Have students summarize what has been read and discussed so far.' },
  { num: 9, title: 'Exercises/Seatwork', desc: '• Module application.\n• Students work independently or in groups to apply the focus skills to provided exercises.' },
  { num: 10, title: 'Recap', desc: '• Storytelling or reporting phase.\n• Students may present their findings or record a short video summarizing their learning.' },
  { num: 11, title: 'Assign Homework', desc: '• Assign and thoroughly explain the homework.\n• Ensure students understand the rubric and expectations.' },
  { num: 12, title: 'Upload Report', desc: '• Final documentation.\n• Ensure all digital assignments, reports, or videos are uploaded to the learning portal.' }
];

const ALL_AI_TOOLS = [
  { id: 'thesis', title: 'Thesis Generator', desc: 'Tiered thesis statements & arguments.', promptPrefix: () => 'Output JSON strictly formatted as: { "theses": [ { "level": "baseline", "statement": "...", "args": ["...","..."] }, { "level": "intermediate", "statement": "...", "args": ["...","..."] }, { "level": "advanced", "statement": "...", "args": ["...","..."] } ] }. Based on this text:', type: 'THESIS', color: '#8b5cf6' },
  { id: 'decoder', title: 'Cross-Lingual Decoder', desc: 'Literal, synonym, & Korean equivalents.', promptPrefix: (prof) => `Output JSON strictly formatted as: { "items": [ { "original": "...", "literal": "...", "synonym": "...", "korean": "..." } ] }. Find 3-5 complex idioms or difficult words matching a ${prof} student in this text:`, type: 'CROSS_LINGUAL', color: '#8b5cf6' },
  { id: 'peer', title: 'Peer-Review Sandbox', desc: 'Compare draft against rubric & error history.', promptPrefix: () => 'Output JSON strictly formatted as: { "glows": ["...","..."], "grows": ["...","..."] }. Evaluate this draft paragraph specifically considering the student\'s recent error history:', type: 'PEER', color: '#8b5cf6' },
  { id: 'quiz', title: 'Dynamic Quiz', desc: 'MCQ, Cloze, and Open-ended questions.', promptPrefix: (prof) => `Output JSON strictly formatted as: { "quiz": { "mcq": [{"question": "...", "answer": "..."}], "cloze": [{"question": "...", "answer": "..."}], "open": [{"question": "..."}] } }. Generate 2 MCQ, 2 Cloze, and 1 Open-ended question for a ${prof} student based on this text:`, type: 'QUIZ', color: '#8b5cf6' },
  { id: 'summary', title: 'Summary Synthesizer', desc: 'Tiered scaffolding for summarizing.', promptPrefix: () => 'Output JSON strictly formatted as: { "tiers": { "beginner": "Cloze format summary...", "intermediate": "Sentence starter framework...", "advanced": "Inquiry outline format..." } }. Summarize this text:', type: 'SUMMARY', color: '#3b82f6' },
  { id: 'error', title: 'Error Logger', desc: 'Track errors. Feeds into AI memory!', promptPrefix: () => 'You are an error correction logger. Review these student errors, categorize them, and output concise teacher feedback.', type: 'GENERIC', color: 'var(--accent-red)' }
];

const CURRICULUM_SEQUENCES = [
  { id: 'Seq 1', title: 'Exploration & Geography', question: 'How does physical geography and exploration shape human societies?', keywords: 'Maps, Navigators, Topography, Cultural Exchange' },
  { id: 'Seq 2', title: 'Power, Law & Government', question: 'What is the purpose of law, and how is power distributed?', keywords: 'Democracy, Monarchy, Constitution, Rights' },
  { id: 'Seq 3', title: 'Conflict & Resolution', question: 'What are the roots of conflict, and how are lasting peace treaties formed?', keywords: 'Wars, Treaties, Diplomacy, Rebuilding' },
  { id: 'Seq 4', title: 'Industrialization & Economy', question: 'How do technological advancements shift economic models?', keywords: 'Factories, Trade, Supply/Demand, Innovation' },
  { id: 'Seq 5', title: 'Civil Rights & Social Movements', question: 'How do marginalized groups advocate for equality and justice?', keywords: 'Protest, Legislation, Equality, Activism' },
  { id: 'Seq 6', title: 'Science, Reason & Philosophy', question: 'How do new ideas challenge established beliefs?', keywords: 'Enlightenment, Scientific Method, Philosophy, Paradigm Shift' },
  { id: 'Seq 7', title: 'Global Interdependence', question: 'How do events in one nation affect the global community?', keywords: 'Globalization, Trade, Climate, Pandemics' },
  { id: 'Seq 8', title: 'Ecosystems & Earth Systems', question: 'How do living and non-living elements interact to sustain life?', keywords: 'Biomes, Climate Change, Conservation, Interdependence' }
];

const formatTime = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [isStudentView, setIsStudentView] = useState(false);

  // Admin / Student State
  const [studentId, setStudentId] = useState('student_001');
  const [studentName, setStudentName] = useState('John Doe');

  const sessionKey = `literacy_os_${studentId}_${new Date().toISOString().split('T')[0]}`;

  // Persisted Session States
  const [grade, setGrade] = useLocalStorageState(`${sessionKey}_grade`, GRADE_LEVELS[2]);
  const [proficiency, setProficiency] = useLocalStorageState(`${sessionKey}_prof`, PROFICIENCIES[1]);
  const [duration, setDuration] = useLocalStorageState(`${sessionKey}_dur`, DURATIONS[1]);
  const [selectedSkills, setSelectedSkills] = useLocalStorageState(`${sessionKey}_skills_hierarchical`, []);
  const [material, setMaterial] = useLocalStorageState(`${sessionKey}_mat`, '');
  const [isGenerated, setIsGenerated] = useLocalStorageState(`${sessionKey}_gen`, false);
  const [generatedSteps, setGeneratedSteps] = useLocalStorageState(`${sessionKey}_gen_steps`, []);
  const [stepStatus, setStepStatus] = useLocalStorageState(`${sessionKey}_steps`, {});
  const [scores, setScores] = useLocalStorageState(`${sessionKey}_scores_v2`, { assignment: { acquired: '', total: '' }, vocabAssignment: { acquired: '', total: '' }, vocabQuiz: { acquired: '', total: '' } });
  const [activities, setActivities] = useLocalStorageState(`${sessionKey}_acts_v2`, [{ id: Date.now(), title: '', acquired: '', total: '' }]);
  
  const [vocabList, setVocabList] = useLocalStorageState(`${sessionKey}_vocab_list`, []);
  const [vocabVisibility, setVocabVisibility] = useLocalStorageState(`${sessionKey}_vocab_vis`, { showPos: true, showDefinition: true, showKorean: true, showAssociation: true });
  const [vocabWordCount, setVocabWordCount] = useLocalStorageState(`${sessionKey}_vocab_count`, 10);
  const [seedWords, setSeedWords] = useLocalStorageState(`${sessionKey}_seed_words`, '');
  const [sessionNotes, setSessionNotes] = useLocalStorageState(`${sessionKey}_notes`, '');
  const [learningMatrix, setLearningMatrix] = useLocalStorageState(`${sessionKey}_matrix`, null);
  const [prevDailyReport, setPrevDailyReport] = useLocalStorageState(`${sessionKey}_prev_report`, '');
  const [studentReport, setStudentReport] = useLocalStorageState(`${sessionKey}_student_report`, '');
  const [previousLessonContext, setPreviousLessonContext] = useLocalStorageState(`${sessionKey}_prev_lesson`, '');
  const [studentProfileContext, setStudentProfileContext] = useLocalStorageState(`${sessionKey}_student_profile`, '');
  const [isPrevLessonLoaded, setIsPrevLessonLoaded] = useState(false);
  const [isStudentProfileLoaded, setIsStudentProfileLoaded] = useState(false);
  
  const [isLoadingVocab, setIsLoadingVocab] = useState(false);
  const [isLoadingMatrix, setIsLoadingMatrix] = useState(false);
  const [isLoadingCrossMatrix, setIsLoadingCrossMatrix] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [showVocabSettings, setShowVocabSettings] = useState(false);
  const [showVocabModal, setShowVocabModal] = useState(false);
  const [activeMatrixTab, setActiveMatrixTab] = useState('type1');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [crossMatrix, setCrossMatrix] = useLocalStorageState(`${sessionKey}_crossMatrix`, null);
  const [crossMatrixOverrideInput, setCrossMatrixOverrideInput] = useState('');
  const [crossMatrixOverrideError, setCrossMatrixOverrideError] = useState('');
  const [profModifier, setProfModifier] = useState(0);
  const [gradeModifier, setGradeModifier] = useState(0);
  const [selectedSequenceId, setSelectedSequenceId] = useState('auto');
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [matrixTypeToGenerate, setMatrixTypeToGenerate] = useState('deep');
  
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [classDate, setClassDate] = useState(new Date().toISOString().split('T')[0]);
  const [classStartTime, setClassStartTime] = useState('');
  const [classEndTime, setClassEndTime] = useState('');
  const [editableRoadmapSteps, setEditableRoadmapSteps] = useState([]);
  const [aiFinalFeedback, setAiFinalFeedback] = useState('');
  
  // Encrypted API Key
  const [encryptedApiKey, setEncryptedApiKey] = useLocalStorageState('literacy_os_encrypted_api_key', '');
  const [tempApiKeyInput, setTempApiKeyInput] = useState('');

  const [assessmentDate, setAssessmentDate] = useState('');
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Tool State
  const [activeTool, setActiveTool] = useState(null); 
  const [toolInput, setToolInput] = useState('');
  const [toolOutput, setToolOutput] = useState('');
  const [toolType, setToolType] = useState('GENERIC');
  const [summaryTier, setSummaryTier] = useState('beginner');

  const [favoriteTools, setFavoriteTools] = useLocalStorageState('literacy_os_fav_tools', ['thesis', 'summary', 'error']);
  const [showToolbox, setShowToolbox] = useState(false);
  const [expandedTaxonomy, setExpandedTaxonomy] = useState(null);

  // Fail-Safe States
  const [failSafeModal, setFailSafeModal] = useState({ isOpen: false, type: '', promptContent: '' });
  const [pdfFailed, setPdfFailed] = useState(false);
  const [showOverrideInput, setShowOverrideInput] = useState(false);
  const [overrideJson, setOverrideJson] = useState('');
  const [overrideError, setOverrideError] = useState('');
  const [showVocabOverride, setShowVocabOverride] = useState(false);
  const [vocabOverrideJson, setVocabOverrideJson] = useState('');
  const [vocabOverrideError, setVocabOverrideError] = useState('');
  const [matrixOverrideJson, setMatrixOverrideJson] = useState('');
  const [matrixOverrideError, setMatrixOverrideError] = useState('');

  const printRef = useRef();
  const { executeQuery, isLoading: isToolLoading, error: toolError } = useGeminiQuery();
  const { errorMemory } = useAILogger();

  useEffect(() => {
    setTempApiKeyInput(decryptData(encryptedApiKey));
  }, [encryptedApiKey]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); 
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    } else if (!isTimerRunning && timerSeconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const handleApiKeyChange = (val) => {
    setTempApiKeyInput(val);
    setEncryptedApiKey(encryptData(val));
  };

  const clearSession = () => {
    setMaterial('');
    setIsGenerated(false);
    setGeneratedSteps([]);
    setStepStatus({});
    setScores({ assignment: { acquired: '', total: '' }, vocabAssignment: { acquired: '', total: '' }, vocabQuiz: { acquired: '', total: '' } });
    setActivities([{ id: Date.now(), title: '', acquired: '', total: '' }]);
    setTimerSeconds(0);
    setIsTimerRunning(false);
    setShowClearConfirm(false);
    setPdfFailed(false);
    setShowOverrideInput(false);
    setOverrideJson('');
    setOverrideError('');
    setVocabList([]);
    setShowVocabOverride(false);
    setVocabOverrideJson('');
    setVocabOverrideError('');
    setSessionNotes('');
    setLearningMatrix(null);
    setMatrixOverrideJson('');
    setMatrixOverrideError('');
    setPrevDailyReport('');
    setStudentReport('');
    setPreviousLessonContext('');
    setIsPrevLessonLoaded(false);
    setStudentProfileContext('');
    setIsStudentProfileLoaded(false);
  };

  const handleTextSelection = () => {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      setToolInput(selectedText);
    } else {
      setToolInput(material);
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = () => {
          setMaterial(prev => prev ? prev + '\n\n' + reader.result : reader.result);
        };
        reader.readAsText(file);
      } else {
        setMaterial(prev => prev ? prev + `\n\n[Attached File: ${file.name}]\n(Note: Text extraction from PDF/Images requires an external OCR/Parser not present in this standalone build. Please paste text directly.)` : `[Attached File: ${file.name}]\n(Note: Text extraction from PDF/Images requires an external OCR/Parser not present in this standalone build. Please paste text directly.)`);
      }
    }
  }, []);
  const { getRootProps, getInputProps, isDragActive, open: openDropzone } = useDropzone({ onDrop, noClick: true, noKeyboard: true });

  // History dropzones for center panel
  const onDropPrevLesson = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setIsPrevLessonLoaded(false);
    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviousLessonContext(reader.result);
        setIsPrevLessonLoaded(true);
      };
      reader.readAsText(file);
    } else {
      setPreviousLessonContext(`[Previous Lesson document: ${file.name} — paste its text content below for AI context]`);
      setIsPrevLessonLoaded(true);
    }
  }, [setPreviousLessonContext]);
  const { getRootProps: getPrevLessonRootProps, getInputProps: getPrevLessonInputProps, isDragActive: isPrevLessonDragActive, open: openPrevLessonDropzone } = useDropzone({ onDrop: onDropPrevLesson, noClick: true, noKeyboard: true, accept: { 'text/*': [], 'application/pdf': [], 'application/msword': [], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [] } });

  const onDropStudentProfile = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setIsStudentProfileLoaded(false);
    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = () => {
        setStudentProfileContext(reader.result);
        setIsStudentProfileLoaded(true);
      };
      reader.readAsText(file);
    } else {
      setStudentProfileContext(`[Student Profile document: ${file.name} — paste its text content below for AI context]`);
      setIsStudentProfileLoaded(true);
    }
  }, [setStudentProfileContext]);
  const { getRootProps: getStudentProfileRootProps, getInputProps: getStudentProfileInputProps, isDragActive: isStudentProfileDragActive, open: openStudentProfileDropzone } = useDropzone({ onDrop: onDropStudentProfile, noClick: true, noKeyboard: true, accept: { 'text/*': [], 'application/pdf': [], 'application/msword': [], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [] } });


  const handleGenerateVocab = async () => {
    const apiKey = decryptData(encryptedApiKey);
    if (!apiKey) { alert("Please configure AI API KEY in App Settings first."); return; }
    
    setIsLoadingVocab(true);
    setVocabOverrideError('');
    
    let prompt = '';
    const trimmedSeeds = seedWords.trim();
    if (trimmedSeeds) {
      prompt = `Output ONLY a raw JSON array. No markdown, no conversational text. MANDATORY INCLUSION: You MUST include and define the following specific words in your JSON array: [${trimmedSeeds}]. After defining these, extract additional high-value academic vocabulary from the SOURCE TEXT until your array contains exactly ${vocabWordCount} total words. Format: [{ "word": "example", "pos": "noun", "definition": "A representative form or pattern.", "koreanTranslation": "예시", "wordAssociation": "model, sample" }]. Text:`;
    } else {
      prompt = `Output ONLY a raw JSON array. No markdown, no conversational text. Extract exactly ${vocabWordCount} high-value academic vocabulary words from this text in this format: [{ "word": "example", "pos": "noun", "definition": "A representative form or pattern.", "koreanTranslation": "예시", "wordAssociation": "model, sample" }]. Text:`;
    }
    
    const result = await executeQuery(apiKey, prompt, material || 'No specific material', false, null, previousLessonContext, studentProfileContext);
    setIsLoadingVocab(false);

    if (result) {
      try {
        const cleaned = result.replace(/```json|```/gi, '').trim();
        const rawData = JSON.parse(cleaned);
        const data = Array.isArray(rawData) ? rawData : (rawData.vocab || rawData.items || []);
        if (data.length > 0) {
          setVocabList(data);
          return;
        }
      } catch (e) {
        console.error("Vocab parsing failed:", e);
      }
    }
    triggerToolFallback('Vocab Homework Maker', `Extract exactly ${vocabWordCount} high-value academic vocabulary words.`, 'Raw JSON array exactly like: [{ "word": "example", "pos": "noun", "definition": "...", "koreanTranslation": "...", "wordAssociation": "..." }]');
  };

  const handleOpenCalibrationModal = (type) => {
    setMatrixTypeToGenerate(type);
    setProfModifier(0);
    setGradeModifier(0);
    setSelectedSequenceId('auto');
    setShowCalibrationModal(true);
  };

  const executeGenerateDeepMatrix = async () => {
    const apiKey = decryptData(encryptedApiKey);
    if (!apiKey) { alert("Please configure AI API KEY in App Settings first."); return; }
    
    setIsLoadingMatrix(true);
    setMatrixOverrideError('');
    const prompt = `Act as an elite ELA Curriculum Designer and Cognition Specialist. 
STUDENT PROFILE: ${studentName}
GRADE BAND: ${grade}
CEFR PROFICIENCY: ${proficiency}
SOURCE MATERIAL: ${material || 'None'}
${prevDailyReport ? `PREVIOUS DAILY REPORT CONTEXT: ${prevDailyReport}` : ''}
${studentReport ? `STUDENT STRENGTHS & WEAKNESSES: ${studentReport}` : ''}
CALIBRATION OVERRIDE: The student's baseline grade is ${grade}, but you must adjust the COGNITIVE complexity of your questions by ${gradeModifier} levels (where -2 is heavily simplified and +2 is highly advanced). The baseline proficiency is ${proficiency}, but adjust the LINGUISTIC complexity of the output text by ${profModifier} levels.

STRICT OUTPUT FORMATTING RULE: Return ONLY a raw, valid JSON object matching the exact schema below. Do not include introductory conversations, concluding text, or markdown code-fences (such as \`\`\`json). The output must be immediately parseable by JSON.parse().

REQUIRED SCHEMATIC FORMAT:
{
  "type1": {
    "coreIssue": "Identify the foundational problem...",
    "authorEmotion": "Identify the author's primary and underlying super-emotion...",
    "prompts": ["Literal question 1...", "Literal question 2..."]
  },
  "type2": {
    "realWorldConnections": "Connect the core text issue to an active real-world societal or environmental issue...",
    "prompts": ["Analytical tracking prompt 1...", "Analytical tracking prompt 2..."]
  },
  "type3": {
    "scienceBasedApplication": "Synthesize structural textual metrics with objective, scientific or logic-driven inquiry...",
    "prompts": ["Synthetic evaluation task 1...", "Advanced writing bridge task 2..."]
  }
}`;

    const result = await executeQuery(apiKey, prompt, '', false, null, previousLessonContext, studentProfileContext);
    setIsLoadingMatrix(false);

    if (result) {
      try {
        const cleaned = result.replace(/```json|```/gi, '').trim();
        const data = JSON.parse(cleaned);
        if (data.type1 && data.type2 && data.type3) {
          setLearningMatrix(data);
          return;
        }
      } catch (e) {
        console.error("Matrix parsing failed:", e);
      }
    }
    
    const fallbackPrompt = `Act as an elite ELA Curriculum Designer and Cognition Specialist. My internal parsing engine failed, and I require a standardized Type 1, 2, 3 Deep Learning Matrix built precisely from the metrics below.
STUDENT PROFILE: ${studentName}
GRADE BAND: ${grade}
CEFR PROFICIENCY: ${proficiency}
SOURCE MATERIAL: ${material || 'None'}
${prevDailyReport ? `PREVIOUS DAILY REPORT CONTEXT: ${prevDailyReport}` : ''}
${studentReport ? `STUDENT STRENGTHS & WEAKNESSES: ${studentReport}` : ''}
DIFFICULTY MODIFIERS: Shift cognitive complexity by ${gradeModifier} levels from base grade ${grade}. Shift linguistic vocabulary by ${profModifier} levels from base ${proficiency}.

STRICT OUTPUT FORMATTING RULE: Return ONLY a raw, valid JSON object matching the exact schema below. Do not include introductory conversations, concluding text, or markdown code-fences (such as \`\`\`json). The output must be immediately parseable by JSON.parse().

REQUIRED SCHEMATIC FORMAT:
{
  "type1": {
    "coreIssue": "Identify the foundational problem...",
    "authorEmotion": "Identify the author's primary and underlying super-emotion...",
    "prompts": ["Literal question 1...", "Literal question 2..."]
  },
  "type2": {
    "realWorldConnections": "Connect the core text issue to an active real-world societal or environmental issue...",
    "prompts": ["Analytical tracking prompt 1...", "Analytical tracking prompt 2..."]
  },
  "type3": {
    "scienceBasedApplication": "Synthesize structural textual metrics with objective, scientific or logic-driven inquiry...",
    "prompts": ["Synthetic evaluation task 1...", "Advanced writing bridge task 2..."]
  }
}`;
    setFailSafeModal({ isOpen: true, type: 'MATRIX', promptContent: fallbackPrompt });
  };

  const executeGenerateCrossMatrix = async () => {
    const apiKey = decryptData(encryptedApiKey);
    if (!apiKey) { alert("Please configure AI API KEY in App Settings first."); return; }
    
    setIsLoadingCrossMatrix(true);
    setCrossMatrixOverrideError('');
    
    let seqContext = "Auto-detect the most relevant sequence from the source text.";
    if (selectedSequenceId !== 'auto') {
      const seq = CURRICULUM_SEQUENCES.find(s => s.id === selectedSequenceId);
      if (seq) {
        seqContext = `[${seq.title}: ${seq.question}]. Ensure activities utilize these conceptual keywords: [${seq.keywords}].`;
      }
    }

    const prompt = `Act as an elite Interdisciplinary Curriculum Designer. You are integrating ELA with Social Studies/Science. Using the SOURCE TEXT, generate a 3-part lesson matrix bridging the text to this sequence: ${seqContext}
STUDENT PROFILE: ${studentName}
GRADE BAND: ${grade}
CEFR PROFICIENCY: ${proficiency}
SOURCE MATERIAL: ${material || 'None'}
CALIBRATION OVERRIDE: The student's baseline grade is ${grade}, but you must adjust the COGNITIVE complexity of your questions by ${gradeModifier} levels (where -2 is heavily simplified and +2 is highly advanced). The baseline proficiency is ${proficiency}, but adjust the LINGUISTIC complexity of the output text by ${profModifier} levels.

STRICT FORMATTING RULE: Return ONLY a raw, valid JSON object matching the exact schema below. Do not include markdown code-fences.

SCHEMA:
{
  "connectionOverview": "1 paragraph explaining how the text relates to the sequence...",
  "discussionQuestions": ["Question 1...", "Question 2..."],
  "inquiryActivity": "A specific, hands-on or research-based task..."
}`;

    const result = await executeQuery(apiKey, prompt, '', false, null, previousLessonContext, studentProfileContext);
    setIsLoadingCrossMatrix(false);

    if (result) {
      try {
        const cleaned = result.replace(/```json|```/gi, '').trim();
        const data = JSON.parse(cleaned);
        if (data.connectionOverview && data.discussionQuestions && data.inquiryActivity) {
          setCrossMatrix(data);
          return;
        }
      } catch (e) {
        console.error("Cross Matrix parsing failed:", e);
      }
    }
    
    const fallbackPrompt = `Act as an elite Interdisciplinary Curriculum Designer. My internal engine failed. I need you to build a Science/Social Studies integration matrix based on the text below.
SOURCE TEXT: ${material || 'None'}
TARGET SEQUENCE: ${seqContext}
DIFFICULTY MODIFIERS: Cognitive shift: ${gradeModifier}. Linguistic shift: ${profModifier}.

STRICT FORMATTING RULE: Return ONLY a raw, valid JSON object. No markdown.
SCHEMA:
{
  "connectionOverview": "1 paragraph explaining how the text relates to the sequence...",
  "discussionQuestions": ["Question 1...", "Question 2..."],
  "inquiryActivity": "A specific, hands-on or research-based task..."
}`;
    setFailSafeModal({ isOpen: true, type: 'CROSS_MATRIX', promptContent: fallbackPrompt });
  };

  const handleApplyMatrixOverride = () => {
    setMatrixOverrideError('');
    try {
      const cleaned = matrixOverrideJson.replace(/```json|```/gi, '').trim();
      const parsedData = JSON.parse(cleaned);
      if (!parsedData.type1 || !parsedData.type2 || !parsedData.type3) {
        throw new Error("Missing Type 1, 2, or 3 schema keys");
      }
      setLearningMatrix(parsedData);
      setFailSafeModal({ isOpen: false, type: '', promptContent: '' });
      setMatrixOverrideJson('');
    } catch (e) {
      setMatrixOverrideError("Invalid format. Ensure you copied only the exact JSON object output.");
    }
  };

  const handleApplyCrossMatrixOverride = () => {
    setCrossMatrixOverrideError('');
    try {
      const cleaned = crossMatrixOverrideInput.replace(/```json|```/gi, '').trim();
      const parsedData = JSON.parse(cleaned);
      if (!parsedData.connectionOverview || !parsedData.discussionQuestions || !parsedData.inquiryActivity) {
        throw new Error("Missing cross matrix schema keys");
      }
      setCrossMatrix(parsedData);
      setFailSafeModal({ isOpen: false, type: '', promptContent: '' });
      setCrossMatrixOverrideInput('');
    } catch (e) {
      setCrossMatrixOverrideError("Invalid format. Ensure you copied only the exact JSON object output.");
    }
  };

  const renderMatrix = () => {
    if (!learningMatrix) return null;
    const activeData = learningMatrix[activeMatrixTab];
    if (!activeData) return null;

    return (
      <div className="matrix-container" style={{backgroundColor: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '16px'}}>
        <div className="matrix-tabs" style={{display: 'flex', borderBottom: '1px solid var(--border-color)'}}>
          <button className={`matrix-tab ${activeMatrixTab === 'type1' ? 'active' : ''}`} onClick={() => setActiveMatrixTab('type1')} style={{flex: 1, padding: '12px', border: 'none', background: activeMatrixTab === 'type1' ? 'var(--bg-hover)' : 'transparent', color: activeMatrixTab === 'type1' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: activeMatrixTab === 'type1' ? 'bold' : 'normal', cursor: 'pointer', borderRight: '1px solid var(--border-color)', borderTopLeftRadius: '8px'}}>Type 1</button>
          <button className={`matrix-tab ${activeMatrixTab === 'type2' ? 'active' : ''}`} onClick={() => setActiveMatrixTab('type2')} style={{flex: 1, padding: '12px', border: 'none', background: activeMatrixTab === 'type2' ? 'var(--bg-hover)' : 'transparent', color: activeMatrixTab === 'type2' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: activeMatrixTab === 'type2' ? 'bold' : 'normal', cursor: 'pointer', borderRight: '1px solid var(--border-color)'}}>Type 2</button>
          <button className={`matrix-tab ${activeMatrixTab === 'type3' ? 'active' : ''}`} onClick={() => setActiveMatrixTab('type3')} style={{flex: 1, padding: '12px', border: 'none', background: activeMatrixTab === 'type3' ? 'var(--bg-hover)' : 'transparent', color: activeMatrixTab === 'type3' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: activeMatrixTab === 'type3' ? 'bold' : 'normal', cursor: 'pointer', borderTopRightRadius: '8px'}}>Type 3</button>
        </div>
        <div className="matrix-content" style={{padding: '16px', fontSize: '0.9rem', lineHeight: '1.6'}}>
          {activeMatrixTab === 'type1' && (
            <>
              <div style={{marginBottom: '12px'}}><strong>Core Issue:</strong> {activeData.coreIssue}</div>
              <div style={{marginBottom: '12px'}}><strong>Author Emotion:</strong> {activeData.authorEmotion}</div>
            </>
          )}
          {activeMatrixTab === 'type2' && (
            <div style={{marginBottom: '12px'}}><strong>Real World Connections:</strong> {activeData.realWorldConnections}</div>
          )}
          {activeMatrixTab === 'type3' && (
            <div style={{marginBottom: '12px'}}><strong>Science/Logic Application:</strong> {activeData.scienceBasedApplication}</div>
          )}
          <div style={{marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px'}}>
            <strong style={{color: 'var(--accent-red)'}}>Cognitive Prompts:</strong>
            <ul style={{paddingLeft: '20px', marginTop: '8px', color: 'var(--text-main)'}}>
              {Array.isArray(activeData.prompts) ? activeData.prompts.map((p, i) => <li key={i} style={{marginBottom: '8px'}}>{p}</li>) : null}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const triggerToolFallback = (toolName, instruction, formatRule) => {
    let fallbackPrompt;
    if (toolName === 'Vocab Homework Maker') {
      const trimmedSeeds = seedWords.trim();
      fallbackPrompt = `Act as an expert ESL linguist. My system failed, and I need you to generate a vocabulary list of EXACTLY ${vocabWordCount} words based on the parameters below.

SOURCE TEXT:
${material || '[Insert Reading Material]'}

MANDATORY WORDS: [${trimmedSeeds ? trimmedSeeds : "None provided. Extract all words from the source text."}]

TASK: ${trimmedSeeds ? "First, define the MANDATORY WORDS. Then, extract additional high-value words from the SOURCE TEXT to reach the exact total." : "Extract high-value academic vocabulary from the SOURCE TEXT."}

STRICT FORMATTING RULE: Output ONLY a raw JSON array. No markdown, no conversational text. 
SCHEMA: [{ "word": "example", "pos": "noun", "definition": "...", "koreanTranslation": "...", "wordAssociation": "..." }]`;
    } else {
      const skillListStr = selectedSkills.map(s => `${s.category} (${s.microSkills.join(', ')})`).join('; ');
      fallbackPrompt = `Act as an expert ELA instructional designer. My automated system failed, and I need you to perform the function of the ${toolName} for my class. 
STUDENT PROFILE: ${studentName}
GRADE LEVEL: ${grade}
PROFICIENCY: ${proficiency}
TARGET SKILLS: ${skillListStr || 'None specified'}
SOURCE TEXT: ${toolInput || material || 'None'}
STUDENT'S RECENT ERRORS: ${JSON.stringify(errorMemory)}
HISTORICAL CONTEXT: ${previousLessonContext ? previousLessonContext : 'None provided.'} | STUDENT PROFILE: ${studentProfileContext ? studentProfileContext : 'None provided.'}. Use this historical data to calibrate difficulty and target recurring weaknesses.
TASK: ${instruction}
STRICT FORMATTING RULE: You must format your output EXACTLY according to the following markdown template. Do not include introductory or concluding conversational text. 
TEMPLATE: ${formatRule}`;
    }

    setFailSafeModal({ isOpen: true, type: 'TOOL', promptContent: fallbackPrompt });
  };

  const triggerReportFallback = () => {
    const checkedSteps = activeSteps.filter(s => stepStatus[s.num] === 'checked').map(s => `${s.num}. ${s.title}`);
    const acts = activities.map(a => `${a.title}: ${a.score}`).join('\n- ');
    const fallbackPrompt = `Act as a professional educational administrator. My automated PDF generator crashed, and I need you to format this raw class session data into a clean, professional 'Daily Student Progress Report' that I can print. 
RAW DATA: 
- Date: ${new Date().toLocaleDateString()}
- Student: ${studentName}
- Completed Roadmap Steps: ${JSON.stringify(checkedSteps)}
- Assignment Score: ${scores.assignment}
- Vocab Assignment Score: ${scores.vocabAssignment}
- Vocab Quiz Score: ${scores.vocabQuiz}
- Activities / Module Scores: \n- ${acts}
STRICT FORMATTING RULE: Format this data into a highly organized Markdown document using clear headings (H1, H2), bulleted lists for the completed steps, and a clean Markdown table for the scores. Ensure the tone is professional and ready to be handed to a parent or administrator. Do not invent any data.`;

    setFailSafeModal({ isOpen: true, type: 'REPORT', promptContent: fallbackPrompt });
  };

  const handleGenerate = async () => {
    if (selectedSkills.length === 0) {
      alert("Please select at least one Target Skill.");
      return;
    }
    const apiKey = decryptData(encryptedApiKey);
    if (!apiKey) {
      alert("No API Key found. Using default template.");
      setGeneratedSteps(DAILY_FLOW_STEPS);
      setIsGenerated(true);
      setStepStatus({});
      return;
    }

    setIsGeneratingPlan(true);
    const skillListStr = selectedSkills.map(s => `${s.category} (${s.microSkills.join(', ')})`).join('; ');
    const prompt = `Output JSON strictly formatted as: { "steps": [ { "num": 1, "title": "...", "duration": "...", "desc": "..." } ] }. Create a highly detailed, 12-step pedagogical lesson plan for a ${grade} student with ${proficiency} proficiency. The class duration is ${duration}. The target skills are: ${skillListStr}. ${prevDailyReport ? '\\nPREVIOUS DAILY REPORT CONTEXT: ' + prevDailyReport : ''} ${studentReport ? '\\nSTUDENT STRENGTHS & WEAKNESSES: ' + studentReport : ''} Break down the ${duration} total time across the 12 steps, detailing exactly how many minutes each step should take in the 'duration' field. The 'desc' must be a detailed, minute-by-minute guide. ${material ? 'The reading material is: ' + material : 'Provide a generalized lesson flow for these skills without specific reading material.'}`;
    
    const result = await executeQuery(apiKey, prompt, material || 'No specific material', false, selectedSkills, previousLessonContext, studentProfileContext);
    setIsGeneratingPlan(false);

    if (result) {
      try {
        const data = JSON.parse(result);
        if (data.steps && data.steps.length > 0) {
          setGeneratedSteps(data.steps);
          setIsGenerated(true);
          setStepStatus({});
          return;
        }
      } catch (e) {
        console.error("Failed to parse lesson plan", e);
      }
    }
    
    setGeneratedSteps(DAILY_FLOW_STEPS);
    setIsGenerated(true);
    setStepStatus({});
    
    const fallbackPrompt = `Act as an expert ELA instructional designer. Generate a customized 12-step reading-to-writing lesson plan based on the parameters below.
STUDENT PROFILE: ${studentName}
GRADE LEVEL: ${grade}
TARGET SKILLS: ${skillListStr || 'None specified'}
SOURCE TEXT: ${material || 'None'}
${prevDailyReport ? `PREVIOUS DAILY REPORT CONTEXT: ${prevDailyReport}` : ''}
${studentReport ? `STUDENT STRENGTHS & WEAKNESSES: ${studentReport}` : ''}

STRICT FORMATTING RULE: You must output ONLY a raw, valid JSON array. Do not include markdown formatting, conversational text, or code blocks (like \`\`\`json). I will be piping this directly into an application parser. 
The JSON must be an array of exactly 12 objects. Each object must represent the standard LiteracyOS phases: 
1. Caterpillar (Vocab), 2. Review, 3. Focus Skill, 4. Background Knowledge, 5. Annotate, 6. Orienteering, 7. Discuss, 8. Recall/Review, 9. Exercises/Seatwork, 10. Recap, 11. Assign Homework, 12. Upload Report.

JSON SCHEMA TO FOLLOW:
[
  {
    "id": 1,
    "title": "1. Caterpillar",
    "bullets": ["Adapt bullet 1 to text...", "Adapt bullet 2 to text..."]
  }
]
Make sure the 'bullets' array contains actionable, specific instructions tailored to the SOURCE TEXT and TARGET SKILLS.`;

    setFailSafeModal({ isOpen: true, type: 'PLAN', promptContent: fallbackPrompt });
  };

  const handleApplyOverride = () => {
    setOverrideError('');
    try {
      const cleaned = overrideJson.replace(/```json|```/gi, '').trim();
      const parsedPlan = JSON.parse(cleaned);
      if (!Array.isArray(parsedPlan)) throw new Error("Parsed data is not an array");
      
      const mappedSteps = parsedPlan.map((s, idx) => {
        if (!s.title) throw new Error(`Missing 'title' property at index ${idx}`);
        return {
          num: s.id || (idx + 1),
          title: s.title.replace(/^\d+\.\s*/, ''),
          desc: s.bullets && Array.isArray(s.bullets) ? '• ' + s.bullets.join('\n• ') : (s.desc || ''),
          duration: s.duration || ''
        };
      });

      setGeneratedSteps(mappedSteps);
      setIsGenerated(true);
      setStepStatus({});
      setShowOverrideInput(false);
      setOverrideJson('');
    } catch (e) {
      setOverrideError("Invalid format. Please ensure you copied only the JSON output.");
    }
  };

  const handleApplyVocabOverride = () => {
    setVocabOverrideError('');
    try {
      const cleaned = vocabOverrideJson.replace(/```json|```/gi, '').trim();
      const parsedData = JSON.parse(cleaned);
      if (!Array.isArray(parsedData)) throw new Error("Parsed data is not an array");
      setVocabList(parsedData);
      setShowVocabOverride(false);
      setVocabOverrideJson('');
    } catch (e) {
      setVocabOverrideError("Invalid format. Please ensure you copied only the JSON array output.");
    }
  };

  const toggleSkill = (skill) => setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  const handleStepAction = (num, action) => setStepStatus(prev => ({ ...prev, [num]: prev[num] === action ? null : action }));
  const handleAddActivity = () => setActivities(prev => [...prev, { id: Date.now(), title: '', acquired: '', total: '' }]);
  const handleRemoveActivity = (id) => setActivities(prev => prev.filter(a => a.id !== id));
  const updateActivity = (id, field, value) => setActivities(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));

  const handleDownload = () => {
    if (editableRoadmapSteps.length === 0 && generatedSteps.length > 0) {
      setEditableRoadmapSteps(generatedSteps.map(s => `${s.title}\n${s.desc}`));
    }
    setIsDownloadModalOpen(true);
  };

  const executeDownload = async () => {
    setIsDownloadModalOpen(false);
    try {
      const safeName = studentName.replace(/[^a-z0-9]/gi, '_');
      const dateStr = classDate || new Date().toISOString().split('T')[0];
      const opt = {
        margin:       0.5,
        filename:     `Reading_to_Writing_Report_${safeName}_${dateStr}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      await html2pdf().set(opt).from(printRef.current).save();
    } catch (e) {
      console.error("PDF Engine Failed:", e);
      setPdfFailed(true);
    }
  };

  // TOOL ENGINE
  const openTool = (tool) => {
    setActiveTool({ title: tool.title, desc: tool.desc, promptPrefix: tool.promptPrefix(proficiency) });
    setToolType(tool.type);
    
    const selectedText = window.getSelection().toString().trim();
    setToolInput(selectedText || material); 
    setToolOutput('');
  };

  const runToolLLM = async () => {
    const apiKey = decryptData(encryptedApiKey);
    if (!apiKey) {
      alert("Please configure AI API KEY in App Settings first.");
      return;
    }
    if (!toolInput.trim()) return;
    
    let isErrorLogger = activeTool.title.includes("Error Correction");
    const result = await executeQuery(apiKey, activeTool.promptPrefix, toolInput, isErrorLogger, selectedSkills, previousLessonContext, studentProfileContext);
    if (result) {
      setToolOutput(result);
    } else {
      triggerToolFallback(activeTool.title, 'Generate the standard output for this tool.', activeTool.promptPrefix);
    }
  };

  // Parse Outputs Based on Type
  const renderToolOutput = () => {
    if (!toolOutput) return null;

    if (toolType === 'GENERIC' || !toolOutput.trim().startsWith('{')) {
      return <div className="llm-output-box">{toolOutput}</div>;
    }

    try {
      const rawData = JSON.parse(toolOutput);

      if (toolType === 'VOCAB') {
        const data = Array.isArray(rawData) ? rawData : (rawData.vocab || rawData.items || []);
        return (
          <div className="vocab-output">
            <button className="btn-primary" onClick={() => { setVocabList(data); setActiveTool(null); }}>Apply to Vocabulary Homework</button>
            <div className="llm-output-box" style={{marginTop: '12px'}}>{JSON.stringify(data, null, 2)}</div>
          </div>
        );
      }

      if (toolType === 'THESIS' && rawData.theses) {
        const data = ThesisSchema.parse(rawData);
        return (
          <div className="thesis-grid">
            {data.theses.map((t, i) => (
              <div key={i} className="tool-card" style={{cursor: 'default', padding: '16px'}}>
                <div style={{fontSize: '0.75rem', color: 'var(--accent-red)', fontWeight: 'bold', marginBottom: '8px'}}>{t.level.toUpperCase()} THESIS</div>
                <div style={{fontWeight: 600, marginBottom: '12px'}}>{t.statement}</div>
                <ul className="rubric-list">
                  {t.args.map((a, j) => <li key={j}>{a}</li>)}
                </ul>
              </div>
            ))}
          </div>
        );
      }

      if (toolType === 'CROSS_LINGUAL' && rawData.items) {
        const data = CrossLingualSchema.parse(rawData);
        return (
          <div className="idiom-table-container">
            <table className="custom-table">
              <thead><tr><th>Original</th><th>Literal Meaning</th><th>{proficiency} Synonym</th><th>Korean Equivalent</th></tr></thead>
              <tbody>
                {data.items.map((item, i) => (
                  <tr key={i}>
                    <td><strong>{item.original}</strong></td><td>{item.literal}</td><td>{item.synonym}</td><td>{item.korean}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      if (toolType === 'QUIZ' && rawData.quiz) {
        const data = QuizSchema.parse(rawData);
        return (
          <div className="thesis-grid">
             <div className="tool-card" style={{padding: '16px', cursor: 'default'}}>
               <h4 style={{marginBottom: '12px'}}>Multiple Choice (Text Navigation)</h4>
               {data.quiz.mcq.map((q, i) => <div key={i} style={{marginBottom: '8px'}}><strong>Q:</strong> {q.question}<br/><span style={{fontSize: '0.85rem'}}><strong>A:</strong> {q.answer}</span></div>)}
             </div>
             <div className="tool-card" style={{padding: '16px', cursor: 'default'}}>
               <h4 style={{marginBottom: '12px'}}>Cloze (Active Vocab)</h4>
               {data.quiz.cloze.map((q, i) => <div key={i} style={{marginBottom: '8px'}}><strong>Q:</strong> {q.question}<br/><span style={{fontSize: '0.85rem'}}><strong>A:</strong> {q.answer}</span></div>)}
             </div>
             <div className="tool-card" style={{padding: '16px', cursor: 'default'}}>
               <h4 style={{marginBottom: '12px'}}>Open Ended (Writing Bridge)</h4>
               {data.quiz.open.map((q, i) => <div key={i} style={{marginBottom: '8px'}}><strong>Q:</strong> {q.question}</div>)}
             </div>
          </div>
        )
      }

      if (toolType === 'PEER' && rawData.glows) {
        const data = PeerSchema.parse(rawData);
        return (
          <div className="peer-review-grid" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
            <div className="tool-card" style={{borderColor: '#4ade80', backgroundColor: 'rgba(74, 222, 128, 0.05)'}}>
              <h4 style={{color: '#4ade80', marginBottom: '12px'}}>✅ GLOWS (Strengths)</h4>
              <ul className="rubric-list">
                {data.glows.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </div>
            <div className="tool-card" style={{borderColor: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.05)'}}>
              <h4 style={{color: '#fbbf24', marginBottom: '12px'}}>📌 GROWS (Areas for Revision)</h4>
              <ul className="rubric-list">
                {data.grows.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </div>
          </div>
        );
      }

      if (toolType === 'SUMMARY' && rawData.tiers) {
        const data = SummarySchema.parse(rawData);
        const activeSummary = data.tiers[summaryTier] || "No summary found for this tier.";
        return (
          <div>
            <div style={{marginBottom: '16px'}}>
              <label style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>Scaffold Tier:</label>
              <select className="custom-input" style={{width: '200px', marginLeft: '12px'}} value={summaryTier} onChange={e => setSummaryTier(e.target.value)}>
                <option value="beginner">Beginner (Cloze)</option>
                <option value="intermediate">Intermediate (Sentence Starters)</option>
                <option value="advanced">Advanced (Inquiry Outline)</option>
              </select>
            </div>
            <div className="llm-output-box">{activeSummary}</div>
          </div>
        );
      }
      
      return <div className="llm-output-box">{JSON.stringify(rawData, null, 2)}</div>;

    } catch (e) {
      throw e; 
    }
  };

  const gradeLabel = grade.split('(')[1]?.replace(')','') || grade;
  const activeSteps = generatedSteps.length > 0 ? generatedSteps : DAILY_FLOW_STEPS;
  const completedSteps = Object.values(stepStatus).filter(v => v === 'checked').length;
  const totalSteps = activeSteps.length;
  const progressPercentage = totalSteps === 0 ? 0 : (completedSteps / totalSteps) * 100;
  const strokeDashoffset = (2 * Math.PI * 24) - (progressPercentage / 100) * (2 * Math.PI * 24);

  // ── PRE-DOWNLOAD MODAL ──────────────────────────────────────────────────────
  const DownloadModal = () => {
    const fallbackDownloadPrompt = `As an expert pedagogical assessor, write a final summary report for the student based on the following class session data.

STUDENT NAME: ${studentName}
GRADE LEVEL: ${grade}
PROFICIENCY: ${proficiency}
CLASS DURATION: ${duration}

TARGET SKILLS:
${selectedSkills.map(s => `- ${s.category}: ${s.microSkills.join(', ')}`).join('\n')}

SCORES:
- Main Assignment: ${scores.assignment.acquired || 0}/${scores.assignment.total || 0}
- Vocab Assignment: ${scores.vocabAssignment.acquired || 0}/${scores.vocabAssignment.total || 0}
- Vocab Quiz: ${scores.vocabQuiz.acquired || 0}/${scores.vocabQuiz.total || 0}
${activities.filter(a => a.title).map(a => `- ${a.title}: ${a.acquired || 0}/${a.total || 0}`).join('\n')}

TEACHER'S INTERNAL NOTES:
${sessionNotes || 'None'}

LOGGED ERRORS (AI generation failures to account for):
${errorMemory.length > 0 ? errorMemory.map(e => `- ${e.toolName} Failed: ${e.input}`).join('\n') : 'None'}

Please format your final feedback clearly with a summary of their performance, areas of strength, areas for improvement, and recommended next steps. Output only the final feedback text without markdown conversational filler.`;

    return (
      <div 
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <div style={{
          background: 'var(--bg-main)', border: '1px solid var(--border-color)',
          borderRadius: '16px', padding: '32px', width: '800px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)'
        }} className="custom-scrollbar">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px'}}>
            <div>
              <div style={{color:'var(--accent-red)', fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:'4px'}}>FINAL STEP</div>
              <h2 style={{fontFamily:'var(--font-head)', fontSize:'1.6rem', margin:0}}>Configure &amp; Download Report</h2>
            </div>
            <button className="icon-btn" onClick={() => setIsDownloadModalOpen(false)}><X size={24}/></button>
          </div>

          <div style={{display:'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px'}}>
            <div>
              <label className="dropdown-label">CLASS DATE</label>
              <input type="date" className="custom-input" value={classDate} onChange={e => setClassDate(e.target.value)} style={{width: '100%'}} />
            </div>
            <div>
              <label className="dropdown-label">START TIME</label>
              <input type="time" className="custom-input" value={classStartTime} onChange={e => setClassStartTime(e.target.value)} style={{width: '100%'}} />
            </div>
            <div>
              <label className="dropdown-label">END TIME</label>
              <input type="time" className="custom-input" value={classEndTime} onChange={e => setClassEndTime(e.target.value)} style={{width: '100%'}} />
            </div>
          </div>

          <div style={{marginBottom: '24px'}}>
            <label className="dropdown-label">EDITABLE 12-STEP ROADMAP (Appears on PDF)</label>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {editableRoadmapSteps.map((step, idx) => (
                <div key={idx} style={{display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
                  <div style={{fontWeight: 'bold', color: 'var(--text-muted)', paddingTop: '8px', minWidth: '24px'}}>{idx + 1}.</div>
                  <textarea
                    className="custom-input custom-scrollbar"
                    value={step}
                    onChange={e => {
                      const newSteps = [...editableRoadmapSteps];
                      newSteps[idx] = e.target.value;
                      setEditableRoadmapSteps(newSteps);
                    }}
                    style={{width: '100%', minHeight: '80px', fontSize: '0.85rem', resize: 'vertical'}}
                  />
                </div>
              ))}
              {editableRoadmapSteps.length === 0 && (
                <p style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>No roadmap generated yet.</p>
              )}
            </div>
          </div>

          <div style={{marginBottom: '24px'}}>
            <label className="dropdown-label">TEACHER'S SESSION NOTES (Included in Prompt below)</label>
            <textarea 
              className="custom-input custom-scrollbar" 
              value={sessionNotes} 
              onChange={e => setSessionNotes(e.target.value)} 
              placeholder="Any qualitative observations to feed the AI for the final summary..."
              style={{width: '100%', minHeight: '80px', fontSize: '0.85rem'}}
            />
          </div>

          <div style={{border: '1px dashed var(--accent-red)', padding: '16px', borderRadius: '8px', marginBottom: '24px', backgroundColor: 'var(--panel-bg)'}}>
            <h4 style={{color: 'var(--accent-red)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}><AlertCircle size={16}/> AI Override Fallback</h4>
            <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px'}}>If the internal AI is failing to generate a final summary, copy this prompt to ChatGPT/Claude to generate the final student feedback.</p>
            
            <div style={{position: 'relative', marginBottom: '16px'}}>
              <textarea 
                className="custom-input custom-scrollbar" 
                readOnly 
                value={fallbackDownloadPrompt} 
                style={{width: '100%', minHeight: '100px', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)', backgroundColor: 'var(--bg-main)'}}
              />
              <button 
                className="icon-btn" 
                onClick={() => navigator.clipboard.writeText(fallbackDownloadPrompt)} 
                style={{position: 'absolute', top: '8px', right: '8px', backgroundColor: 'var(--panel-bg)', padding: '6px'}}
                title="Copy Prompt"
              >
                <Check size={14} />
              </button>
            </div>

            <label className="dropdown-label">PASTE AI FINAL FEEDBACK HERE (Appears on PDF)</label>
            <textarea 
              className="custom-input custom-scrollbar" 
              value={aiFinalFeedback} 
              onChange={e => setAiFinalFeedback(e.target.value)} 
              placeholder="Paste the final generated feedback from the external AI here..."
              style={{width: '100%', minHeight: '120px', fontSize: '0.85rem'}}
            />
          </div>

          <div style={{display:'flex', gap:'12px', marginTop:'28px', borderTop: '1px solid var(--border-color)', paddingTop: '24px'}}>
            <button
              className="btn-primary"
              style={{flex:1, padding:'16px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}
              onClick={executeDownload}
            >
              <Download size={20} /> Generate Final PDF Report
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── VOCAB CONFIG MODAL ──────────────────────────────────────────────────────
  const VocabConfigModal = () => (
    <div 
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setShowVocabModal(false);
      }}
    >
      <div style={{
        background: 'var(--panel-bg)', border: '1px solid var(--border-color)',
        borderRadius: '16px', padding: '32px', width: '420px', maxWidth: '90vw',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)'
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px'}}>
          <div>
            <div style={{color:'var(--accent-red)', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:'4px'}}>VOCAB CONFIGURATION</div>
            <h2 style={{fontFamily:'var(--font-head)', fontSize:'1.4rem', margin:0}}>Configure &amp; Generate</h2>
          </div>
          <button className="icon-btn" onClick={() => setShowVocabModal(false)}><X size={20}/></button>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
          <div>
            <label style={{fontSize:'0.8rem', color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:'8px'}}>Word Count</label>
            <input
              type="number"
              className="custom-input"
              style={{width:'100%', fontSize:'1rem', padding:'10px 14px'}}
              value={vocabWordCount}
              onChange={e => setVocabWordCount(e.target.value)}
              min="1" max="50"
              placeholder="e.g. 15"
            />
            <p style={{fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'6px'}}>How many vocabulary words should be extracted from the material.</p>
          </div>

          <div>
            <label style={{fontSize:'0.8rem', color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:'8px'}}>Mandatory Seed Words</label>
            <textarea
              className="custom-input custom-scrollbar"
              style={{width:'100%', minHeight:'80px', resize:'vertical', fontSize:'0.9rem', padding:'10px 14px'}}
              placeholder="e.g. photosynthesis, ecosystem, biodiversity..."
              value={seedWords}
              onChange={e => setSeedWords(e.target.value)}
            />
            <p style={{fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'6px'}}>Comma-separated words the AI <em>must</em> include regardless of the text.</p>
          </div>
        </div>

        <div style={{display:'flex', gap:'12px', marginTop:'28px'}}>
          <button
            className="btn-primary"
            style={{flex:1, padding:'12px'}}
            onClick={() => { setShowVocabModal(false); handleGenerateVocab(); }}
            disabled={isLoadingVocab || !material}
          >
            {isLoadingVocab ? 'Generating...' : '✦ Confirm & Generate'}
          </button>
          <button
            className="icon-btn"
            style={{padding:'12px 20px', border:'1px solid var(--border-color)'}}
            onClick={() => setShowVocabModal(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
  // ── CALIBRATION MODAL ────────────────────────────────────────────────────────
  const CalibrationModal = () => (
    <div 
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)'
      }}
    >
      <div 
        style={{
          width: '90%', maxWidth: '500px', backgroundColor: 'var(--bg-main)', 
          borderRadius: '12px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column'
        }}
      >
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
          <h2 style={{margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <Settings size={20} style={{color: 'var(--accent-red)'}}/>
            Pre-Generation Calibration
          </h2>
          <button className="icon-btn" onClick={() => setShowCalibrationModal(false)}><X size={20} /></button>
        </div>

        <div style={{marginBottom: '20px'}}>
          <label className="dropdown-label">Linguistic Complexity (Proficiency) Shift</label>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span style={{fontSize: '0.8rem'}}>-2</span>
            <input 
              type="range" min="-2" max="2" step="1" 
              value={profModifier} 
              onChange={e => setProfModifier(parseInt(e.target.value))} 
              style={{flex: 1, margin: '0 12px'}}
            />
            <span style={{fontSize: '0.8rem'}}>+2</span>
          </div>
          <div style={{textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px'}}>
            {profModifier === 0 ? 'Baseline' : profModifier > 0 ? `+${profModifier} Levels` : `${profModifier} Levels`}
          </div>
        </div>

        <div style={{marginBottom: '24px'}}>
          <label className="dropdown-label">Cognitive Complexity (Grade Level) Shift</label>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span style={{fontSize: '0.8rem'}}>-2</span>
            <input 
              type="range" min="-2" max="2" step="1" 
              value={gradeModifier} 
              onChange={e => setGradeModifier(parseInt(e.target.value))} 
              style={{flex: 1, margin: '0 12px'}}
            />
            <span style={{fontSize: '0.8rem'}}>+2</span>
          </div>
          <div style={{textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px'}}>
            {gradeModifier === 0 ? 'Baseline' : gradeModifier > 0 ? `+${gradeModifier} Levels` : `${gradeModifier} Levels`}
          </div>
        </div>

        {matrixTypeToGenerate === 'cross' && (
          <div style={{marginBottom: '24px'}}>
            <label className="dropdown-label">Cross-Disciplinary Curriculum Sequence</label>
            <select 
              className="custom-input" 
              value={selectedSequenceId} 
              onChange={e => setSelectedSequenceId(e.target.value)}
              style={{width: '100%'}}
            >
              <option value="auto">Auto-Detect based on Text</option>
              {CURRICULUM_SEQUENCES.map(seq => (
                <option key={seq.id} value={seq.id}>
                  {seq.id} {seq.title}: {seq.question}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{display:'flex', gap:'12px', marginTop:'16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px'}}>
          <button
            className="btn-primary"
            style={{flex:1, padding:'12px'}}
            onClick={() => { 
              setShowCalibrationModal(false); 
              if (matrixTypeToGenerate === 'deep') executeGenerateDeepMatrix();
              else executeGenerateCrossMatrix();
            }}
          >
            ✦ Confirm & Generate
          </button>
          <button
            className="icon-btn"
            style={{padding:'12px 20px', border:'1px solid var(--border-color)'}}
            onClick={() => setShowCalibrationModal(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`app-layout ${isDarkMode ? '' : 'light-theme'}`}>
      
      {/* ── FAIL-SAFE OVERRIDE MODAL ── */}
      {failSafeModal.isOpen && (
        <div className="modal-overlay" style={{zIndex: 9999}}>
          <div className="modal-content" style={{border: '2px solid var(--accent-red)', maxWidth: '700px'}}>
            <div className="modal-header">
              <div>
                <h2 style={{color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '8px'}}><AlertCircle size={20} /> Manual LLM Override Required</h2>
                <p>The automated system has failed. Copy the prompt below into ChatGPT, Claude, or Gemini directly.</p>
              </div>
              <button className="icon-btn" onClick={() => setFailSafeModal({ isOpen: false, type: '', promptContent: '' })}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <textarea 
                className="custom-input custom-scrollbar" 
                style={{minHeight: '250px', resize: 'vertical', fontSize: '0.85rem', fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.2)'}}
                value={failSafeModal.promptContent}
                readOnly
              />
              <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '16px', marginBottom: failSafeModal.type === 'MATRIX' ? '24px' : '0'}}>
                <button className="btn-primary" onClick={() => navigator.clipboard.writeText(failSafeModal.promptContent)} style={{backgroundColor: 'var(--accent-red)'}}>
                  Copy to Clipboard
                </button>
              </div>

              {failSafeModal.type === 'MATRIX' && (
                <div style={{paddingTop: '16px', borderTop: '1px solid var(--border-color)'}}>
                  <p style={{marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)'}}>Paste Extracted Matrix Data</p>
                  <textarea 
                    className="custom-input custom-scrollbar" 
                    style={{minHeight: '200px', resize: 'vertical', fontSize: '0.85rem', fontFamily: 'monospace'}}
                    placeholder='Paste external LLM matrix JSON here...'
                    value={matrixOverrideJson}
                    onChange={e => setMatrixOverrideJson(e.target.value)}
                  />
                  {matrixOverrideError && <div style={{color: 'var(--accent-red)', fontSize: '0.8rem', marginTop: '8px'}}>{matrixOverrideError}</div>}
                  <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '12px'}}>
                    <button className="btn-primary" onClick={handleApplyMatrixOverride}>Incorporate Matrix Data</button>
                  </div>
                </div>
              )}

              {failSafeModal.type === 'CROSS_MATRIX' && (
                <div style={{paddingTop: '16px', borderTop: '1px solid var(--border-color)'}}>
                  <p style={{marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)'}}>Paste Extracted Cross-Disciplinary Matrix Data</p>
                  <textarea 
                    className="custom-input custom-scrollbar" 
                    style={{minHeight: '200px', resize: 'vertical', fontSize: '0.85rem', fontFamily: 'monospace'}}
                    placeholder='Paste external LLM matrix JSON here...'
                    value={crossMatrixOverrideInput}
                    onChange={e => setCrossMatrixOverrideInput(e.target.value)}
                  />
                  {crossMatrixOverrideError && <div style={{color: 'var(--accent-red)', fontSize: '0.8rem', marginTop: '8px'}}>{crossMatrixOverrideError}</div>}
                  <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '12px'}}>
                    <button className="btn-primary" onClick={handleApplyCrossMatrixOverride}>Incorporate Cross-Disciplinary Data</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LLM TOOL MODAL ── */}
      {activeTool && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h2>{activeTool.title}</h2>
                <p>{activeTool.desc}</p>
              </div>
              <button className="icon-btn" onClick={() => setActiveTool(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <label style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>Input Context / Material:</label>
              <textarea 
                className="custom-input" 
                style={{minHeight: '120px', resize: 'vertical'}}
                value={toolInput}
                onChange={e => setToolInput(e.target.value)}
                placeholder="Paste the reading material, paragraph, or specific words here..."
              ></textarea>
              
              <button 
                className="btn-primary" 
                onClick={runToolLLM}
                disabled={isToolLoading || !toolInput.trim() || !encryptedApiKey}
                title={!encryptedApiKey ? "API Key required" : ""}
              >
                {isToolLoading ? 'Processing with AI...' : 'Generate Output'}
              </button>

              {toolError && <div style={{color: 'var(--accent-red)', fontSize: '0.85rem'}}>{toolError}</div>}

              {toolOutput && (
                <div style={{marginTop: '16px'}}>
                  <label style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block'}}>AI Output:</label>
                  <ToolErrorBoundary>
                    {renderToolOutput()}
                  </ToolErrorBoundary>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TOOLBOX MANAGER MODAL ── */}
      {showToolbox && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '800px'}}>
            <div className="modal-header">
              <div>
                <h2>Manage Toolbox</h2>
                <p>Star your favorite tools to pin them to your live workspace.</p>
              </div>
              <button className="icon-btn" onClick={() => setShowToolbox(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
              {ALL_AI_TOOLS.map(tool => {
                const isFav = favoriteTools.includes(tool.id);
                return (
                  <div key={tool.id} className="tool-card" style={{borderColor: isFav ? tool.color : 'var(--border-color)', opacity: isFav ? 1 : 0.6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'default'}}>
                    <div>
                      <div className="tool-card-title">{tool.title}</div>
                      <div className="tool-card-desc">{tool.desc}</div>
                    </div>
                    <button 
                      className="icon-btn" 
                      onClick={() => {
                        setFavoriteTools(prev => isFav ? prev.filter(id => id !== tool.id) : [...prev, tool.id]);
                      }}
                      style={{color: isFav ? '#fbbf24' : 'var(--text-muted)'}}
                    >
                      <Star size={20} fill={isFav ? '#fbbf24' : 'none'} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── VOCAB CONFIG MODAL ── */}
      {showVocabModal && <VocabConfigModal />}
      {isDownloadModalOpen && <DownloadModal />}
      {showCalibrationModal && <CalibrationModal />}

      {/* ── SIDEBAR ── */}
      <aside className="app-sidebar" style={{overflowY: 'auto'}}>
        <div className="sidebar-logo">
          <div className="logo-dot"></div>
          READING TO WRITING APP
        </div>

        <div className="sidebar-dropdowns" style={{marginBottom: 0}}>
          {isStudentView ? (
            <div className="locked-overlay" style={{borderColor: 'var(--accent-red)'}}>
              <Eye size={24} style={{marginBottom: '8px', opacity: 0.8, color: 'var(--accent-red)'}} />
              <p style={{color: 'var(--accent-red)', fontWeight: 'bold'}}>Student View Active</p>
              <p style={{marginTop: '4px', fontSize: '0.75rem'}}>Sensitive info hidden.</p>
            </div>
          ) : isSettingsOpen && (
            <>
              <div className="dropdown-group">
                <label className="dropdown-label" style={{color: 'var(--accent-red)'}}><Key size={10} style={{display:'inline', marginRight: 4}}/> AI API CONFIGURATION</label>
                <input 
                  type="password" 
                  className="custom-input" 
                  placeholder="Enter Gemini API Key" 
                  value={tempApiKeyInput}
                  onChange={e => handleApiKeyChange(e.target.value)}
                  style={{fontSize: '0.8rem', padding: '8px 12px', marginBottom: '8px'}}
                />
              </div>

              <div className="dropdown-group">
                <label className="dropdown-label">ADMIN: STUDENT PROFILE</label>
                <div style={{display: 'flex', gap: '8px'}}>
                  <input 
                    type="text" 
                    className="custom-input" 
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    style={{fontSize: '0.85rem', flex: 1}}
                    placeholder="Name"
                  />
                  <input 
                    type="text" 
                    className="custom-input" 
                    value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                    placeholder="ID"
                    style={{fontSize: '0.85rem', width: '80px'}}
                  />
                </div>
              </div>



              <div className="dropdown-group">
                <label className="dropdown-label">ADMIN: GRADE LEVEL</label>
                <div className="custom-select-wrapper">
                  <select value={grade} onChange={e => setGrade(e.target.value)}>
                    {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div className="dropdown-group">
                <label className="dropdown-label">ADMIN: PROFICIENCY</label>
                <div className="custom-select-wrapper">
                  <select value={proficiency} onChange={e => setProficiency(e.target.value)}>
                    {PROFICIENCIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="dropdown-group">
                <label className="dropdown-label">ADMIN: CLASS DURATION</label>
                <div className="custom-select-wrapper">
                  <select value={duration} onChange={e => setDuration(e.target.value)}>
                    {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="dropdown-group">
                <label className="dropdown-label">ADMIN: PREVIOUS DAILY REPORT</label>
                <textarea 
                  className="custom-input custom-scrollbar" 
                  placeholder="Paste previous report..."
                  value={prevDailyReport}
                  onChange={e => setPrevDailyReport(e.target.value)}
                  style={{fontSize: '0.75rem', width: '100%', minHeight: '60px', resize: 'vertical'}}
                />
              </div>

              <div className="dropdown-group">
                <label className="dropdown-label">ADMIN: STUDENT REPORT (STRENGTHS)</label>
                <textarea 
                  className="custom-input custom-scrollbar" 
                  placeholder="Paste general student report..."
                  value={studentReport}
                  onChange={e => setStudentReport(e.target.value)}
                  style={{fontSize: '0.75rem', width: '100%', minHeight: '60px', resize: 'vertical', marginBottom: '16px'}}
                />
              </div>

              {/* HISTORICAL CONTEXT HUB */}
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 0 24px 0', borderBottom: '1px solid var(--border-color)', marginBottom: '24px'}}>
                <label className="dropdown-label" style={{marginBottom: '4px'}}>ADMIN: HISTORICAL CONTEXT UPLOADS</label>
                <div style={{display: 'flex', flexDirection: 'column'}}>
                  <label style={{fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase'}}>
                    Previous Daily Report
                    {isPrevLessonLoaded && <span style={{marginLeft: '6px', color: '#4ade80'}}>✓</span>}
                  </label>
                  <div
                    {...getPrevLessonRootProps()}
                    onClick={openPrevLessonDropzone}
                    style={{
                      border: isPrevLessonDragActive ? '2px dashed #4ade80' : '2px dashed var(--border-color)',
                      borderRadius: '6px', padding: '12px', textAlign: 'center', cursor: 'pointer',
                      backgroundColor: isPrevLessonDragActive ? 'rgba(74,222,128,0.08)' : 'var(--panel-bg)',
                      transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    <input {...getPrevLessonInputProps()} />
                    <FileText size={16} style={{color: isPrevLessonLoaded ? '#4ade80' : 'var(--text-muted)', marginBottom: '4px'}} />
                    <span style={{fontSize: '0.65rem', color: 'var(--text-muted)'}}>Drop past Daily Report (PDF/Doc)</span>
                  </div>
                </div>

                <div style={{display: 'flex', flexDirection: 'column'}}>
                  <label style={{fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase'}}>
                    General Student Report
                    {isStudentProfileLoaded && <span style={{marginLeft: '6px', color: '#4ade80'}}>✓</span>}
                  </label>
                  <div
                    {...getStudentProfileRootProps()}
                    onClick={openStudentProfileDropzone}
                    style={{
                      border: isStudentProfileDragActive ? '2px dashed #4ade80' : '2px dashed var(--border-color)',
                      borderRadius: '6px', padding: '12px', textAlign: 'center', cursor: 'pointer',
                      backgroundColor: isStudentProfileDragActive ? 'rgba(74,222,128,0.08)' : 'var(--panel-bg)',
                      transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    <input {...getStudentProfileInputProps()} />
                    <BookOpen size={16} style={{color: isStudentProfileLoaded ? '#4ade80' : 'var(--text-muted)', marginBottom: '4px'}} />
                    <span style={{fontSize: '0.65rem', color: 'var(--text-muted)'}}>Drop General Report (PDF/Doc)</span>
                  </div>
                </div>
              </div>
              
              <div className="dropdown-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <label className="dropdown-label">ADMIN: TARGET SKILLS</label>
                <div className="taxonomy-accordion custom-scrollbar" style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '4px', backgroundColor: 'var(--panel-bg)', minHeight: '150px' }}>
                  {ELA_TAXONOMY.map(tax => {
                    const isExpanded = expandedTaxonomy === tax.category;
                    const selectedNode = selectedSkills.find(s => s.category === tax.category);
                    const isAllSelected = selectedNode && selectedNode.microSkills.length === tax.microSkills.length;
                    const isSomeSelected = selectedNode && selectedNode.microSkills.length > 0 && !isAllSelected;

                    return (
                      <div key={tax.category} className="taxonomy-node" style={{ marginBottom: '4px' }}>
                        <div className="taxonomy-header" style={{ display: 'flex', alignItems: 'center', padding: '8px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={isAllSelected}
                            ref={el => { if (el) el.indeterminate = isSomeSelected; }}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (isAllSelected) {
                                setSelectedSkills(prev => prev.filter(s => s.category !== tax.category));
                              } else {
                                setSelectedSkills(prev => [...prev.filter(s => s.category !== tax.category), { category: tax.category, microSkills: [...tax.microSkills] }]);
                              }
                            }}
                            style={{ marginRight: '8px' }}
                          />
                          <span style={{ fontSize: '0.85rem', flex: 1, fontWeight: '600' }} onClick={() => setExpandedTaxonomy(isExpanded ? null : tax.category)}>
                            {tax.category}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {selectedNode ? `${selectedNode.microSkills.length}/${tax.microSkills.length}` : ''}
                          </span>
                        </div>
                        
                        {isExpanded && (
                          <div className="taxonomy-children" style={{ paddingLeft: '24px', marginTop: '4px', marginBottom: '8px' }}>
                            {tax.microSkills.map(micro => {
                              const isMicroSelected = selectedNode?.microSkills.includes(micro);
                              return (
                                <label key={micro} style={{ display: 'flex', alignItems: 'flex-start', fontSize: '0.8rem', padding: '4px 0', cursor: 'pointer', color: isMicroSelected ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={!!isMicroSelected}
                                    onChange={() => {
                                      let currentMicro = selectedNode ? [...selectedNode.microSkills] : [];
                                      if (isMicroSelected) {
                                        currentMicro = currentMicro.filter(m => m !== micro);
                                      } else {
                                        currentMicro.push(micro);
                                      }
                                      
                                      setSelectedSkills(prev => {
                                        const withoutNode = prev.filter(s => s.category !== tax.category);
                                        if (currentMicro.length === 0) return withoutNode;
                                        return [...withoutNode, { category: tax.category, microSkills: currentMicro }];
                                      });
                                    }}
                                    style={{ marginRight: '8px', marginTop: '2px' }}
                                  />
                                  <span style={{flex: 1, lineHeight: '1.4'}}>{micro}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {!showClearConfirm ? (
                <button className="footer-btn" style={{marginTop: '16px', color: 'var(--accent-red)'}} onClick={(e) => { e.preventDefault(); setShowClearConfirm(true); }}>
                  <Trash size={16} /> Clear Session Data
                </button>
              ) : (
                <div style={{marginTop: '16px', padding: '12px', border: '1px solid var(--accent-red)', borderRadius: '8px', backgroundColor: 'rgba(229, 57, 53, 0.1)'}}>
                  <p style={{color: 'var(--accent-red)', fontSize: '0.8rem', marginBottom: '8px', fontWeight: '600'}}>Clear entire session?</p>
                  <div style={{display: 'flex', gap: '8px'}}>
                    <button className="btn-primary" style={{flex: 1, padding: '4px 8px', fontSize: '0.8rem'}} onClick={clearSession}>Yes, Clear</button>
                    <button className="icon-btn" style={{padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--border-color)'}} onClick={() => setShowClearConfirm(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="sidebar-meta" style={{marginTop: 'auto', marginBottom: '16px'}}>
          <div className="meta-title">Reading to Writing</div>
          <div className="meta-subtitle">{gradeLabel} - {proficiency.split(' ')[0]}</div>
          <div className="meta-desc">
            <strong>Student:</strong> {studentName} ({studentId})<br/>
            Bridging reading comprehension into actionable writing.
          </div>
        </div>

        <div className="sidebar-footer">
          {!isStudentView && (
            <button className="footer-btn" onClick={() => setIsSettingsOpen(!isSettingsOpen)} style={{color: isSettingsOpen ? 'var(--text-main)' : 'var(--text-muted)'}}>
              <Settings size={16} /> {isSettingsOpen ? 'Hide Settings' : 'Settings'}
            </button>
          )}
          <button className="footer-btn icon-only" onClick={() => setIsStudentView(!isStudentView)} title={isStudentView ? "Exit Student View" : "Enter Student View"} style={{color: isStudentView ? 'var(--accent-red)' : 'var(--text-muted)'}}>
            {isStudentView ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button className="footer-btn icon-only" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <main className="app-main">
        <header className="main-header" style={{paddingBottom: '20px'}}>
          <div className="header-left">
            <div className="header-breadcrumbs">READING TO WRITING - {gradeLabel}</div>
            <h1 className="header-title">Live Workspace</h1>
            <div className="header-tags" style={{marginTop: '12px'}}>
              <div className="tag">Student <strong>{studentName}</strong>{(isPrevLessonLoaded || isStudentProfileLoaded) && <span style={{marginLeft:'6px',fontSize:'0.65rem',color:'#4ade80',fontWeight:700}}>📚 History</span>}</div>
              {!isStudentView && (
                <>
                  <div className="tag">Time <strong>{duration}</strong></div>
                  <div className="tag">Proficiency <strong>{proficiency.split(' ')[0]}</strong></div>
                </>
              )}
            </div>
          </div>
          
          <div className="header-right">
            {!isStudentView && (
              <div className="info-row" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <span><strong>Class Timer:</strong> <span style={{fontFamily: 'monospace', fontSize: '1rem'}}>{formatTime(timerSeconds)}</span></span>
                <div style={{display: 'flex', gap: '4px'}}>
                  <button className="icon-btn" style={{width: 24, height: 24}} onClick={() => setIsTimerRunning(!isTimerRunning)}>
                    {isTimerRunning ? <Pause size={12}/> : <Play size={12}/>}
                  </button>
                  <button className="icon-btn" style={{width: 24, height: 24}} onClick={() => {setIsTimerRunning(false); setTimerSeconds(0);}}>
                    <RotateCcw size={12}/>
                  </button>
                </div>
              </div>
            )}
            <div className="info-row"><strong>Level:</strong> {grade}</div>
            {!isStudentView && <div className="info-row"><strong>Skills:</strong> {selectedSkills.length > 0 ? selectedSkills.map(s => s.category).join(', ') : 'None'}</div>}
            <div className="info-row"><strong>Time:</strong> {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
          </div>
        </header>

        <div className="workspace-grid" style={{gridTemplateColumns: isStudentView ? '1fr' : '1fr 1fr'}}>
          {/* LEFT COLUMN: LIVE TEXT */}
          <div className="workspace-left" style={{borderRight: isStudentView ? 'none' : '1px solid var(--border-color)', display: 'flex', flexDirection: 'column'}}>
            <div>
              <div className="seq-kicker">LIVE TEXT</div>
              <h3 className="seq-title" style={{marginBottom: '16px'}}>Reading Material</h3>
            </div>


            {!isGenerated ? (
              <div {...getRootProps()} style={{flex: 1, display: 'flex', flexDirection: 'column', minHeight: '300px', border: isDragActive ? '2px dashed var(--accent-red)' : '1px solid transparent', backgroundColor: isDragActive ? 'var(--bg-hover)' : 'transparent', transition: 'all 0.2s ease', padding: isDragActive ? '16px' : '0', borderRadius: '8px'}}>
                <input {...getInputProps()} />
                {!isStudentView && (
                  <div 
                    className="dropzone-header" 
                    onClick={openDropzone}
                    style={{padding: '16px', border: '2px dashed var(--border-color)', borderRadius: '8px', marginBottom: '16px', textAlign: 'center', cursor: 'pointer', backgroundColor: 'var(--panel-bg)', color: 'var(--text-muted)'}}
                  >
                    <UploadCloud size={24} style={{marginBottom: '8px', color: 'var(--accent-red)'}} />
                    <p style={{fontSize: '0.85rem', margin: 0, fontWeight: 500}}>Drag & Drop PDF, DOCX, or Images here — or click to browse.</p>
                  </div>
                )}
                <textarea 
                  className="textarea-gen custom-scrollbar"
                  placeholder="Paste the reading material here (Optional)..."
                  value={material}
                  onChange={e => setMaterial(e.target.value)}
                  readOnly={isStudentView}
                  style={{ flex: 1, marginBottom: '16px', resize: 'vertical' }}
                ></textarea>
                {!isStudentView && (
                  <button className="btn-primary" onClick={handleGenerate} disabled={isGeneratingPlan || selectedSkills.length === 0}>
                    {isGeneratingPlan ? 'GENERATING AI LESSON PLAN...' : 'GENERATE LESSON PLAN & WORKSPACE'}
                  </button>
                )}
              </div>
            ) : (
              <div style={{flex: 1, display: 'flex', flexDirection: 'column', minHeight: '300px'}}>
                <div className="llm-output-box" style={{flex: 1, overflowY: 'auto', backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)'}} onMouseUp={handleTextSelection}>
                  {material}
                </div>
                {!isStudentView && <div className="highlight-hint"><TextSelect size={14} /> Highlight text to auto-fill AI tools</div>}
              </div>
            )}

            {/* VOCABULARY SECTION */}
            {(isGenerated && !isStudentView) || (isStudentView && vocabList.length > 0) ? (
              <div style={{marginTop: '32px', display: 'flex', flexDirection: 'column', flex: 1}}>
                <div className="sequence-header" style={{marginBottom: '16px', alignItems: 'flex-start'}}>
                  <div>
                    <div className="seq-kicker">VOCABULARY</div>
                    <h3 className="seq-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      Vocab Homework
                      {!isStudentView && (
                        <button 
                          className="icon-btn" 
                          onClick={() => setShowVocabOverride(!showVocabOverride)} 
                          title="Manual Override / Paste AI Vocab"
                          style={{color: showVocabOverride ? 'var(--accent-red)' : 'var(--text-muted)'}}
                        >
                          <PenTool size={16} />
                        </button>
                      )}
                    </h3>
                  </div>

                  {!isStudentView && !showVocabOverride && (
                    <button
                      className="btn-primary"
                      onClick={() => setShowVocabModal(true)}
                      disabled={!material}
                      style={{padding: '8px 16px', fontSize: '0.8rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px'}}
                    >
                      <Settings size={14} />
                      {isLoadingVocab ? 'Generating...' : 'Configure & Generate Vocab'}
                    </button>
                  )}
                </div>

                {showVocabOverride ? (
                  <div style={{padding: '16px', backgroundColor: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px'}}>
                    <label style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block'}}>Manual Override / Paste AI Vocab JSON</label>
                    <textarea 
                      className="custom-input custom-scrollbar" 
                      style={{minHeight: '200px', resize: 'vertical', fontSize: '0.85rem', fontFamily: 'monospace', width: '100%'}}
                      placeholder='Paste the JSON from external AI here...'
                      value={vocabOverrideJson}
                      onChange={e => setVocabOverrideJson(e.target.value)}
                    />
                    {vocabOverrideError && <div style={{color: 'var(--accent-red)', fontSize: '0.8rem', marginTop: '8px'}}>{vocabOverrideError}</div>}
                    <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '12px'}}>
                      <button className="btn-primary" onClick={handleApplyVocabOverride}>Apply Vocab</button>
                    </div>
                  </div>
                ) : (
                  vocabList.length > 0 ? (
                    <div className="vocab-table-container custom-scrollbar" style={{overflowX: 'auto', backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px'}}>
                      {!isStudentView && (
                        <div style={{display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '0.85rem'}}>
                          <label style={{display: 'flex', alignItems: 'center', gap: '4px'}}><input type="checkbox" checked={vocabVisibility.showPos} onChange={() => setVocabVisibility(v => ({...v, showPos: !v.showPos}))}/> Show POS</label>
                          <label style={{display: 'flex', alignItems: 'center', gap: '4px'}}><input type="checkbox" checked={vocabVisibility.showDefinition} onChange={() => setVocabVisibility(v => ({...v, showDefinition: !v.showDefinition}))}/> Show Definition</label>
                          <label style={{display: 'flex', alignItems: 'center', gap: '4px'}}><input type="checkbox" checked={vocabVisibility.showKorean} onChange={() => setVocabVisibility(v => ({...v, showKorean: !v.showKorean}))}/> Show Korean</label>
                          <label style={{display: 'flex', alignItems: 'center', gap: '4px'}}><input type="checkbox" checked={vocabVisibility.showAssociation} onChange={() => setVocabVisibility(v => ({...v, showAssociation: !v.showAssociation}))}/> Show Association</label>
                        </div>
                      )}
                      <table className="custom-table" style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem'}}>
                        <thead>
                          <tr style={{borderBottom: '1px solid var(--border-color)'}}>
                            <th style={{padding: '8px'}}>Word</th>
                            <th style={{padding: '8px'}}>Part of Speech</th>
                            <th style={{padding: '8px'}}>Definition</th>
                            <th style={{padding: '8px'}}>Korean</th>
                            <th style={{padding: '8px'}}>Association</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vocabList.map((v, i) => (
                            <tr key={i} style={{borderBottom: '1px solid var(--border-color)'}}>
                              <td style={{padding: '8px'}}><strong>{v.word}</strong></td>
                              <td style={{padding: '8px'}}>{(!isStudentView || vocabVisibility.showPos) ? v.pos : <span style={{color: 'transparent', borderBottom: '1px solid var(--text-main)'}}>_______</span>}</td>
                              <td style={{padding: '8px'}}>{(!isStudentView || vocabVisibility.showDefinition) ? v.definition : <span style={{color: 'transparent', borderBottom: '1px solid var(--text-main)'}}>__________________</span>}</td>
                              <td style={{padding: '8px'}}>{(!isStudentView || vocabVisibility.showKorean) ? v.koreanTranslation : <span style={{color: 'transparent', borderBottom: '1px solid var(--text-main)'}}>_______</span>}</td>
                              <td style={{padding: '8px'}}>{(!isStudentView || vocabVisibility.showAssociation) ? v.wordAssociation : <span style={{color: 'transparent', borderBottom: '1px solid var(--text-main)'}}>_______</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p style={{color: 'var(--text-muted)'}}>No vocabulary generated yet. Use the Vocab Homework Maker tool.</p>
                )}
              </div>
            ) : null}

            {/* DEEP LEARNING MATRIX SECTION */}
            {(!isStudentView || (isStudentView && learningMatrix)) && isGenerated && (
              <div style={{marginTop: '32px', display: 'flex', flexDirection: 'column', flex: 1}}>
                <div className="sequence-header" style={{marginBottom: '16px'}}>
                  <div>
                    <div className="seq-kicker">COGNITION & SYNTHESIS</div>
                    <h3 className="seq-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      Deep-Learning Matrix
                    </h3>
                  </div>
                  {!isStudentView && !learningMatrix && material && (
                     <button className="btn-primary" onClick={() => handleOpenCalibrationModal('deep')} disabled={isLoadingMatrix} style={{padding: '6px 12px', fontSize: '0.75rem'}}>
                        {isLoadingMatrix ? 'GENERATING...' : 'Generate Matrix'}
                     </button>
                  )}
                </div>

                {learningMatrix ? renderMatrix() : <p style={{color: 'var(--text-muted)'}}>No learning matrix generated yet.</p>}
              </div>
            )}

            {/* CROSS-DISCIPLINARY MATRIX SECTION */}
            {(!isStudentView || (isStudentView && crossMatrix)) && isGenerated && (
              <div style={{marginTop: '32px', display: 'flex', flexDirection: 'column', flex: 1}}>
                <div className="sequence-header" style={{marginBottom: '16px'}}>
                  <div>
                    <div className="seq-kicker">INTERDISCIPLINARY INTEGRATION</div>
                    <h3 className="seq-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      Cross-Disciplinary Matrix
                    </h3>
                  </div>
                  {!isStudentView && !crossMatrix && material && (
                     <button className="btn-primary" onClick={() => handleOpenCalibrationModal('cross')} disabled={isLoadingCrossMatrix} style={{padding: '6px 12px', fontSize: '0.75rem'}}>
                        {isLoadingCrossMatrix ? 'GENERATING...' : 'Generate Matrix'}
                     </button>
                  )}
                </div>

                {crossMatrix ? (
                  <div className="matrix-container" style={{backgroundColor: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '16px', padding: '16px'}}>
                    <div style={{marginBottom: '16px'}}>
                      <h4 style={{color: 'var(--accent-red)', marginBottom: '8px'}}>Connection Overview</h4>
                      <p style={{fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.6'}}>{crossMatrix.connectionOverview}</p>
                    </div>
                    <div style={{marginBottom: '16px'}}>
                      <h4 style={{color: 'var(--accent-red)', marginBottom: '8px'}}>Discussion Questions</h4>
                      <ul style={{paddingLeft: '20px', margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.6'}}>
                        {crossMatrix.discussionQuestions.map((q, i) => <li key={i} style={{marginBottom: '8px'}}>{q}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 style={{color: 'var(--accent-red)', marginBottom: '8px'}}>Inquiry Activity</h4>
                      <p style={{fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.6'}}>{crossMatrix.inquiryActivity}</p>
                    </div>
                  </div>
                ) : <p style={{color: 'var(--text-muted)'}}>No cross-disciplinary matrix generated yet.</p>}
              </div>
            )}
          {/* column spacer so scrollbar can reach past last element */}
          <div style={{height:'6rem', flexShrink:0}} aria-hidden="true" />
          </div>

          {/* RIGHT COLUMN: TOOLS & FLOW */}
          <div className="workspace-right" style={{ display: isStudentView ? 'none' : 'block' }}>
            
            {/* AI TOOL HUB */}
            {!isStudentView && (
              <>
                <div className="sequence-header" style={{marginBottom: 16}}>
                  <div>
                    <div className="seq-kicker">AI TOOL HUB</div>
                    <h3 className="seq-title">Pedagogical Toolkit</h3>
                  </div>
                  <button className="icon-btn" onClick={() => setShowToolbox(true)} title="Manage Toolbox">
                    <LayoutList size={20} />
                  </button>
                </div>
                
                <div className="tool-hub-grid">
                  {ALL_AI_TOOLS.filter(t => favoriteTools.includes(t.id)).map(tool => (
                    <div key={tool.id} className="tool-card" style={{borderColor: tool.color}} onClick={() => openTool(tool)}>
                      <div className="tool-card-title">{tool.title}</div>
                      <div className="tool-card-desc">{tool.desc}</div>
                    </div>
                  ))}
                  {favoriteTools.length === 0 && (
                    <p style={{color: 'var(--text-muted)', fontSize: '0.85rem', gridColumn: '1 / -1'}}>No favorite tools. Click the icon above to manage toolbox.</p>
                  )}
                </div>

                <hr style={{borderColor: 'var(--border-color)', margin: '32px 0', borderStyle: 'solid'}}/>
              </>
            )}

            {/* CLASS FLOW */}
            <div className="sequence-header">
              <div>
                <div className="seq-kicker">INTERACTIVE SEQUENCE</div>
                <h3 className="seq-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  12-Step Roadmap
                  {!isStudentView && (
                    <button 
                      className="icon-btn" 
                      onClick={() => setShowOverrideInput(!showOverrideInput)} 
                      title="Manual Override / Paste AI Plan"
                      style={{color: showOverrideInput ? 'var(--accent-red)' : 'var(--text-muted)'}}
                    >
                      <PenTool size={16} />
                    </button>
                  )}
                </h3>
              </div>
              {isGenerated && (
                <div className="progress-ring-container" style={{padding: '8px 16px', margin: 0}}>
                  <div className="progress-ring" style={{width: 40, height: 40}}><svg style={{width: 40, height: 40}}><circle className="progress-ring-bg" cx="20" cy="20" r="16"></circle><circle className="progress-ring-fill" cx="20" cy="20" r="16" style={{ strokeDasharray: 100.53, strokeDashoffset: 100.53 - (progressPercentage/100)*100.53 }}></circle></svg><div className="progress-ring-text" style={{fontSize: '0.65rem'}}>{Math.round(progressPercentage)}%</div></div>
                </div>
              )}
            </div>

            {showOverrideInput ? (
              <div style={{padding: '16px', backgroundColor: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px'}}>
                <label style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block'}}>Manual Override / Paste AI Plan JSON</label>
                <textarea 
                  className="custom-input custom-scrollbar" 
                  style={{minHeight: '200px', resize: 'vertical', fontSize: '0.85rem', fontFamily: 'monospace', width: '100%'}}
                  placeholder='Paste the JSON from external AI here...'
                  value={overrideJson}
                  onChange={e => setOverrideJson(e.target.value)}
                />
                {overrideError && <div style={{color: 'var(--accent-red)', fontSize: '0.8rem', marginTop: '8px'}}>{overrideError}</div>}
                <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '12px'}}>
                  <button className="btn-primary" onClick={handleApplyOverride}>Apply Custom Plan</button>
                </div>
              </div>
            ) : (
              isGenerated ? activeSteps.map(step => {
                const status = stepStatus[step.num];
                return (
                  <div className={`task-card ${status || ''}`} key={step.num}>
                    <div className="task-header">
                      <div className="task-title">
                        {step.num}. {step.title}
                        {step.duration && <span style={{fontSize: '0.75rem', color: 'var(--accent-red)', marginLeft: '8px', fontWeight: 'normal'}}>{step.duration}</span>}
                      </div>
                      {!isStudentView && (
                        <div className="task-actions" data-html2canvas-ignore="true">
                          <button className="task-btn check-btn" onClick={() => handleStepAction(step.num, 'checked')}><Check size={14} /></button>
                          <button className="task-btn pass-btn" onClick={() => handleStepAction(step.num, 'passed')}><X size={14} /></button>
                        </div>
                      )}
                    </div>
                    <div className="task-meta"><span style={{whiteSpace: 'pre-line'}} className="meta-val">{step.desc}</span></div>
                  </div>
                );
              }) : <p style={{color: 'var(--text-muted)'}}>Upload material to unlock flow.</p>
            )}

            {/* SCORING & EXPORT */}
            {!isStudentView && (
              <>
                <hr style={{borderColor: 'var(--border-color)', margin: '32px 0', borderStyle: 'solid'}}/>
                <div className="seq-kicker">END OF DAY LOGGING</div>
                <h3 className="seq-title" style={{marginBottom: '16px'}}>Scoring & Export</h3>
                
                <div className="score-input-group" style={{marginBottom: 16}}>
                  <label>Assignment Score</label>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <input type="number" min="0" className="custom-input score-small" value={scores.assignment.acquired} onChange={e => setScores({...scores, assignment: {...scores.assignment, acquired: e.target.value}})} placeholder="Acq"/>
                    <span style={{fontSize: '1.2rem', color: 'var(--text-muted)'}}>/</span>
                    <input type="number" min="0" className="custom-input score-small" value={scores.assignment.total} onChange={e => setScores({...scores, assignment: {...scores.assignment, total: e.target.value}})} placeholder="Tot"/>
                  </div>
                </div>
                <div className="score-input-group" style={{marginBottom: 16}}>
                  <label>Vocab Assignment Score</label>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <input type="number" min="0" className="custom-input score-small" value={scores.vocabAssignment.acquired} onChange={e => setScores({...scores, vocabAssignment: {...scores.vocabAssignment, acquired: e.target.value}})} placeholder="Acq"/>
                    <span style={{fontSize: '1.2rem', color: 'var(--text-muted)'}}>/</span>
                    <input type="number" min="0" className="custom-input score-small" value={scores.vocabAssignment.total} onChange={e => setScores({...scores, vocabAssignment: {...scores.vocabAssignment, total: e.target.value}})} placeholder="Tot"/>
                  </div>
                </div>
                <div className="score-input-group" style={{marginBottom: 16}}>
                  <label>Vocab Quiz Score</label>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <input type="number" min="0" className="custom-input score-small" value={scores.vocabQuiz.acquired} onChange={e => setScores({...scores, vocabQuiz: {...scores.vocabQuiz, acquired: e.target.value}})} placeholder="Acq"/>
                    <span style={{fontSize: '1.2rem', color: 'var(--text-muted)'}}>/</span>
                    <input type="number" min="0" className="custom-input score-small" value={scores.vocabQuiz.total} onChange={e => setScores({...scores, vocabQuiz: {...scores.vocabQuiz, total: e.target.value}})} placeholder="Tot"/>
                  </div>
                </div>
                
                <div className="activities-scoring">
                  <label>Activities / Module Scores</label>
                  {activities.map((activity, index) => (
                    <div className="activity-row" key={activity.id} style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
                      <input type="text" className="custom-input activity-input" style={{flex: 1}} placeholder="Task Title" value={activity.title} onChange={e => updateActivity(activity.id, 'title', e.target.value)}/>
                      <input type="number" min="0" className="custom-input score-small" style={{width: '60px'}} placeholder="Acq" value={activity.acquired} onChange={e => updateActivity(activity.id, 'acquired', e.target.value)}/>
                      <span style={{color: 'var(--text-muted)'}}>/</span>
                      <input type="number" min="0" className="custom-input score-small" style={{width: '60px'}} placeholder="Tot" value={activity.total} onChange={e => updateActivity(activity.id, 'total', e.target.value)}/>
                      {activities.length > 1 && <button className="icon-btn" onClick={() => handleRemoveActivity(activity.id)}><Trash2 size={16} /></button>}
                      {index === activities.length - 1 && <button className="icon-btn" onClick={handleAddActivity}><Plus size={16} /></button>}
                    </div>
                  ))}
                </div>

                <div style={{marginBottom: '16px', marginTop: '16px'}}>
                  <label style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block'}}>Teacher's Session Notes (Internal)</label>
                  <textarea 
                    className="custom-input custom-scrollbar" 
                    placeholder="Log qualitative observations about the student's performance..."
                    value={sessionNotes}
                    onChange={e => setSessionNotes(e.target.value)}
                    style={{width: '100%', minHeight: '100px', resize: 'vertical', fontSize: '0.85rem'}}
                  />
                </div>

                {!pdfFailed ? (
                  <button className="btn-primary" onClick={handleDownload} style={{marginTop: '24px'}} disabled={!isGenerated}>
                    <Download size={16} /> Download Daily Report (PDF)
                  </button>
                ) : (
                  <button className="btn-primary" onClick={triggerReportFallback} style={{marginTop: '24px', backgroundColor: 'var(--accent-red)'}}>
                    <AlertCircle size={16} style={{marginRight: '8px'}} /> Export Failed - Generate via AI Override
                  </button>
                )}
              </>
            )}

            {/* right-column spacer so scrollbar reaches past the Download button */}
            <div style={{height:'6rem', flexShrink:0}} aria-hidden="true" />
          </div>
        </div>

        {/* PRINT LAYOUT COMPONENT */}
        <div className="print-layout-wrapper">
           <PrintLayout 
             ref={printRef}
             studentName={studentName}
             date={classDate || new Date().toLocaleDateString()}
             timeRange={classStartTime && classEndTime ? `${classStartTime} - ${classEndTime}` : ''}
             grade={grade}
             proficiency={proficiency}
             duration={duration}
             skills={selectedSkills.map(s => `${s.category} (${s.microSkills.length})`)}
             material={material}
             roadmapText={editableRoadmapSteps.map((step, i) => `${i+1}. ${step}`).join('\n\n')}
             learningMatrix={learningMatrix}
             crossMatrix={crossMatrix}
             aiFinalFeedback={aiFinalFeedback}
             scores={scores}
             activities={activities}
             errors={errorMemory}
             sessionNotes={sessionNotes}
             vocabList={vocabList}
             vocabVisibility={vocabVisibility}
           />
        </div>

      </main>
    </div>
  );
}
