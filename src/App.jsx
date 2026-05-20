import { useState, useRef, useEffect } from 'react';
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
  { id: 'vocab', title: 'Vocab Homework Maker', desc: 'Extract contextual academic vocabulary.', promptPrefix: () => `Output ONLY a raw JSON array. No markdown, no conversational text. Extract up to 42 high-value academic vocabulary words from this text in this format: [{ "word": "example", "pos": "noun", "definition": "A representative form or pattern.", "koreanTranslation": "예시", "wordAssociation": "model, sample" }]. Text:`, type: 'VOCAB', color: '#10b981' },
  { id: 'error', title: 'Error Logger', desc: 'Track errors. Feeds into AI memory!', promptPrefix: () => 'You are an error correction logger. Review these student errors, categorize them, and output concise teacher feedback.', type: 'GENERIC', color: 'var(--accent-red)' }
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
  
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
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
  };

  const handleTextSelection = () => {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      setToolInput(selectedText);
    } else {
      setToolInput(material);
    }
  };

  const triggerToolFallback = (toolName, instruction, formatRule) => {
    let fallbackPrompt;
    if (toolName === 'Vocab Homework Maker') {
      fallbackPrompt = `Act as an expert ESL linguist. My system failed, and I need you to extract up to 42 high-value academic vocabulary words from the text below. 
SOURCE TEXT: ${toolInput || material || 'None'}
STRICT FORMATTING RULE: Output ONLY a raw JSON array. No markdown, no conversational text. 
SCHEMA: 
[
  { 
    "word": "example", 
    "pos": "noun", 
    "definition": "A representative form or pattern.", 
    "koreanTranslation": "예시", 
    "wordAssociation": "model, sample" 
  }
]`;
    } else {
      const skillListStr = selectedSkills.map(s => `${s.category} (${s.microSkills.join(', ')})`).join('; ');
      fallbackPrompt = `Act as an expert ELA instructional designer. My automated system failed, and I need you to perform the function of the ${toolName} for my class. 
STUDENT PROFILE: ${studentName}
GRADE LEVEL: ${grade}
PROFICIENCY: ${proficiency}
TARGET SKILLS: ${skillListStr || 'None specified'}
SOURCE TEXT: ${toolInput || material || 'None'}
STUDENT'S RECENT ERRORS: ${JSON.stringify(errorMemory)}
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
    const prompt = `Output JSON strictly formatted as: { "steps": [ { "num": 1, "title": "...", "duration": "...", "desc": "..." } ] }. Create a highly detailed, 12-step pedagogical lesson plan for a ${grade} student with ${proficiency} proficiency. The class duration is ${duration}. The target skills are: ${skillListStr}. Break down the ${duration} total time across the 12 steps, detailing exactly how many minutes each step should take in the 'duration' field. The 'desc' must be a detailed, minute-by-minute guide. ${material ? 'The reading material is: ' + material : 'Provide a generalized lesson flow for these skills without specific reading material.'}`;
    
    const result = await executeQuery(apiKey, prompt, material || 'No specific material', false, selectedSkills);
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

  const handleDownload = async () => {
    try {
      const safeName = studentName.replace(/[^a-z0-9]/gi, '_');
      const dateStr = new Date().toISOString().split('T')[0];
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
    const result = await executeQuery(apiKey, activeTool.promptPrefix, toolInput, isErrorLogger, selectedSkills);
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
              <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '16px'}}>
                <button className="btn-primary" onClick={() => navigator.clipboard.writeText(failSafeModal.promptContent)} style={{backgroundColor: 'var(--accent-red)'}}>
                  Copy to Clipboard
                </button>
              </div>
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
              <div className="tag">Student <strong>{studentName}</strong></div>
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
              <div style={{flex: 1, display: 'flex', flexDirection: 'column', minHeight: '300px'}}>
                <textarea 
                  className="textarea-gen"
                  placeholder="Paste the reading material here (Optional)..."
                  value={material}
                  onChange={e => setMaterial(e.target.value)}
                  readOnly={isStudentView}
                  style={{ flex: 1, marginBottom: '16px' }}
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
                <div className="sequence-header" style={{marginBottom: '16px'}}>
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
          </div>

          {/* RIGHT COLUMN: TOOLS & FLOW */}
          <div className="workspace-right">
            
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

          </div>
        </div>

        {/* PRINT LAYOUT COMPONENT */}
        <div className="print-layout-wrapper">
           <PrintLayout 
             ref={printRef}
             studentName={studentName}
             date={new Date().toLocaleDateString()}
             grade={grade}
             proficiency={proficiency}
             duration={duration}
             skills={selectedSkills.map(s => `${s.category} (${s.microSkills.length})`)}
             material={material}
             checkedSteps={activeSteps.filter(s => stepStatus[s.num] === 'checked').map(s => `${s.num}. ${s.title}`)}
             scores={scores}
             activities={activities}
             errors={errorMemory}
           />
        </div>

      </main>
    </div>
  );
}
