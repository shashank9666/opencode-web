import { useParams } from "@solidjs/router"
import { createMemo } from "solid-js"
import { useLayout } from "@/context/layout"
import { useServer } from "@/context/server"
import { SessionRouteKey, SessionStateKey } from "@/utils/server-scope"

export const useSessionKey = (customDir?: () => string | undefined, customId?: () => string | undefined) => {
  const params = useParams()
  const server = useServer()
  const scope = createMemo(() => server.scope())
  const dir = createMemo(() => (customDir ? customDir() : params.dir))
  const id = createMemo(() => (customId ? customId() : params.id))
  const workspaceKey = createMemo(() => SessionStateKey.from(scope(), SessionRouteKey.fromRoute(dir())))
  const sessionKey = createMemo(() => SessionStateKey.from(scope(), SessionRouteKey.fromRoute(dir(), id())))
  return { params, sessionKey, workspaceKey, dir, id }
}

export const useSessionLayout = (customDir?: () => string | undefined, customId?: () => string | undefined) => {
  const layout = useLayout()
  const { params, sessionKey, workspaceKey, dir, id } = useSessionKey(customDir, customId)
  return {
    params,
    sessionKey,
    workspaceKey,
    dir,
    id,
    tabs: createMemo(() => layout.tabs(sessionKey)),
    view: createMemo(() => layout.view(sessionKey)),
  }
}
