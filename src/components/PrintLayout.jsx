import React, { forwardRef } from 'react';

const PrintLayout = forwardRef(({ studentName, date, timeRange, grade, proficiency, duration, skills, material, roadmapText, learningMatrix, crossMatrix, aiFinalFeedback, scores, activities, errors, sessionNotes, vocabList, vocabVisibility }, ref) => {
  return (
    <div ref={ref} className="print-layout">
      <div className="print-header">
        <h1>Reading to Writing Daily Report</h1>
        <div className="print-meta">
          <div><strong>Student:</strong> {studentName}</div>
          <div><strong>Date:</strong> {date}{timeRange ? ` (${timeRange})` : ''}</div>
          <div><strong>Level:</strong> {grade} - {proficiency}</div>
          <div><strong>Duration:</strong> {duration}</div>
          <div><strong>Target Skills:</strong> {skills.join(', ')}</div>
        </div>
      </div>
      
      <div className="print-section">
        <h2>Reading Material</h2>
        <p className="print-material-text">{material || "No material defined."}</p>
      </div>

      <div className="print-section">
        <h2>Class Flow & Roadmap</h2>
        <div className="print-roadmap-text" style={{whiteSpace: 'pre-wrap', fontSize: '0.85rem', lineHeight: '1.4'}}>
          {roadmapText || "No roadmap defined."}
        </div>
      </div>

      {learningMatrix && learningMatrix.columns && (
        <div className="print-section" style={{pageBreakInside: 'avoid'}}>
          <h2>Deep Learning Matrix</h2>
          <table className="print-table" style={{fontSize: '0.75rem', marginTop: '8px'}}>
            <thead>
              <tr>
                {learningMatrix.columns.map((col, idx) => (
                  <th key={idx}>{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {learningMatrix.rows && learningMatrix.rows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {learningMatrix.columns.map((col, colIdx) => {
                    const cellData = row[col.id] || '';
                    return (
                      <td key={colIdx} style={{verticalAlign: 'top'}}>
                        {Array.isArray(cellData) ? (
                          <ul style={{paddingLeft: '16px', margin: 0}}>
                            {cellData.map((item, i) => <li key={i}>{item}</li>)}
                          </ul>
                        ) : (
                          cellData
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {crossMatrix && crossMatrix.sequences && (
        <div className="print-section">
          <h2>Cross-Disciplinary Integration Matrix</h2>
          {crossMatrix.sequences.map((seq, idx) => (
            <div key={idx} style={{marginTop: '16px', fontSize: '0.85rem', borderBottom: idx < crossMatrix.sequences.length - 1 ? '1px solid #eee' : 'none', paddingBottom: '16px', pageBreakInside: 'avoid'}}>
              <h3 style={{fontSize: '1rem', marginBottom: '12px'}}>{seq.sequenceId}: {seq.sequenceTitle}</h3>
              <div style={{marginBottom: '12px'}}>
                <strong>Connection Overview:</strong>
                <p style={{marginTop: '4px'}}>{seq.connectionOverview}</p>
              </div>
              <div style={{marginBottom: '12px'}}>
                <strong>Discussion Questions:</strong>
                <ul style={{marginTop: '4px', paddingLeft: '20px'}}>
                  {seq.discussionQuestions.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </div>
              <div>
                <strong>Inquiry Activity:</strong>
                <p style={{marginTop: '4px'}}>{seq.inquiryActivity}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="print-section">
        <h2>Scores & Activities</h2>
        <table className="print-table">
          <tbody>
            <tr><td style={{width: '60%'}}><strong>Assignment Score</strong></td><td>{(!scores.assignment.acquired && !scores.assignment.total) ? '-' : `${scores.assignment.acquired || 0}/${scores.assignment.total || 0} (${Math.round(((scores.assignment.acquired || 0)/(scores.assignment.total || 1))*100)}%)`}</td></tr>
            <tr><td><strong>Vocab Assignment Score</strong></td><td>{(!scores.vocabAssignment.acquired && !scores.vocabAssignment.total) ? '-' : `${scores.vocabAssignment.acquired || 0}/${scores.vocabAssignment.total || 0} (${Math.round(((scores.vocabAssignment.acquired || 0)/(scores.vocabAssignment.total || 1))*100)}%)`}</td></tr>
            <tr><td><strong>Vocab Quiz Score</strong></td><td>{(!scores.vocabQuiz.acquired && !scores.vocabQuiz.total) ? '-' : `${scores.vocabQuiz.acquired || 0}/${scores.vocabQuiz.total || 0} (${Math.round(((scores.vocabQuiz.acquired || 0)/(scores.vocabQuiz.total || 1))*100)}%)`}</td></tr>
            {activities.filter(a => a.title).map((a, i) => (
              <tr key={i}><td><strong>{a.title}</strong></td><td>{(!a.acquired && !a.total) ? '-' : `${a.acquired || 0}/${a.total || 0} (${Math.round(((a.acquired || 0)/(a.total || 1))*100)}%)`}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="print-section" style={{pageBreakInside: 'avoid'}}>
        <h2>Logged Errors & Feedback</h2>
        <ul className="print-list">
          {errors.length > 0 ? errors.map((err, i) => (
            <li key={i} style={{marginBottom: '8px'}}>
              <strong>{err.toolName}:</strong> {err.input.substring(0, 150)}{err.input.length > 150 ? '...' : ''}
            </li>
          )) : <li>No errors logged today.</li>}
        </ul>
      </div>

      {sessionNotes && (
        <div className="print-section" style={{pageBreakInside: 'avoid'}}>
          <h2>Instructor Observations</h2>
          <blockquote style={{fontStyle: 'italic', borderLeft: '3px solid #ccc', paddingLeft: '12px', color: '#555', margin: '16px 0'}}>
            <p style={{whiteSpace: 'pre-line', margin: 0}}>{sessionNotes}</p>
          </blockquote>
        </div>
      )}

      {aiFinalFeedback && (
        <div className="print-section" style={{pageBreakInside: 'avoid', backgroundColor: 'rgba(74, 222, 128, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid #4ade80'}}>
          <h2 style={{color: '#2e7d32'}}>Final Student Feedback</h2>
          <p style={{whiteSpace: 'pre-wrap', margin: 0, fontSize: '0.9rem', lineHeight: '1.5', color: '#111'}}>
            {aiFinalFeedback}
          </p>
        </div>
      )}

      {vocabList && vocabList.length > 0 && (
        <div className="print-section" style={{pageBreakInside: 'avoid'}}>
          <h2>Homework: Vocabulary List</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Word</th>
                {vocabVisibility?.showPos && <th>Part of Speech</th>}
                {vocabVisibility?.showDefinition && <th>Definition</th>}
                {vocabVisibility?.showKorean && <th>Korean</th>}
                {vocabVisibility?.showAssociation && <th>Association</th>}
              </tr>
            </thead>
            <tbody>
              {vocabList.map((v, i) => (
                <tr key={i}>
                  <td><strong>{v.word}</strong></td>
                  {vocabVisibility?.showPos && <td>{v.pos}</td>}
                  {vocabVisibility?.showDefinition && <td>{v.definition}</td>}
                  {vocabVisibility?.showKorean && <td>{v.koreanTranslation}</td>}
                  {vocabVisibility?.showAssociation && <td>{v.wordAssociation}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

export default PrintLayout;
