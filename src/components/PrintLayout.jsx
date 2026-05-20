import React, { forwardRef } from 'react';

const PrintLayout = forwardRef(({ studentName, date, grade, proficiency, duration, skills, material, checkedSteps, scores, activities, errors }, ref) => {
  return (
    <div ref={ref} className="print-layout">
      <div className="print-header">
        <h1>Reading to Writing Daily Report</h1>
        <div className="print-meta">
          <div><strong>Student:</strong> {studentName}</div>
          <div><strong>Date:</strong> {date}</div>
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
        <h2>Completed Class Flow Steps</h2>
        <ul className="print-list">
          {checkedSteps.length > 0 ? checkedSteps.map((step, i) => <li key={i}>{step}</li>) : <li>No steps completed.</li>}
        </ul>
      </div>

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
    </div>
  );
});

export default PrintLayout;
