import { create } from 'zustand';

const useDietStore = create((set) => ({
  logs: [],
  currentLog: null,
  summary: null,
  isLoading: false,
  error: null,

  setLogs: (logs) => set({ logs }),
  setCurrentLog: (log) => set({ currentLog: log }),
  setSummary: (summary) => set({ summary }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearLogs: () => set({ logs: [], currentLog: null, summary: null }),
}));

export default useDietStore;
