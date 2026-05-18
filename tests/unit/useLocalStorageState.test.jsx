import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorageState } from '../../src/hooks/useLocalStorageState';

describe('useLocalStorageState Hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with default value and save to localStorage', () => {
    const { result } = renderHook(() => useLocalStorageState('test_key', 'default_val'));
    
    expect(result.current[0]).toBe('default_val');
    expect(localStorage.getItem('test_key')).toBe(JSON.stringify('default_val'));
  });

  it('should update state and sync to localStorage', () => {
    const { result } = renderHook(() => useLocalStorageState('test_key', 'initial'));
    
    act(() => {
      result.current[1]('updated_val');
    });

    expect(result.current[0]).toBe('updated_val');
    expect(localStorage.getItem('test_key')).toBe(JSON.stringify('updated_val'));
  });

  it('should retrieve existing value from localStorage on init', () => {
    localStorage.setItem('test_key', JSON.stringify('pre_existing'));
    const { result } = renderHook(() => useLocalStorageState('test_key', 'default'));
    
    expect(result.current[0]).toBe('pre_existing');
  });
});
