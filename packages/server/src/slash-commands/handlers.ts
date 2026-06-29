export const handleSlashCommand = (command: string, args: string): string | null => {
  switch (command) {
    case "goal":
      return `[System Instruction: The user has requested a long-running /goal. Please be extra thorough, do not stop prematurely, and continue working autonomously until the goal is fully achieved.]\n\n${args}`
      
    case "schedule":
      return `[System Instruction: The user wants to /schedule a task. Please use the schedule_task tool to set a timer or a recurring cron schedule for this request.]\n\n${args}`
      
    case "grill-me":
      return `[System Instruction: The user wants to be grilled (/grill-me) to resolve design decisions. Conduct an interactive interview, ask probing questions one at a time, and clarify all ambiguous points before finalizing a plan.]\n\n${args}`
      
    case "learn":
      return `[System Instruction: The user wants you to /learn from recent interactions. Please summarize the recent corrections or solutions and create a rule or skill to persist this behavior for future tasks.]\n\n${args}`
      
    default:
      // Return null if the command is unrecognized, leaving it as a regular message
      return null
  }
}
