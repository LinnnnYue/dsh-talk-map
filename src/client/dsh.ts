/**
 * Structural contracts for the DSH client-runtime surfaces this plugin
 * touches. Deliberately NOT imported from @deepseek-ai packages: this plugin
 * builds out-of-tree against rc-stage APIs, and a structural subset keeps the
 * compile surface pinned to exactly what we call (the pattern proven by
 * dsh-plugin-market). Source of truth — verify on dsh upgrades:
 *   packages/api/session-controller/src/types.ts                    (SessionCreateRequest, ModelCatalog, PromptContentPart)
 *   packages/api/session-controller/src/client/contract/sessions.ts (ISessions: list/create/fork)
 *   packages/api/session-controller/src/client/sessions/service.ts  (SessionSummary, SessionListState)
 *   packages/api/workspace-controller/src/types.ts                  (WorkspaceView, IWorkspaces.create)
 *   packages/client/ui-workspace/src/client/navigation.ts           (UiWorkspace.openSession)
 *   packages/client/ui-slots/src/store.ts                           (SnapshotSelectorHook)
 *   packages/client/ui-layout/src/client/index.ts                   ('shell.overlay')
 *   packages/client/ui-sidebar/src/client/contract/slots.ts         ('sidebar.footer.action')
 * all @ deepseek-harness 0.2.1-rc.5.
 *
 * Migrated for 0.2.1-rc.5: `ctx.connection.api` and `ctx.sessions.open` are
 * gone. Session mutations now ride the generated `ctx.remote` client
 * (RemoteResult envelopes, no `.result` wrapper) and opening a Session belongs
 * to `ctx.uiWorkspace`, whose navigator owns retention and selection.
 */

/** Selector hook a slot's standard props deliver (subscribes the component). */
export type SnapshotSelectorHook<T> = <S>(sel: (state: T) => S, eq?: (a: S, b: S) => boolean) => S

/** One row of the sessions list feed (subset of SessionSummary we render). */
export interface SessionSummary {
  readonly id: string
  readonly title?: string
  readonly displayTitle: string
  readonly cwd?: string
  /** Fork/subagent lineage — the free provenance edge on the map. */
  readonly parentId?: string
  readonly origin?: 'subagent'
  readonly running: boolean
  readonly blank: boolean
  readonly updatedAt: number
}

/**
 * Unified per-Session UI status (packages/client/ui-session). 0.2.1-rc.5 moved
 * the two card indicators here: `pendingInteraction` replaces the old
 * `SessionSummary.pendingInteraction`, `completionUnread` replaces
 * `SessionSummary.completed`. Delivered as a ReadonlyMap snapshot.
 */
export interface SessionStatus {
  readonly running: boolean | undefined
  readonly pendingInteraction: unknown
  readonly completionUnread: boolean
}
export type SessionStatusSnapshot = ReadonlyMap<string, SessionStatus>

/** The useSessions standard feed (subset). */
export interface SessionListState {
  readonly ids: readonly string[]
  readonly byId: Readonly<Record<string, SessionSummary>>
}

/** The useWorkspaces standard feed (subset of WorkspaceListState/WorkspaceView). */
export interface WorkspaceView {
  readonly workspaceId: string
  readonly path: string
  readonly title: string
  readonly sessionIds: readonly string[]
}
export interface WorkspaceListState {
  readonly items: readonly WorkspaceView[]
  /** 0.2.1-rc.5 arrival lifecycle: 'pending' until the Host list lands. */
  readonly phase?: 'pending' | 'ready'
  /** Removed at 0.2.1-rc.5; retained so older runtimes still type-check. */
  readonly recentWorkspaceId?: string | undefined
  /** Removed at 0.2.1-rc.5 in favour of {@link WorkspaceListState.phase}. */
  readonly baselinesReady?: boolean
}

/** Standard props every root-scope slot component receives. */
export interface RootSlotStandardProps {
  useSessions: SnapshotSelectorHook<SessionListState>
  useWorkspaces: SnapshotSelectorHook<WorkspaceListState>
  /**
   * Added at 0.2.1-rc.5 (it carries the card indicators the old SessionSummary
   * fields used to). Optional on purpose: the map must survive a shell that
   * does not deliver it, in which case the badges simply stay hidden.
   */
  useSessionStatus?: SnapshotSelectorHook<SessionStatusSnapshot>
}

/** Owner share of a 'sidebar.footer.action' entry. */
export interface SidebarFooterActionOwnerProps {
  /** Whether the sidebar renders wide content (false = 56px rail). */
  wide: boolean
}

/** Slot registration options (subset of the register() surface we use). */
export interface SlotEntryOptions {
  name: string
  id?: string
  order?: number
  label?: string | (() => string)
  inject?: (...args: unknown[]) => unknown
}

/** ctx.slots — inject defers until the slot is declared; register returns a disposer. */
export interface SlotsService {
  inject(name: string, factory: () => (() => void) | Iterable<() => void>): void
  register(entry: SlotEntryOptions, component: unknown): () => void
}

/** ctx.sessions (ISessions subset, 0.2.1-rc.5). */
export interface SessionsService {
  readonly list: {
    getSnapshot(): SessionListState
    subscribe(listener: () => void): () => void
  }
  /**
   * Host-catalogued creation. Preferred over the raw `remote.session.create`
   * RPC because the manager merges the newborn row into the list feed before
   * it resolves — a raw RPC would leave the card titleless until a refresh.
   */
  create(opts?: { workspaceId?: string; cwd?: string; sessionId?: string; agentPreset?: string }): Promise<string>
  fork(opts: { sessionId: string; atSeq?: number; increaseTitle?: boolean }): Promise<string>
}

/** ctx.workspaces (IWorkspaces subset): registration is idempotent per path. */
export interface WorkspacesService {
  create(input: { path: string }): Promise<WorkspaceView>
}

/** ctx.uiWorkspace (UiWorkspace subset): the only owner of Session opening. */
export interface UiWorkspaceService {
  openSession(target: string): void
}

/** Remote RPC result (dsh-typert-protocol RemoteResult) — no `.result` wrapper. */
export type RemoteResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code?: string; message?: string } }

/** One advisory model entry / provider group (remote `session/modelCatalog`). */
export interface ModelCatalogModel {
  id: string
  name: string
  reasoning?: { efforts: { id: string; name: string }[]; defaultEffort?: string }
}
export interface ModelProviderGroup {
  id: string
  name: string
  models: ModelCatalogModel[]
}

/** One roster row (remote `agentPresets/list`). */
export interface AgentPresetEntry {
  id: string
  name?: string
  description?: string
}

/** Content part accepted by `session/prompt` (our composer sends text only). */
export interface PromptTextPart {
  readonly type: 'text'
  readonly text: string
}

/**
 * ctx.remote — the generated typert Remote client. It replaced
 * `ctx.connection.api` at 0.2.1-rc.5, where `ctx.connection` became a pure
 * transport handle. Methods resolve a RemoteResult directly.
 */
export interface RemoteService {
  session: {
    selectModel(request: { sessionId: string; provider: string; model: string; reasoningEffort?: string }):
    Promise<RemoteResult<{ selected: { provider: string; model: string; reasoningEffort?: string } }>>
    prompt(request: {
      /** Client-minted identity; the Host deduplicates redelivery on it. */
      requestId: string
      sessionId: string
      mode: 'queue' | 'steer'
      content: readonly PromptTextPart[]
      clientTimeZone?: string
    }): Promise<RemoteResult<{ accepted: true }>>
    modelCatalog(): Promise<RemoteResult<{ groups: readonly ModelProviderGroup[] }>>
  }
  agentPresets?: {
    list(): Promise<RemoteResult<{ presets: readonly AgentPresetEntry[] }>>
  }
}

/** The client cordis context surface this plugin relies on (structural). */
export interface TalkMapClientContext {
  slots: SlotsService
  sessions: SessionsService
  workspaces: WorkspacesService
  remote: RemoteService
  uiWorkspace: UiWorkspaceService
  effect(callback: () => unknown, label?: string): void
}
