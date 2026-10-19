# Windows checklist (one laptop, after the night of fixes)

**English** · [Português](pt/WINDOWS-CHECKLIST.md)

One person, one real Windows 10 or 11 laptop, about 60 to 90 minutes. Do parts A and B first (about 50 minutes, the first install included), then part C in order for as long as you have time. Part D is only for the things you happen to have. The broader release tests are in [MANUAL-TESTS.md](MANUAL-TESTS.md): where a check here also covers one of them, it says which.

## Before you start

- **User:** a new local Windows user **without admin rights**, if you can (the checks assume nothing from the kit is installed yet). **Release:** publish the `chaos-fixes` build first (`tools/build-release.sh` and `tools/publish-release.sh`), so that **the one-liner** in [INSTALL.md](INSTALL.md) (section 2) downloads tonight's fixes.
- **Shorthands:** **the check** is `powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.workshop-claude\setup-windows.ps1" -Check`, and **the install** is the same command without `-Check`. A variable you set with `$env:...` only counts in that window: set it, run the check there, then close the window.
- **Where files go:** `%USERPROFILE%\.workshop-claude` (kit, `setup.log`, `summary.txt`, the saved `setup-windows.ps1`, Node, gh, acli), `%USERPROFILE%\.local\bin` (claude, uv), `%USERPROFILE%\.claude` (settings, skills, agents), `%USERPROFILE%\workshop-claude` (the two projects) and `%USERPROFILE%\.agent-memory` (memories).
- **Reset:** `powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.workshop-claude\setup-windows.ps1" -Uninstall`. It leaves git, Claude Code, Node, uv, gh and the backups; for a truly clean start, use another new user.
- **When a check fails, send:** its number, a photo of the window, `%USERPROFILE%\.workshop-claude\setup.log` and `%USERPROFILE%\.workshop-claude\summary.txt` (setup.log already comes without secrets). Write down pass or fail for every number.

## A. The main path (about 30 minutes)

### 1. Plain install with the one-liner
Open **Windows PowerShell** from the Start menu (not ISE, not "x86", not PowerShell 7), paste the one-liner and answer yes to the logins (n to Atlassian if you don't use Jira).
- **Expect:** no red text. In Windows Terminal: a card at the top, one line per step (✔ ▲ ✖) and, while a step runs, a spinner with what it is doing and the bar "N of 12" at the bottom; nothing of it is left after a question, a login or the end. In the old console window (conhost): cards with +--+ and [OK] [!!] [XX], without a spinner. Each login opens in **its own new window** ("The login opens in a new window: finish it there...") with the URL or code; that window closes when the login ends and the setup carries on, even though the browser stays open. Step 12 prints "Asking Claude for a short reply (up to 90 s)…" (the `…` renders) and passes. The end is "Everything is ready for the workshop." and "(setup finished with exit code 0)".
- **In setup.log:** step 0 shows `x64`; the line `network: https://claude.ai/install.ps1 -> ...` says reachable; `node in a new terminal: 24` (or none/unknown, never a bare 0); one `result step N:` line per step.
- **If not:** the usual files, plus how long the install took. This check also covers W1, W2 and W16.

### 2. New window, then the check
Close the window, open a new Windows PowerShell and run:
```powershell
(Get-Command claude).Source
claude --version
```
Then run the check, followed by `echo $LASTEXITCODE`.
- **Expect:** claude is `%USERPROFILE%\.local\bin\claude.exe`; the check ends with "Check complete: everything is ready for the workshop." and the exit code is 0.
- **If not:** the usual files, plus the output of `(Get-Item HKCU:\Environment).GetValue('Path', $null, 'DoNotExpandEnvironmentNames')`.

### 3. The check through the one-liner
```powershell
$env:WORKSHOP_SETUP_ARGS = '-Check'
```
In the same window, paste the one-liner, then run `$env:WORKSHOP_SETUP_ARGS`.
- **Expect:** the run is a check (nothing installed), and the variable is empty afterwards. Pasting the one-liner again runs an install (steps "Already done"), not a check.
- **If not:** the usual files and the window text.

### 4. Strict JSON parser of Windows PowerShell 5.1
In Windows PowerShell (not pwsh), on a profile that has used Claude Code for a while if you can:
```powershell
$J = [Windows.Data.Json.JsonValue, Windows.Data.Json, ContentType=WindowsRuntime]
foreach ($t in @('{"a":1,}', '{"a":1,"a":2}', '{"projects":{"C:/x":1,"c:/x":2}}')) { try { $null = $J::Parse($t); "parses: $t" } catch { "THROWS: $t" } }
$null = $J::Parse([IO.File]::ReadAllText("$env:USERPROFILE\.claude.json").TrimStart([char]0xFEFF)); 'the real .claude.json parses'
```
- **Expect:** `THROWS: {"a":1,}`, then `parses:` for the other two, then "the real .claude.json parses".
- **If not:** the four output lines. This is a blocker for everyone: a wrong THROWS makes step 2 fail with E-CC-04 and blocks steps 3, 7 and 12.

## B. The blockers (about 20 minutes)

### 5. Profile on a network drive (simulated)
This simulates an AD home folder (`HOMEDRIVE`/`HOMEPATH` on a share). In a new window:
```powershell
New-Item -ItemType Directory -Force "$env:LOCALAPPDATA\fakehome" | Out-Null
subst H: "$env:LOCALAPPDATA\fakehome"
$env:HOMEDRIVE = 'H:'; $env:HOMEPATH = '\'
powershell
```
In the inner prompt, `$HOME` must print `H:\`. Run the uninstall, then paste the one-liner, then run the check.
- **Expect:** the uninstall starts with "Uninstall mode: I undo what this setup installed, based on ...manifest.json" and ends with "Uninstall complete...". The install has step 2 with no E-CC-01, and `%USERPROFILE%\.agent-memory\config.json` exists. `Get-ChildItem H:\ -Force` is empty (no `.workshop-claude`, no `workshop-claude`).
- **Afterwards:** `exit`, then `subst H: /d`. **If not:** the usual files and the `H:\` listing. This check also covers W12.

### 6. OneDrive
Only if OneDrive backs up your Documents or Desktop (Known Folder Move): run the check.
- **Expect:** no E-SO-03 warning (that warning is only for a home folder or projects folder inside OneDrive).
- **If not:** the usual files and the OneDrive folder path.

### 7. 32-bit PowerShell
Open **Windows PowerShell (x86)** from the Start menu and paste the one-liner. Then, in the same window, run the check and `echo $LASTEXITCODE`.
- **Expect:** the one-liner runs normally, and the newest step 0 in setup.log shows `x64`. The check starts with "This is the 32-bit PowerShell (x86): I am starting the setup again in the 64-bit Windows PowerShell 5.1." and then runs with colours and visible questions; the exit code is 0.
- **If not:** the usual files and the window text.

### 8. PowerShell 7
Only if `pwsh` is installed (also try it if Windows Terminal opens PowerShell 7 by default). In a pwsh window, paste the one-liner, then run:
```powershell
pwsh -File "$env:USERPROFILE\.workshop-claude\setup-windows.ps1" -Check
echo $LASTEXITCODE
```
- **Expect:** the one-liner runs normally. The check starts with "This is PowerShell 7: I am starting the setup again in Windows PowerShell 5.1 (64-bit).", shows no false E-NODE-02, and the exit code is the same as the 5.1 run (0).
- **If not:** the usual files and the window text.

### 9. PowerShell ISE
Open **Windows PowerShell ISE** and paste the one-liner in its console pane. Then open `%USERPROFILE%\.workshop-claude\setup-windows.ps1` in ISE and press F5.
- **Expect:** "PowerShell ISE cannot answer the questions of the setup, so the setup opened in a new PowerShell window. Continue there." A new console window opens, asks the questions, and **stays open** at the end. F5 gives the same new window (if ISE says running scripts is disabled, that is the default policy: note it and move on).
- **Known gap:** typing `powershell -File ...` in the ISE console pane still starts a hidden child. **If not:** the usual files and a photo of both windows.

### 10. Execution policy set by Group Policy
Everyone: run `Get-ExecutionPolicy -List`.
- If MachinePolicy or UserPolicy is **AllSigned** or **Restricted**, paste the one-liner. **Expect:** "ERROR: a company policy (Group Policy, MachinePolicy) sets the PowerShell execution policy to AllSigned." plus "See E-SO-07", with no red PowerShell error and nothing downloaded.
- If it is **RemoteSigned**, the one-liner and the check must run, and `Get-Item "$env:USERPROFILE\.workshop-claude\setup-windows.ps1" -Stream *` lists only `:$DATA` (no `Zone.Identifier`).
- **Optional, if you have admin on a test VM:** in an admin window, `reg add HKLM\SOFTWARE\Policies\Microsoft\Windows\PowerShell /v EnableScripts /t REG_DWORD /d 1 /f` and `reg add HKLM\SOFTWARE\Policies\Microsoft\Windows\PowerShell /v ExecutionPolicy /t REG_SZ /d AllSigned /f`, then repeat as the normal user. With RemoteSigned, also try the INSTALL.md fallback (download `setup-windows.ps1` with the browser, `Unblock-File`, `-File`). Delete both values afterwards (`reg delete ... /v EnableScripts /f`, same for `ExecutionPolicy`).
- **If not:** the `Get-ExecutionPolicy -List` output and the window text.

### 11. Company proxy (407)
Only on a company network with an authenticating proxy. Paste the one-liner; if the very first download says `(407) Proxy Authentication Required`, use the proxy one-liner from INSTALL.md instead.
- **Expect:** step 0 has the note "The proxy only lets programs through with your Windows login (NTLM or Kerberos)..." and the warning E-NET-03. Steps 2, 5, 10 and 12 fail with E-NET-03, not with E-CC-01, E-UV-01 or E-MEM-03.
- **If the proxy has bypass entries** ("Do not use the proxy server for..." in the proxy settings): `%USERPROFILE%\.claude\settings.json` has `env.NO_PROXY` starting with `localhost,127.0.0.1`, then your entries (`*.corp` becomes `.corp`), and the check shows step 8 OK.
- **If not:** the usual files and the code each step showed. See also W7.

## C. The rest, by priority

Back up two files first, and restore them whenever a check says so:
```powershell
Copy-Item "$env:USERPROFILE\.claude.json" "$env:USERPROFILE\claude.json.bak"
Copy-Item "$env:USERPROFILE\.claude\settings.json" "$env:USERPROFILE\settings.json.bak"
```

### 12. Cancel a login
Log out (`claude auth logout`, or `/logout` inside claude; then `gh auth logout`) and run the install. At "Log in to the Console now?" answer y, then press Ctrl-C in the login window. Run again and close the login window with its X. Do the same at "Log in to GitHub now?".
- **Expect:** the login window closes, the setup carries on, step 3 has "Login cancelled (Ctrl-C). The setup carries on; you can log in later." and E-AUTH-01, and the summary is printed. setup.log has `login exit -1073741510` (or 130).
- **If not:** every `login exit N` line in setup.log (gh may exit with 2; then the note can be missing, but the setup must still carry on).
- Stay logged out until check 15: in checks 13 and 14, answer n to "Log in to the Console now?".

### 13. Ctrl-C in the setup window, and the lock
Still logged out of gh. Paste the one-liner in two windows and press Enter in both within a second. In the one that runs, answer y to "Log in to GitHub now?" and press Ctrl-C in the **setup** window while the gh login window is open. Run again, and this time close the setup window with its X in the middle of a step; open a new window and run again.
- **Expect:** the second window prints "The setup is already running in another window (PID n, since HH:mm). Wait for it to finish, or close that window, then run the same command again." and exits. Ctrl-C stops the setup within about a second, the login window closes, and `Test-Path "$env:USERPROFILE\.workshop-claude\.lock"` is False. After the X, the next run starts normally, with no "already running".
- **If not:** the usual files and whether an installer is still in Task Manager.

### 14. Keys typed ahead, and odd answers
Still logged out of gh. Run the install; while the steps run, press Enter three times and type a few letters, and paste the one-liner once more. At "Log in to GitHub now?" answer `maybe`, then `  n  `.
- **Expect:** the question waits for a fresh answer (the stray keys and the pasted text are discarded, not taken as an answer). `maybe` gives "Please answer y (yes) or n (no)." and the same question; `  n  ` counts as no. Step 6 then shows E-GH-02 with its fix, and the setup does **not** ask "Do you want Claude to analyze this error?".
- **If not:** the usual files; setup.log records the answer it took.

### 15. No console
Logged out of Claude Code (as in check 12):
```powershell
echo n | powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.workshop-claude\setup-windows.ps1"
```
- **Expect:** step 3 fails with E-AUTH-01 **and** the note "This window is not an interactive terminal (an AI agent, an IDE task or a script)...". No red error about FlushInputBuffer.
- **Afterwards:** run the install normally and finish the Claude and GitHub logins (checks 16 to 38 need them). **If not:** the usual files.

### 16. Stale HTTPS_PROXY from the office
```powershell
$env:HTTPS_PROXY = 'http://user:pw@127.0.0.1:9'
```
In the same window, run the install.
- **Expect:** step 0 has the note "System proxy: http://127.0.0.1:9 (HTTPS_PROXY)" (no `user:pw`) and the warning E-NET-03, no E-NET-05. Step 12 fails at once with E-NET-03, not after about 3 minutes with E-NET-05. `settings.json` gets no `env.HTTPS_PROXY`, and `Select-String -Path "$env:USERPROFILE\.workshop-claude\setup.log" -Pattern 'user:pw'` finds nothing. The first E-NET-03 command clears it.
- **If not:** the usual files.

### 17. Dead system proxy
Settings > Network & internet > Proxy > Manual proxy setup: address `127.0.0.1`, port `9`, save. In a new window, run the check.
- **Expect:** E-NET-03 with `http://127.0.0.1:9`; downloads that fail show E-NET-03, not E-NET-01; `$env:HTTPS_PROXY` is still empty afterwards.
- **Afterwards:** turn the manual proxy off. **If not:** the usual files.

### 18. Dead proxy saved in settings.json
Open `%USERPROFILE%\.claude\settings.json` in Notepad and add `"HTTPS_PROXY": "http://127.0.0.1:9"` inside `"env"`. Run the check, then the install.
- **Expect:** step 0 has the note "Claude Code is set to use a proxy that does not answer..." with the settings.json path, and step 12 shows E-NET-08 at once. The E-NET-08 command (`Select-String ... -Pattern proxy`) finds the line. Since you added it by hand, the install keeps it and step 12 still shows E-NET-08.
- **Afterwards:** restore `settings.json.bak`. **If not:** the usual files.

### 19. GitHub with no answer from the network
With gh logged in:
```powershell
$env:HTTPS_PROXY = 'http://10.255.255.1:3128'
```
Run the check in the same window, then the install.
- **Expect:** step 6 shows E-GH-03 with the hosts (for example `github.com`) after about 25 s, not E-GH-02 after 2 minutes; no "Log in to GitHub now?" question; no gh download. The acli check in step 7 also takes about 25 s.
- **If not:** if step 6 shows E-GH-02, run `Measure-Command { gh auth status 2>&1 | Out-Host }` in the same window and send the time and the output.

### 20. Company gateway down
```powershell
$env:ANTHROPIC_BASE_URL = 'https://ana:pw@gw.invalid.example:8443/v1'
```
Run the check, then the same command with `-Doctor` instead of `-Check`.
- **Expect:** within about 10 s, step 0 has E-CFG-03 (`ANTHROPIC_BASE_URL`) and E-AUTH-05 (`https://gw.invalid.example:8443/`). Step 12 shows E-AUTH-05 at once, with no "Asking Claude..." line and no "analyze this error?" question. `-Doctor` prints "Claude is not available ..." and does not call Claude. `ana:pw` is not in setup.log.
- **Then:** close the window and put `"ANTHROPIC_BASE_URL": "http://127.0.0.1:9"` in the `env` of settings.json instead. **Expect:** the same, and E-CFG-03 names the file. Restore `settings.json.bak`. **If not:** the usual files.

### 21. Stale key in the environment
Use a made-up value, never a real key:
```powershell
$env:ANTHROPIC_API_KEY = 'invalid-test-key'
```
Run the check in the same window.
- **Expect:** step 0 has the warning E-CFG-02 (`ANTHROPIC_API_KEY`), step 3 has E-AUTH-03, and step 12 fails with E-AUTH-04 `ANTHROPIC_API_KEY`, not E-AUTH-01 ("log in"). `invalid-test-key` appears neither in the window nor in setup.log.
- **If not:** the usual files.

### 22. Bedrock switched on by mistake
```powershell
$env:CLAUDE_CODE_USE_BEDROCK = '1'
```
Run the install in the same window.
- **Expect:** step 0 has the warning E-CFG-04 `CLAUDE_CODE_USE_BEDROCK (shell)`; step 3 fails with E-CFG-04 and no Console login is offered; step 12 is "Not run", with no 90 s wait.
- **Then:** close the window and put `"CLAUDE_CODE_USE_BEDROCK": true` in the `env` of settings.json; the check shows the file path. Restore `settings.json.bak`. **If not:** the usual files, plus the `auth:` line of setup.log (its `apiProvider=` value).

### 23. Broken ~\.claude.json
Run `Get-FileHash "$env:USERPROFILE\.claude.json"`, then open the file in Notepad, add a comma before the last `}` and save. Run the check and `Get-FileHash` again.
- **Expect:** step 2 fails with E-CC-04 and the path; steps 3, 7 and 12 are "Not run"; the hash is unchanged.
- **Then:** restore `claude.json.bak`, save it once in Notepad as "UTF-8 with BOM", and run the check: step 2 passes. Restore the backup again. **If not:** the usual files; say so if setup.log has ".claude.json: no strict JSON parser here, not checked".

### 24. An old claude ahead of the kit's
```powershell
$env:Path = "$env:USERPROFILE\.workshop-claude\node;$env:Path"
npm i -g --prefix "$env:APPDATA\npm" @anthropic-ai/claude-code@1.0.128
```
In "Edit environment variables for your account", move `%APPDATA%\npm` **before** `%USERPROFILE%\.local\bin` in your user `Path`. Run the install, then open a new window and run `(Get-Command claude).Source` and `claude --version`. Run the install a second time.
- **Expect:** setup.log has "user PATH: workshop folders moved to the front (...)"; in the new window claude is `...\.local\bin\claude.exe` with the kit version. The second run has no "moved to the front" line.
- **Afterwards:** `npm rm -g --prefix "$env:APPDATA\npm" @anthropic-ai/claude-code` and remove `%APPDATA%\npm` from the user Path. Known limit: a claude in a Machine PATH folder still wins (only uninstalling it fixes that). **If not:** the usual files and the user Path.

### 25. Old MCP entries
```powershell
claude mcp remove atlassian -s user
claude mcp add --transport sse --scope user atlassian https://mcp.atlassian.com/v1/sse
claude mcp remove agent-memory -s user
claude mcp add --scope user agent-memory -- C:\nope\agent-memory.exe mcp
```
Run the check, then the install, then `claude mcp get atlassian` and `claude mcp get agent-memory`.
- **Expect:** the check shows step 7 E-MCP-01 `atlassian: https://mcp.atlassian.com/v1/sse` and a step 10 warning E-MEM-03 `mcp`. The install repairs both, with the notes "The atlassian MCP pointed to ..." and "The agent-memory MCP pointed to C:\nope\agent-memory.exe...".
- **If not:** the usual files and the output of both `claude mcp get` (they must have `  URL:` and `  Command:` lines; without them these checks accept anything).

### 26. ~\.local\bin blocked, or a file
```powershell
icacls "$env:USERPROFILE\.local\bin" /deny "${env:USERNAME}:(OI)(CI)W"
```
Run the check, try the command it suggests, run the check again, then undo with `icacls "$env:USERPROFILE\.local\bin" /remove:d "$env:USERNAME"`. Next:
```powershell
Rename-Item "$env:USERPROFILE\.local\bin" bin.keep
Set-Content "$env:USERPROFILE\.local\bin" x
```
Run the check, run the command it suggests, then `Rename-Item "$env:USERPROFILE\.local\bin.keep" bin` and run the check again.
- **Expect:** step 0 warns E-PERM-01 with `~\.local\bin` and one "To fix it, run this command" line: an `icacls ... /grant` on that folder only, never the whole profile. With the file: E-PERM-01 "(not a folder)" and a `Rename-Item -LiteralPath ... -NewName "bin.old"` command. The last check is OK.
- **If not:** the usual files, and **say whether the suggested `/grant` fixed the deny** (we expect it does not).

### 27. Other folders not writable
One at a time, run the check after each, then undo:
```powershell
attrib +R "$env:USERPROFILE\.claude.json"
icacls "$env:USERPROFILE\.workshop-claude" /deny "${env:USERNAME}:(OI)(CI)W"
icacls "$env:USERPROFILE\.agent-memory" /deny "${env:USERNAME}:(OI)(CI)W"
attrib +R "$env:USERPROFILE\.workshop-claude\setup.log"
```
Undo with `attrib -R ...` and `icacls ... /remove:d "$env:USERNAME"`.
- **Expect:** `.claude.json` is listed under E-PERM-01 with `attrib -R`. `.workshop-claude`: E-PERM-01 with an icacls command, exit code 1, no red error. `.agent-memory`: step 10 warns E-MEM-07 with an icacls note, and the MCP stays registered. Read-only setup.log: a `setup.log.unwritable-<timestamp>` appears and a new setup.log starts.
- **If not:** the usual files.

### 28. Start menu shortcut cannot be created
```powershell
$p = [Environment]::GetFolderPath('Programs')
Remove-Item "$p\Agent Memory.lnk"
```
Run the check. Then `icacls $p /deny "${env:USERNAME}:(OI)(CI)W"`, run the check and the install. Undo with `icacls $p /remove:d "$env:USERNAME"` and run the install again.
- **Expect:** first a warning E-SETUP-01 (shortcut). With the deny: E-MEM-06 with `~\AppData\Roaming\Microsoft\Windows\Start Menu\Programs`; `claude mcp get agent-memory` still works; summary.txt shows "Couldn't create the Agent Memory shortcut (E-MEM-06)" and "There are N warnings above". After the undo, the shortcut is back and the app is not reinstalled (no new `uv tool install` in setup.log).
- **If not:** the usual files.

### 29. A comment in settings.json
Add a line `// test` at the top of `%USERPROFILE%\.claude\settings.json`. Run the install, then the check.
- **Expect:** step 8 fails with E-CFG-05 and `...\.claude\settings.json - not valid JSON at line N, column M ...`; the summary row does not say "0 skills, 0 agents". The check shows the same.
- **Afterwards:** restore `settings.json.bak`. **If not:** the usual files.

### 30. -Doctor after a failed step
```powershell
Add-Content "$env:USERPROFILE\.workshop-claude\setup.log" '00:00:00 result step 10: aviso E-MEM-03|uv tool install'
uv tool uninstall agent-memory
```
Run the check, then the same command with `-Doctor` (costs under US$ 0.01), then the install to put the app back.
- **Expect:** the check shows step 10 E-SETUP-01 plus E-MEM-03 (uv tool install). `-Doctor` gives a diagnosis that uses the step 10 output, with no made-up tool call.
- **If not:** the usual files and the diagnosis text.

### 31. The saved setup updates itself
```powershell
Add-Content "$env:USERPROFILE\.workshop-claude\setup-windows.ps1" '# test'
```
Run the check, `echo $LASTEXITCODE`, then the check again. Next, run `Get-ChildItem "$env:USERPROFILE\.workshop-claude\kit-src"` to see the tag folder, write `x` into `kit-src\<tag>\.ws-kit-ok` with `Set-Content`, and run the check and then the install.
- **Expect:** setup.log has "saved setup-windows.ps1 updated from the release"; there is one summary, not two, and the exit code is that run's; the second check updates nothing. With the broken `.ws-kit-ok` the check downloads nothing, and the install logs "kit-src <tag> is not the published kit ... downloading it again".
- **If not:** the usual files and `Get-FileHash` of the saved copy.

### 32. The Arena has its own history
```powershell
cd "$env:USERPROFILE\workshop-claude\demo-project"
git rev-list --max-parents=0 HEAD
git tag -d arena-start
```
Run the install, then the check.
- **Expect:** step 9 is "Done with warning" with E-DEMO-04 "The Arena has its own git history: I left it as it is", the folder, and a `Rename-Item ... demo-project-old` line. Your commits are still there (`git log`). The check shows the same warning, not E-SETUP-01 or E-DEMO-01.
- **Afterwards:** `git tag arena-start <the commit printed above>`. **If not:** the usual files.

### 33. Arena rebuild: git in the profile, folder in use, line endings
```powershell
cd $env:USERPROFILE
git init
git -c user.name=test -c user.email=test@example.com commit --allow-empty -m x
git tag arena-start
Remove-Item -Recurse -Force "$env:USERPROFILE\workshop-claude\demo-project\.git"
```
Run the check. In a second window, `cd "$env:USERPROFILE\workshop-claude\demo-project"` and leave it there; run the install. Close the second window and run the install again. Then `git -C "$env:USERPROFILE\workshop-claude\demo-project" status` and `git -C "$env:USERPROFILE\workshop-claude\demo-project" config core.autocrlf`.
- **Expect:** the check shows step 9 missing (E-SETUP-01 or E-DEMO-01), not OK. The first install fails with E-DEMO-01 "...could not move ... (is it open in another program?)" and deletes nothing. The second rebuilds the Arena with the note "Your previous folder is saved in %USERPROFILE%\.workshop-claude\backup\<date>\demo-project." (backslashes). `status` is clean and `core.autocrlf` is false.
- **Afterwards:** `Remove-Item -Recurse -Force "$env:USERPROFILE\.git"`. **If not:** the usual files.

### 34. Signed tags with no gpg
```powershell
git config --global tag.gpgsign true
git config --global commit.gpgsign true
cd "$env:USERPROFILE\workshop-claude\demo-project"
git tag arena-inicial arena-start
git tag -d arena-start
```
Run the install, then `git cat-file -t arena-start`.
- **Expect:** no editor or pinentry window opens, step 9 is done, and `git cat-file` prints `commit`.
- **Afterwards:** `git config --global --unset tag.gpgsign` and `git config --global --unset commit.gpgsign`. **If not:** the usual files.

### 35. An edited skill
```powershell
Add-Content "$env:USERPROFILE\.claude\skills\task-plan\SKILL.md" 'local edit'
```
Run the install.
- **Expect:** step 8 has the note "You had changed task-plan: your copy is saved in %USERPROFILE%\.workshop-claude\backup\...\edited\skills\task-plan, and the kit's version is back in its place."
- **If not:** the usual files.

### 36. Language choice
In a new window, `$env:WORKSHOP_LANG = 'br'` and the check. In another new window, set `WORKSHOP_LANG` to the language you did **not** install (`en` or `pt-PT`), run the check, then the install. In a third window with no `WORKSHOP_LANG`, run the check. Finally, put your language back with `WORKSHOP_LANG` and the install.
- **Expect:** `br` gives "WORKSHOP_LANG=br is not one of the workshop languages (pt-BR, pt-PT, en, hi or he), so I ignored it and used ..." and the kit keeps its language. The other language gives, in the check, the step 8 note "Language installed here: ..." and a step 9 note that the projects are in the old language; after the install, `kit\language.json` has the new language and the projects are untouched. Without the variable: "Kept the language chosen at install (...); this computer is in ...".
- **If not:** the usual files and `Get-Content "$env:USERPROFILE\.workshop-claude\kit\language.json"`.

### 37. Git Bash not first on the PATH
```powershell
$env:Path = "$env:LOCALAPPDATA\Programs\Git\mingw64\bin;$env:ProgramFiles\Git\mingw64\bin;$env:Path"
(Get-Command git).Source
```
In the same window, run the check, then the install.
- **Expect:** git is the `mingw64\bin` one; no false E-GIT-03; `Test-Path ((Get-Content "$env:USERPROFILE\.claude\settings.json" -Raw | ConvertFrom-Json).env.CLAUDE_CODE_GIT_BASH_PATH)` is True.
- **If not:** the usual files.

### 38. Uninstall keeps what is yours (do it last)
Run the uninstall. Then add your own `.local\bin` entry, written literally, paste the one-liner to install again, and uninstall again:
```powershell
$old = (Get-Item HKCU:\Environment).GetValue('Path', $null, 'DoNotExpandEnvironmentNames')
Set-ItemProperty HKCU:\Environment Path ('%USERPROFILE%\.local\bin;' + $old) -Type ExpandString
```
- **Expect:** the first uninstall says "PATH lines removed from ..." and `.local\bin` leaves the user Path; settings.json is back to what it was. After the install, there is no second `C:\Users\<you>\.local\bin` entry, the `%USERPROFILE%` text stays, and `(Get-Item HKCU:\Environment).GetValueKind('Path')` is ExpandString. After the second uninstall, your entry is still there.
- **If not:** the usual files and the user Path before and after. This check also covers W12.

## D. Optional, if you have…

### 39. A real AD home folder on a network share
Repeat check 5 without `subst`. **Expect:** the same; nothing is written to the share. **If not:** the usual files and `$HOME`.

### 40. AppData on a network share (roaming profile)
Run the check. **Expect:** the step 0 note "Your AppData folder is on a network share (...). uv keeps the Python and the tools of the Agent Memory app in ... instead.", and step 10 OK. **If not:** the usual files.

### 41. Windows 11 with Windows Terminal as the default terminal
Repeat check 12 (Console login only). **Expect:** the login opens in a Windows Terminal window or tab, with the same results and a `login exit N` line after Ctrl-C. **If not:** the usual files.

### 42. A slow network or a phone hotspot
Delete `%USERPROFILE%\.workshop-claude\bin\gh.exe` and run the install; switch the Wi-Fi off in the middle of the gh download. **Expect:** E-NET-07 "The download failed" (not E-NET-01), and setup.log shows `(..., partial)`. On a fresh install, step 2 shows "Still downloading… N MB so far." about every 30 s, and N grows. **If not:** the usual files; if N stays at 0.0, list `%USERPROFILE%\.claude` and `%USERPROFILE%\.local\share\claude`.

### 43. A captive portal or a web-filter block page
Run the one-liner and the install behind it. **Expect:** the bootstrap says "ERROR: a web page came instead of the setup (<url>)...", and a step shows E-NET-01 with "... - a web page came instead of the file"; nothing is installed from it. **If not:** the usual files.

### 44. A network that inspects TLS only for github.com or pypi.org
Run the install. **Expect:** step 10 either succeeds after the setup.log line "uv: certificate error, retrying with UV_SYSTEM_CERTS=true", or fails with E-NET-04 (not E-MEM-03). **If not:** the usual files.

### 45. An antivirus or AppLocker rule you can set
Block `%USERPROFILE%\.workshop-claude\bin\gh.exe` and run the check: step 6 shows E-PERM-02 with the path, not E-SETUP-01 or E-GH-01. Block `git.exe`: the Arena is not moved to backup, and step 9 fails with E-PERM-02 (or E-DEMO-01 "git rev-parse HEAD: ..."). **If not:** the usual files.

### 46. Developer Mode (symbolic links)
```powershell
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.claude\settings.json" -Target C:\dotfiles\claude\settings.json
```
Install, then uninstall. **Expect:** settings.json is still a link (`(Get-Item ...).LinkType` is SymbolicLink), the target has the kit's keys, and the link survives the uninstall. **If not:** the usual files.

### 47. An old uv (0.4.x)
Put its `uv.exe` in `C:\olduv`, then `$env:Path = 'C:\olduv;' + $env:Path` and the check. **Expect:** step 5 OK with the kit's uv version plus the warning E-UV-02 `C:\olduv\uv.exe: uv 0.4.x`; step 10 OK. **If not:** the usual files.

### 48. A newer Agent Memory app version
With Claude Code open (the agent-memory MCP server running), run the install so that step 10 reinstalls the app. **Expect:** if uv says "Access is denied (os error 5)", step 10 shows its own code (E-MEM-03 or the step 10 warning), not E-PERM-01. Close Claude Code and run again: it installs. **If not:** the usual files.

### 49. Small extras, if time is left
`$env:NO_COLOR = 1` and the check: no colours, same text. `Get-Help "$env:USERPROFILE\.workshop-claude\setup-windows.ps1" -Detailed` shows the language paragraph. Three invalid answers in a row to a y/n question count as no. With only `kit\lingua.json` `{"kit":"pt","maquina":"pt-BR"}` (no `language.json`), the check uses pt-BR. **If not:** the usual files.

### 50. Pester on Windows PowerShell 5.1
From a clone of the repo, in a separate Windows PowerShell 5.1 window:
```powershell
Install-Module Pester -Scope CurrentUser -RequiredVersion 5.7.1 -Force -SkipPublisherCheck
Import-Module Pester -RequiredVersion 5.7.1
Invoke-Pester -Path setup/test/setup-windows.Tests.ps1
```
**Expect:** 0 failed (a few tests are skipped on Windows). Run it in its own window: the tests set `WS_NO_MAIN=1`. **If not:** the names of the failed tests and their messages.
