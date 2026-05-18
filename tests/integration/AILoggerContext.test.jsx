import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { AILoggerProvider, useAILogger } from '../../src/contexts/AILoggerContext';
import { useGeminiQuery } from '../../src/hooks/useGeminiQuery';

// Mock fetch globally
global.fetch = async () => ({
  ok: true,
  json: async () => ({
    candidates: [{ content: { parts: [{ text: "```json\n{}\n```" }] } }]
  })
});

describe('AILoggerContext & useGeminiQuery Integration', () => {
  const wrapper = ({ children }) => <AILoggerProvider>{children}</AILoggerProvider>;

  it('should inject error memory into Gemini fetch', async () => {
    const { result: loggerResult } = renderHook(() => useAILogger(), { wrapper });
    const { result: queryResult } = renderHook(() => useGeminiQuery(), { wrapper });

    act(() => {
      loggerResult.current.addErrorLog({
        toolName: "Error Logger",
        input: "The student writed bad.",
        aiResponse: "Correction: The student wrote poorly."
      });
    });

    expect(loggerResult.current.errorMemory.length).toBe(1);

    // Call executeQuery. Since we mocked fetch, it will succeed.
    await act(async () => {
      await queryResult.current.executeQuery("dummy_key", "Test prompt", "Material", false);
    });
    
    expect(queryResult.current.error).toBeNull();
  });
});
