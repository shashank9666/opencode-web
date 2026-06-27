import { createStore } from "solid-js/store"
import { createSimpleContext } from "@opencode-ai/ui/context"
import { batch } from "solid-js"

export type BackgroundTaskType = "indexing" | "testing" | "documentation" | "refactoring" | "search"
export type BackgroundTaskStatus = "running" | "completed" | "failed"

export type BackgroundTask = {
  id: string
  name: string
  type: BackgroundTaskType
  status: BackgroundTaskStatus
  progress: number
  startTime: number
  duration?: number
  error?: string
}

let nextId = 1

function generateId() {
  return `bg-task-${nextId++}`
}

export const { use: useBackgroundTasks, provider: BackgroundTasksProvider } = createSimpleContext({
  name: "BackgroundTasks",
  gate: false,
  init: () => {
    const [tasks, setTasks] = createStore<BackgroundTask[]>([])

    const addTask = (name: string, type: BackgroundTaskType) => {
      const task: BackgroundTask = {
        id: generateId(),
        name,
        type,
        status: "running",
        progress: 0,
        startTime: Date.now(),
      }
      setTasks(tasks.length, task)
      return task.id
    }

    const updateTask = (id: string, status: BackgroundTaskStatus, progress: number) => {
      setTasks(
        (t) => t.id === id,
        "status",
        status,
      )
      setTasks(
        (t) => t.id === id,
        "progress",
        progress,
      )
      if (status === "completed" || status === "failed") {
        setTasks((t) => t.id === id, "duration", Date.now() - tasks.find((t) => t.id === id)!.startTime)
      }
    }

    const removeTask = (id: string) => {
      const index = tasks.findIndex((t) => t.id === id)
      if (index === -1) return
      batch(() => {
        setTasks((prev) => [...prev.slice(0, index), ...prev.slice(index + 1)])
      })
    }

    const runningCount = () => tasks.filter((t) => t.status === "running").length

    const cancelTask = (id: string) => {
      updateTask(id, "failed", 0)
    }

    return {
      tasks,
      addTask,
      updateTask,
      removeTask,
      cancelTask,
      runningCount,
    }
  },
})
