import { createSignal } from "solid-js";

export type OpenFile = {
  path: string;
  content: string;
  savedContent: string;
  dirty: boolean;
  originalContent?: string;
};

export type EditorGroup = {
  id: string;
  files: OpenFile[];
  activeFile: string | null;
};

export type SplitDirection = "horizontal" | "vertical";

export type EditorNode = 
  | { type: "group"; group: EditorGroup }
  | { type: "split"; direction: SplitDirection; sizes: number[]; children: EditorNode[] };

export function createEditorWorkspace() {
  const defaultGroup: EditorGroup = { id: "group-1", files: [], activeFile: null };
  const [rootNode, setRootNode] = createSignal<EditorNode>({ type: "group", group: defaultGroup });
  const [activeGroupId, setActiveGroupId] = createSignal<string>("group-1");

  let nextGroupId = 2;

  const findGroup = (node: EditorNode, id: string): EditorGroup | null => {
    if (node.type === "group") return node.group.id === id ? node.group : null;
    for (const child of node.children) {
      const found = findGroup(child, id);
      if (found) return found;
    }
    return null;
  };

  const updateGroup = (node: EditorNode, id: string, updater: (g: EditorGroup) => EditorGroup): EditorNode => {
    if (node.type === "group") {
      if (node.group.id === id) return { ...node, group: updater(node.group) };
      return node;
    }
    return { ...node, children: node.children.map(c => updateGroup(c, id, updater)) };
  };

  const openFile = (path: string, content: string, groupId: string = activeGroupId()) => {
    setRootNode(prev => updateGroup(prev, groupId, (g) => {
      const existing = g.files.find(f => f.path === path);
      if (existing) {
        // Update content if file was reloaded from disk
        return {
          ...g,
          files: g.files.map(f => f.path === path ? { ...f, content, savedContent: content, dirty: false } : f),
          activeFile: path
        };
      }
      return { ...g, files: [...g.files, { path, content, savedContent: content, dirty: false }], activeFile: path };
    }));
  };

  const closeFile = (path: string, groupId: string) => {
    setRootNode(prev => updateGroup(prev, groupId, (g) => {
      const idx = g.files.findIndex(f => f.path === path);
      if (idx === -1) return g;
      const remaining = g.files.filter(f => f.path !== path);
      let nextActive = g.activeFile;
      if (g.activeFile === path) {
        if (remaining.length > 0) {
          nextActive = remaining[Math.min(idx, remaining.length - 1)]!.path;
        } else {
          nextActive = null;
        }
      }
      return { ...g, files: remaining, activeFile: nextActive };
    }));
  };

  const closeOthers = (path: string, groupId: string) => {
    setRootNode(prev => updateGroup(prev, groupId, (g) => {
      const fileToKeep = g.files.find(f => f.path === path);
      if (!fileToKeep) return g;
      return { ...g, files: [fileToKeep], activeFile: path };
    }));
  };

  const closeToTheRight = (path: string, groupId: string) => {
    setRootNode(prev => updateGroup(prev, groupId, (g) => {
      const idx = g.files.findIndex(f => f.path === path);
      if (idx === -1) return g;
      const remaining = g.files.slice(0, idx + 1);
      const activeFileIdx = g.files.findIndex(f => f.path === g.activeFile);
      let nextActive = g.activeFile;
      if (activeFileIdx > idx) {
        nextActive = path;
      }
      return { ...g, files: remaining, activeFile: nextActive };
    }));
  };

  const closeSaved = (groupId: string) => {
    setRootNode(prev => updateGroup(prev, groupId, (g) => {
      const remaining = g.files.filter(f => f.dirty);
      let nextActive = g.activeFile;
      if (!remaining.find(f => f.path === g.activeFile)) {
        nextActive = remaining.length > 0 ? remaining[0].path : null;
      }
      return { ...g, files: remaining, activeFile: nextActive };
    }));
  };

  const closeAll = (groupId: string) => {
    setRootNode(prev => updateGroup(prev, groupId, (g) => {
      return { ...g, files: [], activeFile: null };
    }));
  };

  const setContent = (path: string, content: string, groupId: string) => {
    setRootNode(prev => updateGroup(prev, groupId, (g) => {
      return { ...g, files: g.files.map(f => {
        if (f.path !== path) return f;
        const dirty = content !== f.savedContent;
        return { ...f, content, dirty };
      }) };
    }));
  };

  const reloadFileContent = (path: string, content: string, groupId: string) => {
    setRootNode(prev => updateGroup(prev, groupId, (g) => {
      return { ...g, files: g.files.map(f => {
        if (f.path !== path) return f;
        return { ...f, content, savedContent: content, dirty: false };
      }) };
    }));
  };

  const markClean = (path: string, groupId: string) => {
    setRootNode(prev => updateGroup(prev, groupId, (g) => {
      return { ...g, files: g.files.map(f => f.path === path ? { ...f, dirty: false, savedContent: f.content } : f) };
    }));
  };

  const setActiveFile = (path: string, groupId: string) => {
    setRootNode(prev => updateGroup(prev, groupId, (g) => ({ ...g, activeFile: path })));
    setActiveGroupId(groupId);
  };

  const mergeAllPanels = () => {
    const collectFiles = (node: EditorNode): OpenFile[] => {
      if (node.type === "group") return node.group.files
      return node.children.flatMap(collectFiles)
    }
    const allFiles = collectFiles(rootNode())
    const mergedGroup: EditorGroup = { id: "group-1", files: allFiles, activeFile: allFiles[0]?.path ?? null }
    setRootNode({ type: "group", group: mergedGroup })
    setActiveGroupId("group-1")
  }

  const swapSplitChildren = (parentId: string, indexA: number, indexB: number) => {
    const swapRec = (node: EditorNode): EditorNode => {
      if (node.type === "group") return node
      if (node.type === "split") {
        const id = `${node.direction}-${node.sizes.join("-")}`
        if (id === parentId || node.children.some(c => c.type === "group" && c.group.id === parentId)) {
          const newChildren = [...node.children]
          const temp = newChildren[indexA]
          newChildren[indexA] = newChildren[indexB]
          newChildren[indexB] = temp
          return { ...node, children: newChildren }
        }
        return { ...node, children: node.children.map(swapRec) }
      }
      return node
    }
    setRootNode(prev => swapRec(prev))
  }

  const splitGroup = (groupId: string, direction: SplitDirection) => {
    const splitNodeRec = (node: EditorNode): EditorNode => {
      if (node.type === "group" && node.group.id === groupId) {
        const newGroup: EditorGroup = { id: `group-${nextGroupId++}`, files: [], activeFile: null };
        return {
          type: "split",
          direction,
          sizes: [50, 50],
          children: [node, { type: "group", group: newGroup }]
        };
      }
      if (node.type === "split") {
        return { ...node, children: node.children.map(splitNodeRec) };
      }
      return node;
    };
    setRootNode(prev => splitNodeRec(prev));
  };

  const getActiveGroup = () => findGroup(rootNode(), activeGroupId()) || findGroup(rootNode(), "group-1");

  const getFileState = (path: string, groupId?: string) => {
    const targetGroup = groupId ? findGroup(rootNode(), groupId) : getActiveGroup();
    if (!targetGroup) return null;
    return targetGroup.files.find(f => f.path === path) || null;
  };

  const getDirtyFiles = (): { path: string; content: string; groupId: string }[] => {
    const result: { path: string; content: string; groupId: string }[] = [];
    const collect = (node: EditorNode) => {
      if (node.type === "group") {
        for (const f of node.group.files) {
          if (f.dirty) result.push({ path: f.path, content: f.content, groupId: node.group.id });
        }
      } else {
        for (const child of node.children) collect(child);
      }
    };
    collect(rootNode());
    return result;
  };

  return {
    rootNode,
    activeGroupId,
    setActiveGroupId,
    openFile,
    closeFile,
    closeOthers,
    closeToTheRight,
    closeSaved,
    closeAll,
    setContent,
    reloadFileContent,
    markClean,
    setActiveFile,
    splitGroup,
    mergeAllPanels,
    swapSplitChildren,
    getFileState,
    getActiveGroup,
    getDirtyFiles
  };
}
