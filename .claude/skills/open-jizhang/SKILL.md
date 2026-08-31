---
name: open-jizhang
description: 快速打开「十一记账」应用窗口（打包版，秒开）
---

# 打开十一记账

当用户调用本技能时，立即启动「十一记账」应用。

## 操作步骤

1. 用后台方式运行下面的命令（`run_in_background: true`）：

```bash
cd "c:/Users/fan21/ccProject/记账" && env -u ELECTRON_RUN_AS_NODE "./release/win-unpacked/十一记账.exe"
```

2. 启动后告诉用户「十一记账已打开」。

## 重要提醒

- **必须带 `env -u ELECTRON_RUN_AS_NODE`**：Claude Code 的终端会注入 `ELECTRON_RUN_AS_NODE=1`，这会让 Electron 应用无法正常启动。去掉它才能打开。
- 用后台运行，不要阻塞当前会话。

## 如果打包版不存在（尚未打包）

若 `release/win-unpacked/十一记账.exe` 不存在，改用开发模式启动：

```bash
cd "c:/Users/fan21/ccProject/记账" && env -u ELECTRON_RUN_AS_NODE npm run dev
```

## 故障排查：启动后立即退出 / 缓存报错

如果应用窗口一闪而过就退出了，或日志里出现 `Unable to move the cache` / `拒绝访问`，
说明本机应用缓存损坏（常见于之前被强制结束进程后）。

处理办法：清掉缓存目录再启动（**只清缓存，不影响账目数据**）：

```bash
rm -rf "C:/Users/fan21/AppData/Roaming/shiyi-jizhang/Cache" \
  "C:/Users/fan21/AppData/Roaming/shiyi-jizhang/Code Cache" \
  "C:/Users/fan21/AppData/Roaming/shiyi-jizhang/GPUCache" \
  "C:/Users/fan21/AppData/Roaming/shiyi-jizhang/DawnGraphiteCache" \
  "C:/Users/fan21/AppData/Roaming/shiyi-jizhang/DawnWebGPUCache"
```

清理后重新执行上面的启动命令即可。

## 说明

- 打包版启动快（无需编译），适合日常打开使用。
- 数据保存在本机 `%APPDATA%\shiyi-jizhang\`，不联网、每个用户各自独立。
- 若应用窗口被其他窗口挡住，属正常现象，手动切到任务栏即可。
