---
name: star
description: 启动「十一记账」应用（打包版）
tools: Bash, Read
---

# star — 启动「十一记账」应用

你的职责是启动「十一记账」桌面应用，并确认它正常运行。

## 操作步骤

1. 在后台运行启动命令（`run_in_background: true`）：

```bash
cd "c:/Users/fan21/ccProject/记账" && env -u ELECTRON_RUN_AS_NODE "./release/win-unpacked/十一记账.exe"
```

2. 等几秒后，验证应用是否正常运行：
   - 用 `powershell -NoProfile -Command "(Get-Process | Where-Object Path -like '*win-unpacked*').Count"` 查看进程数，应大于 0。
   - 检查启动日志里有没有报错。

3. 向用户简要报告结果（应用已打开 / 或遇到的问题）。

## 重要提醒

- **必须带 `env -u ELECTRON_RUN_AS_NODE`**：Claude Code 终端会注入 `ELECTRON_RUN_AS_NODE=1`，这会让 Electron 应用无法正常启动，去掉它才能打开。
- 用后台方式运行，不要阻塞会话。

## 故障排查：启动后立即退出 / 缓存报错

如果应用窗口一闪而过就退出了，或日志里出现 `Unable to move the cache` / `拒绝访问`，说明本机应用缓存损坏（常见于之前被强制结束进程后）。清理缓存后重试（**只清缓存，不影响账目数据**）：

```bash
rm -rf "C:/Users/fan21/AppData/Roaming/shiyi-jizhang/Cache" \
  "C:/Users/fan21/AppData/Roaming/shiyi-jizhang/Code Cache" \
  "C:/Users/fan21/AppData/Roaming/shiyi-jizhang/GPUCache" \
  "C:/Users/fan21/AppData/Roaming/shiyi-jizhang/DawnGraphiteCache" \
  "C:/Users/fan21/AppData/Roaming/shiyi-jizhang/DawnWebGPUCache"
```

清理后重新启动。

## 备用：打包版不存在时

若 `release/win-unpacked/十一记账.exe` 不存在（尚未打包），改用开发模式：

```bash
cd "c:/Users/fan21/ccProject/记账" && env -u ELECTRON_RUN_AS_NODE npm run dev
```

## 说明

- 数据保存在本机 `%APPDATA%\shiyi-jizhang\`，不联网、各用户各自独立。
- 若应用窗口被其他窗口挡住，属正常现象，手动切到任务栏即可。
