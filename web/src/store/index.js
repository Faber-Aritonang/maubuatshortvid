/**
 * Zustand-like Store (clean-room, minimal implementation)
 * Replaces useState in App.jsx with centralized reactive state.
 * Pattern mirrors Satset's state management but simplified for prototype.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  getSession, getProfile, getMyPlan, getPreferences, savePreferences,
  listProjects, createProject, getProject, updateProject, deleteProject,
  listGeminiKeys, getAppSettings,
} from '../lib/api.js';
import { demoProject } from '../lib/projectTemplates.js';

// ============ Auth Store ============
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      profile: null,
      plan: null,
      loading: true,

      // Initialize from Supabase session
      init: async () => {
        set({ loading: true });
        try {
          const session = await getSession();
          if (session) {
            const [profile, plan, prefs] = await Promise.all([
              getProfile(),
              getMyPlan(),
              getPreferences(),
            ]);
            set({
              user: session.user,
              session,
              profile,
              plan,
              preferences: prefs,
              loading: false,
            });
          } else {
            set({ loading: false });
          }
        } catch (e) {
          console.error('[auth] init failed', e);
          set({ loading: false });
        }
      },

      // Sign in/up handled by Supabase Auth UI, just refresh
      refresh: async () => {
        const session = await getSession();
        if (session) {
          const [profile, plan] = await Promise.all([getProfile(), getMyPlan()]);
          set({ user: session.user, session, profile, plan });
        } else {
          set({ user: null, session: null, profile: null, plan: null });
        }
      },

      signOut: () => {
        // Supabase signOut called from UI, then refresh
        set({ user: null, session: null, profile: null, plan: null });
      },

      updateProfile: (data) => {
        set({ profile: { ...get().profile, ...data } });
      },

      setPlan: (plan) => set({ plan }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Don't persist session/user - refresh on load
        preferences: state.preferences,
      }),
    }
  )
);

// ============ Project Store ============
export const useProjectStore = create(
  persist(
    (set, get) => ({
      projects: [],
      currentProject: null,
      currentProjectId: null,
      loading: false,
      error: null,

      // Load all projects
      loadProjects: async () => {
        set({ loading: true, error: null });
        try {
          const projects = await listProjects();
          set({ projects, loading: false });
        } catch (e) {
          set({ error: e.message, loading: false });
        }
      },

      // Create new project
      newProject: async (projectData = {}) => {
        set({ loading: true });
        try {
          const base = demoProject();
          const project = {
            ...base,
            title: projectData.title || 'Proyek Baru',
            ...projectData,
            scenes: base.scenes, // Start with 3 demo scenes
          };
          const saved = await createProject(project);
          set((state) => ({
            projects: [saved, ...state.projects],
            currentProject: saved,
            currentProjectId: saved.id,
            loading: false,
          }));
          return saved;
        } catch (e) {
          set({ error: e.message, loading: false });
          throw e;
        }
      },

      // Switch current project
      selectProject: (id) => {
        const project = get().projects.find(p => p.id === id);
        if (project) {
          set({ currentProject: project, currentProjectId: id });
        }
      },

      // Load single project (with scenes)
      loadProject: async (id) => {
        set({ loading: true });
        try {
          const project = await getProject(id);
          if (project) {
            set({ currentProject: project, currentProjectId: id, loading: false });
          }
          return project;
        } catch (e) {
          set({ error: e.message, loading: false });
          throw e;
        }
      },

      // Update current project locally (optimistic)
      updateCurrent: (updates) => {
        set((state) => ({
          currentProject: state.currentProject ? { ...state.currentProject, ...updates } : null,
          projects: state.projects.map(p =>
            p.id === state.currentProjectId ? { ...p, ...updates } : p
          ),
        }));
      },

      // Save current project to backend
      saveCurrent: async () => {
        const { currentProject, currentProjectId } = get();
        if (!currentProject || !currentProjectId) return;
        try {
          await updateProject(currentProjectId, currentProject);
        } catch (e) {
          set({ error: e.message });
          throw e;
        }
      },

      // Delete project
      removeProject: async (id) => {
        try {
          await deleteProject(id);
          set((state) => ({
            projects: state.projects.filter(p => p.id !== id),
            currentProject: state.currentProjectId === id ? null : state.currentProject,
            currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
          }));
        } catch (e) {
          set({ error: e.message });
          throw e;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'project-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist project list references, not full data
        // currentProjectId to restore selection
        currentProjectId: state.currentProjectId,
      }),
    }
  )
);

// ============ Editor Store (UI state for canvas editor) ============
export const useEditorStore = create(
  persist(
    (set, get) => ({
      // Scene selection
      selectedSceneIndex: 0,

      // Playback
      playing: false,
      currentTime: 0,
      playbackRate: 1,

      // Export
      exporting: false,
      exportProgress: 0,

      // TTS
      ttsRate: 1,
      ttsPlaying: false,

      // UI
      sidebarOpen: true,
      previewMode: false,

      // Actions
      setScene: (index) => set({ selectedSceneIndex: index }),
      setPlaying: (playing) => set({ playing }),
      setTime: (time) => set({ currentTime: time }),
      setRate: (rate) => set({ playbackRate: rate, ttsRate: rate }),
      setExporting: (exporting, progress = 0) => set({ exporting, exportProgress: progress }),
      setTTSPlaying: (playing) => set({ ttsPlaying: playing }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setPreviewMode: (mode) => set({ previewMode: mode }),

      // Reset editor state (new project)
      reset: () => set({
        selectedSceneIndex: 0,
        playing: false,
        currentTime: 0,
        exporting: false,
        exportProgress: 0,
        ttsPlaying: false,
      }),
    }),
    {
      name: 'editor-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persist UI preferences only
        ttsRate: state.ttsRate,
        sidebarOpen: state.sidebarOpen,
        previewMode: state.previewMode,
      }),
    }
  )
);

// ============ Settings Store ============
export const useSettingsStore = create(
  persist(
    (set, get) => ({
      appSettings: null,
      geminiKeys: [],
      preferences: {},
      loading: false,

      loadSettings: async () => {
        set({ loading: true });
        try {
          const [appSettings, keys, prefs] = await Promise.all([
            getAppSettings(),
            listGeminiKeys(),
            getPreferences(),
          ]);
          set({ appSettings, geminiKeys: keys || [], preferences: prefs || {}, loading: false });
        } catch (e) {
          console.error('[settings] load failed', e);
          set({ loading: false });
        }
      },

      savePreferences: async (data) => {
        try {
          await savePreferences(data);
          set({ preferences: data });
        } catch (e) {
          console.error('[settings] save prefs failed', e);
          throw e;
        }
      },

      addGeminiKey: (key) => set((s) => ({ geminiKeys: [key, ...s.geminiKeys] })),
      removeGeminiKey: (id) => set((s) => ({ geminiKeys: s.geminiKeys.filter(k => k.id !== id) })),
      setActiveKey: (id) => set((s) => ({
        geminiKeys: s.geminiKeys.map(k => ({ ...k, is_active: k.id === id })),
      })),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        preferences: state.preferences,
        // Don't persist keys (security) or appSettings (refetch)
      }),
    }
  )
);

// ============ Selectors (convenience hooks) ============
export const selectCurrentScene = (state) => {
  const { currentProject, selectedSceneIndex } = state;
  if (!currentProject?.scenes?.length) return null;
  const idx = Math.min(selectedSceneIndex, currentProject.scenes.length - 1);
  return currentProject.scenes[idx];
};

export const selectProjectDuration = (state) => {
  const { currentProject } = state;
  if (!currentProject?.scenes) return 0;
  return currentProject.scenes.reduce((sum, sc) => sum + (Number(sc.dur) || 4), 0);
};

export const selectSceneAtTime = (state, time) => {
  const { currentProject } = state;
  if (!currentProject?.scenes?.length) return null;
  let acc = 0;
  for (let i = 0; i < currentProject.scenes.length; i++) {
    const sc = currentProject.scenes[i];
    const d = Number(sc.dur) || 4;
    if (time < acc + d || i === currentProject.scenes.length - 1) {
      const local = Math.max(0, time - acc);
      return { scene: sc, index: i, start: acc, local, progress: Math.min(1, local / d) };
    }
    acc += d;
  }
  return null;
};

// ============ Initialize all stores ============
export async function initializeStores() {
  await Promise.all([
    useAuthStore.getState().init(),
    useProjectStore.getState().loadProjects(),
    useSettingsStore.getState().loadSettings(),
  ]);
}

// Listen for auth changes (Supabase auth state change)
if (typeof window !== 'undefined' && import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
  import('@supabase/supabase-js').then(({ createClient }) => {
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        useAuthStore.getState().refresh();
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.getState().signOut();
        useProjectStore.getState().selectProject(null);
        useEditorStore.getState().reset();
      }
    });
  }).catch(() => {}); // Ignore if not loaded yet
}