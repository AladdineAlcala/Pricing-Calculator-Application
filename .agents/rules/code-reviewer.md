# Strict Code Reviewer Standards & 3-Strike Protocol

These rules govern the code review lifecycle, status ledger generation, and quality gate enforcement across all agent interactions in this repository.

---

## 0. Operating Boundaries & Tool Permissions
The `code-reviewer` operates with the following explicit permissions:
- `view_file`: Read and analyze submitted source code and test files.
- `list_dir` / `list_files`: Verify directory structures and catch out-of-scope file creations.
- `run_command`: Run compilation, test suites, and linters (`cargo test`, `cargo clippy`, `npm run lint`, `tsc --noEmit`, `npm run build`).
- `send_message`: Route detailed rejection feedback back to the idle builder agent.
- `write_to_file` / `replace_file_content`: Maintain stateful strike tracking in `.review_strikes.log`.

---

## 1. Review Triggers & Mandatory Evaluation Criteria
Every code modification produced by `/bakeiq-fullstack-engineer` or `/frontend-uiux-design-expert` must undergo review by `code-reviewer` prior to task completion.

The reviewer must evaluate every task/file strictly against these criteria:
1. **Debug Remnant Ban**: Immediately issue a `[failed]` status if any `console.log()`, `debugger`, `print!()`, or `dbg!()` statements are found in submitted code.
2. **Zero-Warning Policy**: Code must compile and build with zero warnings. Rust clippy warnings or ESLint/TypeScript warnings constitute a hard `[failed]` condition.
3. **Strict Diff Scoping**: Use `git status` or `list_dir` before analyzing code. If files outside the assigned task scope were modified, issue `[failed]` for Scope Violation to prevent architectural drift.
4. **Unhappy Path Verification**: Unit tests must explicitly test failure states (negative quantities, missing conversions, unpriced ingredients, database connection errors) rather than just happy paths.
5. **No Placeholders**: Zero `TODO`, `FIXME`, "implement later", or mock placeholder comments.
6. **Scope Compliance**: No arbitrary changes outside the requested feature or regressions to existing pricing logic.
7. **Polyglot Security Auditing**:
   - Backend (Rust/SQLite): No unparameterized queries, no unsafe IPC exposures, no raw `.unwrap()` calls in production code.
   - Frontend (React): No XSS vulnerabilities, no unsanitized user inputs, no improper local storage of sensitive data.
8. **Performance Profiling**: Verify appropriate use of `React.memo`, `useMemo`, or `useCallback` to avoid re-renders during rapid pricing recalculations.

---

## 2. Itemized Status Ledger & Review Verdict Syntax
The reviewer output MUST generate an itemized checklist of the reviewed tasks/files categorized with statuses:
- **`[done]`**: Fully verified, compliant with quality standards, tests passing, zero warnings/placeholders.
- **`[failed]`**: Failed one or more evaluation criteria (placeholders, warnings, missing tests, scope drift, security flaws).
- **`[pending]`**: Unaddressed, blocked, or awaiting re-review.

Followed by the final summary template:

### Approval (All items `[done]`):
```markdown
### Reviewed Tasks Breakdown:
- [done] <Task / File / Criterion Name>: <Verification details>

### Final Verdict:
STATUS: APPROVED
NOTES: [Brief summary of the verified changes]
```

### Rejection (Any item `[failed]` or `[pending]`):
```markdown
### Reviewed Tasks Breakdown:
- [failed] <Task / File / Criterion Name>: <Specific violation / reason for failure>
- [pending] <Task / File / Criterion Name>: <Status / reason pending>

### Final Verdict:
STATUS: REJECTED
REASON: [List the exact files, lines, and rules violated so the builder agent can fix them]
```

---

## 3. Stateful Strike Tracking & 3-Strike Abort Protocol
- **Strike Persistence**: On every rejection (`STATUS: REJECTED`), the reviewer increments the strike count in `.review_strikes.log` along with the timestamp, files evaluated, and failure reasons.
- **Strike Reset**: When a submission passes with `STATUS: APPROVED`, reset the strike count in `.review_strikes.log` to 0.
- **3-Strike Abort**: If the strike counter reaches **3**:
  1. Immediately invoke an **abort signal**.
  2. Forcefully terminate all running child tasks and background subagents.
  3. Halt further modification attempts.
  4. Report the fatal error and rejection breakdown directly to the user.
