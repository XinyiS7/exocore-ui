# Skill: WezTerm Multi-Agent Cooperation (wezterm_coop)

## 1. Description
Standards and operational procedures for high-fidelity multi-agent collaboration within the WezTerm environment. This skill ensures synchronization between the Primary Agent (Executor) and the Auditor Agent across panes.

## 2. Environment Standards
- **Terminal**: WezTerm (PowerShell).
- **Python Environment**: Conda environment `exocore_project` must be pre-activated.
- **Command Syntax**: Use `python` directly for script execution. Do NOT use absolute interpreter paths unless troubleshooting environment desync.
- **Pathing**: Always use Windows-style backslashes `\` or Pathlib-compatible forward slashes `/`. Avoid shell-specific path hacks.

## 3. Collaboration Protocol
- **Primary Agent (Executor)**: Responsible for research, strategy, and execution. Runs in the primary working pane.
- **Auditor Agent**: Responsible for security audit, architectural review, and safety confirmation. Runs in the designated auditor pane (configured per session).
- **Mandatory Audit**: Every file modification or database schema change performed by the Primary Agent **MUST** be reviewed and approved by the Auditor before finalization.

## 4. Operational Workflow

### Phase 1: Context Synchronization
- Before starting a new task, the Primary Agent must read the active `Plan/*.md` files and the agent's context file (`CLAUDE.md` / `GEMINI.md` as applicable) to align with the global state.
- The Primary Agent must provide a concise "Work Plan" to the user and wait for acknowledgment.

### Phase 2: Audited Execution
1. **Prepare**: The Primary Agent prepares the code change or SQL command.
2. **Review**: The Primary Agent presents the proposed change to the user (who bridges it to the Auditor for review).
3. **Act**: Only after receiving the "Audit Passed" signal, the Primary Agent applies the change.
4. **Log**: Update `Plan/ExoCore_Worklog.md` immediately after successful execution.

### Phase 3: State Persistence
- The Primary Agent must use `state_snapshot` in session summaries to preserve the `task_state`, `active_constraints`, and `artifact_trail` for the next session.

## 5. Security & Safety
- **Credential Protection**: Never print or commit `.env` content.
- **Environment Isolation**: Always exclude `.venv`, `.git`, and `chroma_db` from recursive searches to prevent infinite loops or data leakage.
- **Error Logging**: Any environment-specific failure (e.g., PowerShell syntax error) must be recorded in the "Agent Operational Memo & Error Log" section of the agent's operational context file.

## 6. Success Metrics
- Zero un-audited file modifications.
- 100% synchronization between `Worklog` and actual repository state.
- Successful execution of `python test_rag.py` after retrieval-related changes.
