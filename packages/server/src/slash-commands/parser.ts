import { Effect } from "effect"
import { Prompt } from "@opencode-ai/core/session/prompt"
import { handleSlashCommand } from "./handlers"

export const interceptSlashCommand = (prompt: Prompt): Prompt => {
  const text = prompt.text.trim()
  
  if (text.startsWith("/")) {
    const match = text.match(/^\/([a-zA-Z0-9-]+)(\s+.*)?$/)
    if (match) {
      const command = match[1]
      const args = match[2] ? match[2].trim() : ""
      
      const newText = handleSlashCommand(command, args)
      if (newText) {
        return Prompt.fromUserMessage({
          ...prompt,
          text: newText
        })
      }
    }
  }
  
  return prompt
}
