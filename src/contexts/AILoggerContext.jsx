import React, { createContext, useState, useContext } from 'react';

const AILoggerContext = createContext();

export const AILoggerProvider = ({ children }) => {
  const [errorMemory, setErrorMemory] = useState([]);

  const logError = (toolName, input, output) => {
    setErrorMemory(prev => [...prev, { timestamp: new Date().toISOString(), toolName, input, output }]);
  };

  const getErrorContextString = () => {
    if (errorMemory.length === 0) return "No prior errors logged in this session.";
    return errorMemory.slice(-5).map(e => `[${e.toolName}]: Input: "${e.input.substring(0, 50)}..." -> Feedback: "${e.output.substring(0, 100)}..."`).join('\n');
  };

  return (
    <AILoggerContext.Provider value={{ errorMemory, logError, getErrorContextString, setErrorMemory }}>
      {children}
    </AILoggerContext.Provider>
  );
};

export const useAILogger = () => useContext(AILoggerContext);
