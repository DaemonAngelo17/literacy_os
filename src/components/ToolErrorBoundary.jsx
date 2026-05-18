import React from 'react';

class ToolErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Tool Runtime Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="llm-output-box" style={{ borderColor: 'var(--accent-red)', backgroundColor: 'rgba(229, 57, 53, 0.1)' }}>
          <h4 style={{ color: 'var(--accent-red)', marginBottom: '8px' }}>⚠️ Output Render Failed</h4>
          <p style={{ fontSize: '0.85rem' }}>The AI returned a response that could not be processed correctly. This might be a hallucinated format.</p>
          <details style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <summary>Error Details</summary>
            {this.state.errorMessage}
          </details>
          <button 
            className="btn-primary" 
            style={{ marginTop: '12px', padding: '4px 8px', fontSize: '0.8rem' }}
            onClick={() => this.setState({ hasError: false })}
          >
            Clear Error & Try Again
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ToolErrorBoundary;
