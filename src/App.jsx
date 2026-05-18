import { useState, useRef, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { 
  Grid, Calendar, Lock, Moon, Sun, Unlock, Settings, Eye, EyeOff,
  Map, BookA, Download, PenTool, CheckCircle,
  Check, X, UploadCloud, ScrollText, TableProperties, Plus, Trash2,
  Languages, Mic2, AlertCircle, Play, Pause, RotateCcw, Key, 
  BarChart, Target, FileText, LayoutList, BookOpen, MessageCircle, TextSelect, Trash
} from 'lucide-react';
import { useGeminiQuery } from './hooks/useGeminiQuery';
import { useLocalStorageState } from './hooks/useLocalStorageState';
import { encryptData, decryptData } from './utils/crypto';
import { useAILogger } from './contexts/AILoggerContext';
import PrintLayout from './components/PrintLayout';
import ToolErrorBoundary from './components/ToolErrorBoundary';
import { ThesisSchema, CrossLingualSchema, PeerSchema, QuizSchema, SummarySchema } from './utils/schemas';
import './App.css';

const GRADE_LEVELS = ['Elementary (Grades K-2)', 'Upper Elementary (Grades 3-5)', 'Middle School (Grades 6-8)', 'High School (Grades 9-12)', 'Higher Education', 'Adult Learner'];
const PROFICIENCIES = ['Beginner (A1-A2)', 'Intermediate (B1-B2)', 'Advanced (C1-C2)', 'Native / Fluent'];
const DURATIONS = ['25 Minutes', '50 Minutes (1 Hour)', '100 Minutes (2 Hours)'];
const SKILLS = ['Connections', 'Predicting', 'Visualizing', 'Inferencing', 'Questioning', 'Comprehension', 'Text Navigation', 'Main Idea & Detail', 'Critical Analysis', 'Digital Literacy', 'Information Processing', 'Study Methods', 'Summarization', 'Structure', 'Coherence', 'Expression'];

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
  const [selectedSkills, setSelectedSkills] = useLocalStorageState(`${sessionKey}_skills`, [SKILLS[3]]);
  const [material, setMaterial] = useLocalStorageState(`${sessionKey}_mat`, '');
  const [isGenerated, setIsGenerated] = useLocalStorageState(`${sessionKey}_gen`, false);
  const [generatedSteps, setGeneratedSteps] = useLocalStorageState(`${sessionKey}_gen_steps`, []);
  const [stepStatus, setStepStatus] = useLocalStorageState(`${sessionKey}_steps`, {});
  const [scores, setScores] = useLocalStorageState(`${sessionKey}_scores`, { assignment: '', vocabAssignment: '', vocabQuiz: '' });
  const [activities, setActivities] = useLocalStorageState(`${sessionKey}_acts`, [{ id: Date.now(), title: '', score: '' }]);
  
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
    setScores({ assignment: '', vocabAssignment: '', vocabQuiz: '' });
    setActivities([{ id: Date.now(), title: '', score: '' }]);
    setTimerSeconds(0);
    setIsTimerRunning(false);
    setShowClearConfirm(false);
  };

  const handleTextSelection = () => {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      setToolInput(selectedText);
    } else {
      setToolInput(material);
    }
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
    const prompt = `Output JSON strictly formatted as: { "steps": [ { "num": 1, "title": "...", "duration": "...", "desc": "..." } ] }. Create a highly detailed, 12-step pedagogical lesson plan for a ${grade} student with ${proficiency} proficiency. The class duration is ${duration}. The target skills are: ${selectedSkills.join(', ')}. Break down the ${duration} total time across the 12 steps, detailing exactly how many minutes each step should take in the 'duration' field. The 'desc' must be a detailed, minute-by-minute guide. ${material ? 'The reading material is: ' + material : 'Provide a generalized lesson flow for these skills without specific reading material.'}`;
    
    const result = await executeQuery(apiKey, prompt, material || 'No specific material', false);
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
    
    alert("Failed to generate dynamic lesson plan. Falling back to default template.");
    setGeneratedSteps(DAILY_FLOW_STEPS);
    setIsGenerated(true);
    setStepStatus({});
  };

  const toggleSkill = (skill) => setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  const handleStepAction = (num, action) => setStepStatus(prev => ({ ...prev, [num]: prev[num] === action ? null : action }));
  const handleAddActivity = () => setActivities(prev => [...prev, { id: Date.now(), title: '', score: '' }]);
  const handleRemoveActivity = (id) => setActivities(prev => prev.filter(a => a.id !== id));
  const updateActivity = (id, field, value) => setActivities(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));

  const handleDownload = () => {
    const safeName = studentName.replace(/[^a-z0-9]/gi, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const opt = {
      margin:       0.5,
      filename:     `Reading_to_Writing_Report_${safeName}_${dateStr}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(printRef.current).save();
  };

  // TOOL ENGINE
  const openTool = (title, desc, prefix, type = 'GENERIC') => {
    setActiveTool({ title, desc, promptPrefix: prefix });
    setToolType(type);
    
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
    const result = await executeQuery(apiKey, activeTool.promptPrefix, toolInput, isErrorLogger);
    if (result) setToolOutput(result);
  };

  // Parse Outputs Based on Type
  const renderToolOutput = () => {
    if (!toolOutput) return null;

    if (toolType === 'GENERIC' || !toolOutput.trim().startsWith('{')) {
      return <div className="llm-output-box">{toolOutput}</div>;
    }

    try {
      const rawData = JSON.parse(toolOutput);

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
                <label className="dropdown-label">ADMIN: TARGET SKILLS</label>
                <div className="skills-checklist-container" style={{maxHeight: '120px'}}>
                  {SKILLS.map(s => (
                    <label key={s} className="skills-checklist-label">
                      <input 
                        type="checkbox" 
                        checked={selectedSkills.includes(s)}
                        onChange={() => toggleSkill(s)}
                      />
                      {s}
                    </label>
                  ))}
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
            {!isStudentView && <div className="info-row"><strong>Skills:</strong> {selectedSkills.join(', ') || 'None'}</div>}
            <div className="info-row"><strong>Time:</strong> {currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
          </div>
        </header>

        <div className="workspace-grid" style={{gridTemplateColumns: isStudentView ? '1fr' : '1fr 1fr'}}>
          {/* LEFT COLUMN: LIVE TEXT */}
          <div className="workspace-left" style={{borderRight: isStudentView ? 'none' : '1px solid var(--border-color)'}}>
            <div className="seq-kicker">LIVE TEXT</div>
            <h3 className="seq-title" style={{marginBottom: '16px'}}>Reading Material</h3>
            {!isGenerated ? (
              <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
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
              <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                <div className="llm-output-box" style={{flex: 1, overflowY: 'auto', backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)'}} onMouseUp={handleTextSelection}>
                  {material}
                </div>
                {!isStudentView && <div className="highlight-hint"><TextSelect size={14} /> Highlight text to auto-fill AI tools</div>}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: TOOLS & FLOW */}
          <div className="workspace-right">
            
            {/* AI TOOL HUB */}
            {!isStudentView && (
              <>
                <div className="seq-kicker">AI TOOL HUB</div>
                <h3 className="seq-title">Pedagogical Toolkit</h3>
                
                <div className="tool-hub-grid">
                  <div className="tool-card" style={{borderColor: '#8b5cf6'}} onClick={() => openTool('Thesis Generator', 'Generate 3 tiered thesis options.', 'Output JSON strictly formatted as: { "theses": [ { "level": "baseline", "statement": "...", "args": ["...","..."] }, { "level": "intermediate", "statement": "...", "args": ["...","..."] }, { "level": "advanced", "statement": "...", "args": ["...","..."] } ] }. Based on this text:', 'THESIS')}>
                    <div className="tool-card-title">Thesis Generator</div>
                    <div className="tool-card-desc">Tiered thesis statements & arguments.</div>
                  </div>

                  <div className="tool-card" style={{borderColor: '#8b5cf6'}} onClick={() => openTool('Instant Translator / Idiom Decoder', 'Cross-lingual vocabulary breakdown.', `Output JSON strictly formatted as: { "items": [ { "original": "...", "literal": "...", "synonym": "...", "korean": "..." } ] }. Find 3-5 complex idioms or difficult words matching a ${proficiency} student in this text:`, 'CROSS_LINGUAL')}>
                    <div className="tool-card-title">Cross-Lingual Decoder</div>
                    <div className="tool-card-desc">Literal, synonym, & Korean equivalents.</div>
                  </div>

                  <div className="tool-card" style={{borderColor: '#8b5cf6'}} onClick={() => openTool('Peer-Review Engine', 'Generate Glows and Grows.', 'Output JSON strictly formatted as: { "glows": ["...","..."], "grows": ["...","..."] }. Evaluate this draft paragraph specifically considering the student\'s recent error history:', 'PEER')}>
                    <div className="tool-card-title">Peer-Review Sandbox</div>
                    <div className="tool-card-desc">Compare draft against rubric & error history.</div>
                  </div>

                  <div className="tool-card" style={{borderColor: '#8b5cf6'}} onClick={() => openTool('Quiz Generator', 'Dynamic multi-format quiz.', `Output JSON strictly formatted as: { "quiz": { "mcq": [{"question": "...", "answer": "..."}], "cloze": [{"question": "...", "answer": "..."}], "open": [{"question": "..."}] } }. Generate 2 MCQ, 2 Cloze, and 1 Open-ended question for a ${proficiency} student based on this text:`, 'QUIZ')}>
                    <div className="tool-card-title">Dynamic Quiz</div>
                    <div className="tool-card-desc">MCQ, Cloze, and Open-ended questions.</div>
                  </div>

                  <div className="tool-card" style={{borderColor: '#3b82f6'}} onClick={() => openTool('Summary Synthesizer', 'Synthesize tiered summaries.', 'Output JSON strictly formatted as: { "tiers": { "beginner": "Cloze format summary...", "intermediate": "Sentence starter framework...", "advanced": "Inquiry outline format..." } }. Summarize this text:', 'SUMMARY')}>
                    <div className="tool-card-title">Summary Synthesizer</div>
                    <div className="tool-card-desc">Tiered scaffolding for summarizing.</div>
                  </div>

                  <div className="tool-card" style={{borderColor: 'var(--accent-red)'}} onClick={() => openTool('Error Correction Logger', 'Track student errors.', 'You are an error correction logger. Review these student errors, categorize them, and output concise teacher feedback.')}>
                    <div className="tool-card-title">Error Logger</div>
                    <div className="tool-card-desc">Track errors. Feeds into AI memory!</div>
                  </div>
                </div>

                <hr style={{borderColor: 'var(--border-color)', margin: '32px 0', borderStyle: 'solid'}}/>
              </>
            )}

            {/* CLASS FLOW */}
            <div className="sequence-header">
              <div>
                <div className="seq-kicker">INTERACTIVE SEQUENCE</div>
                <h3 className="seq-title">12-Step Roadmap</h3>
              </div>
              {isGenerated && (
                <div className="progress-ring-container" style={{padding: '8px 16px', margin: 0}}>
                  <div className="progress-ring" style={{width: 40, height: 40}}><svg style={{width: 40, height: 40}}><circle className="progress-ring-bg" cx="20" cy="20" r="16"></circle><circle className="progress-ring-fill" cx="20" cy="20" r="16" style={{ strokeDasharray: 100.53, strokeDashoffset: 100.53 - (progressPercentage/100)*100.53 }}></circle></svg><div className="progress-ring-text" style={{fontSize: '0.65rem'}}>{Math.round(progressPercentage)}%</div></div>
                </div>
              )}
            </div>

            {isGenerated ? activeSteps.map(step => {
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
            }) : <p style={{color: 'var(--text-muted)'}}>Upload material to unlock flow.</p>}

            {/* SCORING & EXPORT */}
            {!isStudentView && (
              <>
                <hr style={{borderColor: 'var(--border-color)', margin: '32px 0', borderStyle: 'solid'}}/>
                <div className="seq-kicker">END OF DAY LOGGING</div>
                <h3 className="seq-title" style={{marginBottom: '16px'}}>Scoring & Export</h3>
                
                <div className="score-input-group" style={{marginBottom: 16}}><label>Assignment Score</label><input type="text" className="custom-input" value={scores.assignment} onChange={e => setScores({...scores, assignment: e.target.value})}/></div>
                <div className="score-input-group" style={{marginBottom: 16}}><label>Vocab Assignment Score</label><input type="text" className="custom-input" value={scores.vocabAssignment} onChange={e => setScores({...scores, vocabAssignment: e.target.value})}/></div>
                <div className="score-input-group" style={{marginBottom: 16}}><label>Vocab Quiz Score</label><input type="text" className="custom-input" value={scores.vocabQuiz} onChange={e => setScores({...scores, vocabQuiz: e.target.value})}/></div>
                
                <div className="activities-scoring">
                  <label>Activities / Module Scores</label>
                  {activities.map((activity, index) => (
                    <div className="activity-row" key={activity.id}>
                      <input type="text" className="custom-input activity-input" placeholder="Task Title" value={activity.title} onChange={e => updateActivity(activity.id, 'title', e.target.value)}/>
                      <input type="text" className="custom-input score-small" placeholder="Score" value={activity.score} onChange={e => updateActivity(activity.id, 'score', e.target.value)}/>
                      {activities.length > 1 && <button className="icon-btn" onClick={() => handleRemoveActivity(activity.id)}><Trash2 size={16} /></button>}
                      {index === activities.length - 1 && <button className="icon-btn" onClick={handleAddActivity}><Plus size={16} /></button>}
                    </div>
                  ))}
                </div>

                <button className="btn-primary" onClick={handleDownload} style={{marginTop: '24px'}} disabled={!isGenerated}>
                  <Download size={16} /> Download Daily Report (PDF)
                </button>
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
             skills={selectedSkills}
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
