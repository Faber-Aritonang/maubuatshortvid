/**
 * Project Hooks - React integration for project store
 */

import { useProjectStore, selectCurrentScene, selectProjectDuration, selectSceneAtTime } from '../store/index.js';
import { useEditorStore } from '../store/index.js';
import { blankScene } from '../lib/projectTemplates.js';
import { ensureTiming } from '../tts.js';

/**
 * Hook to access project state and actions
 */
export function useProjects() {
  const {
    projects,
    currentProject,
    currentProjectId,
    loading,
    error,
    loadProjects,
    newProject,
    selectProject,
    loadProject,
    updateCurrent,
    saveCurrent,
    removeProject,
    clearError,
  } = useProjectStore();
  const { selectedSceneIndex } = useEditorStore();

  return {
    // State
    projects,
    currentProject,
    currentProjectId,
    loading,
    error,

    // Computed (reactive — derived from destructured state)
    currentScene: selectCurrentScene({ currentProject, selectedSceneIndex }),
    projectDuration: selectProjectDuration({ currentProject }),

    // Actions
    loadProjects,
    newProject,
    selectProject,
    loadProject,
    updateCurrent,
    saveCurrent,
    removeProject,
    clearError,

    // Scene helpers
    getSceneAt: (time) => selectSceneAtTime({ currentProject }, time),
  };
}

/**
 * Hook for current project with scene management
 */
export function useCurrentProject() {
  const { currentProject, currentProjectId, updateCurrent, saveCurrent, selectProject, loadProject } = useProjectStore();
  const { selectedSceneIndex, setScene } = useEditorStore();

  // Current scene
  const scene = currentProject?.scenes?.[selectedSceneIndex] || null;

  // Update scene helper
  const updateScene = (patch) => {
    if (!currentProject || !currentProjectId) return;
    const scenes = currentProject.scenes.map((s, i) =>
      i === selectedSceneIndex ? { ...s, ...patch } : s
    );
    const updated = ensureTiming({ ...currentProject, scenes });
    updateCurrent(updated);
  };

  // Add scene
  const addScene = () => {
    if (!currentProject || currentProject.scenes.length >= 6) return;
    const scenes = [...currentProject.scenes, blankScene(currentProject.scenes.length)];
    const updated = ensureTiming({ ...currentProject, scenes });
    updateCurrent(updated);
    setScene(currentProject.scenes.length);
  };

  // Remove scene
  const removeScene = (index = selectedSceneIndex) => {
    if (!currentProject || currentProject.scenes.length <= 1) return;
    const scenes = currentProject.scenes.filter((_, i) => i !== index);
    const updated = ensureTiming({ ...currentProject, scenes });
    updateCurrent(updated);
    setScene(0);
  };

  // Reorder scenes
  const reorderScenes = (fromIndex, toIndex) => {
    if (!currentProject) return;
    const scenes = [...currentProject.scenes];
    const [removed] = scenes.splice(fromIndex, 1);
    scenes.splice(toIndex, 0, removed);
    const updated = ensureTiming({ ...currentProject, scenes });
    updateCurrent(updated);
  };

  // Save to backend
  const save = async () => {
    await saveCurrent();
  };

  return {
    project: currentProject,
    projectId: currentProjectId,
    scene,
    sceneIndex: selectedSceneIndex,
    sceneCount: currentProject?.scenes?.length || 0,
    duration: selectProjectDuration({ currentProject }),
    updateScene,
    addScene,
    removeScene,
    reorderScenes,
    setScene,
    save,
    selectProject,
    loadProject,
  };
}