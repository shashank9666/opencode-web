import { createSignal, onCleanup, Show } from "solid-js"
import { Dialog } from "@opencode-ai/ui/dialog"
import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"
import { showToast } from "@/utils/toast"
import { useDialog } from "@opencode-ai/ui/context/dialog"

export function VoiceRecorder(props: {
  onRecordingComplete: (blob: Blob) => void
}) {
  const [recording, setRecording] = createSignal(false)
  const [mediaRecorder, setMediaRecorder] = createSignal<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = createSignal<Blob[]>([])
  const dialog = useDialog()

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setAudioChunks((chunks) => [...chunks, e.data])
        }
      }
      
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks(), { type: "audio/webm" })
        props.onRecordingComplete(audioBlob)
        setAudioChunks([])
        stream.getTracks().forEach((track) => track.stop())
        dialog.close()
      }

      setMediaRecorder(recorder)
      recorder.start()
      setRecording(true)
    } catch (err) {
      showToast({ title: "Recording Error", description: "Could not access microphone." })
    }
  }

  const stopRecording = () => {
    mediaRecorder()?.stop()
    setRecording(false)
  }

  onCleanup(() => {
    if (recording()) {
      mediaRecorder()?.stop()
    }
  })

  return (
    <Dialog 
      title="Voice Mode" 
      description="Record your voice to add to the chat context." 
      class="pointer-events-auto w-full max-w-[400px] border border-border-base bg-surface-base p-6 shadow-[var(--v2-elevation-modal)] rounded-2xl"
    >
      <div class="flex flex-col items-center justify-center py-8">
        <Show when={recording()} fallback={
          <Button size="large" variant="primary" class="rounded-full size-16 p-0 flex items-center justify-center" onClick={startRecording}>
            <Icon name="plus" class="size-6 text-white" />
          </Button>
        }>
          <div class="flex flex-col items-center gap-6">
            <div class="animate-pulse flex items-center justify-center size-20 rounded-full bg-red-500/20 text-red-500">
              <Icon name="plus" class="size-8" />
            </div>
            <Button size="normal" variant="secondary" onClick={stopRecording}>
              Stop Recording
            </Button>
          </div>
        </Show>
      </div>
    </Dialog>
  )
}
