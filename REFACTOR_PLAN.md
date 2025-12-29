# Refactoring Plan

## Current Problems

### 1. claude.ts 职责过多 (~430行)
- API 客户端管理
- 内存文件读取
- 文件写入
- 内容生成
- Thinking 解析

### 2. Prompt 问题
- User prompt 解释 JSON 格式 → structured outputs 已处理
- System prompt "record a reflection" 表述模糊

### 3. 代码组织
- 死代码: `parseThinkingToThread()` 不再使用
- 类型分散: `InteractionDecision`, `ContentResult` 在 claude.ts
- 常量分散: `INTERESTING_TOPICS`, `INTERESTING_ACCOUNTS` 在 index.ts

## Target Structure

```
src/
  index.ts      - 主流程编排
  config.ts     - 常量 (topics, accounts) + prompts
  memory.ts     - 内存读写 (loadMemory, updatePriorities, etc.)
  api.ts        - Claude API (generateContent)
  twitter.ts    - Twitter API (不变)
  state.ts      - 状态持久化 (不变)
  types.ts      - 所有类型定义
```

## Steps

### Step 1: Create config.ts
Move from index.ts:
- `INTERESTING_TOPICS`
- `INTERESTING_ACCOUNTS`

Move from claude.ts:
- `SYSTEM_PROMPT`
- `ContentSchema` (Zod schema)

### Step 2: Create memory.ts
Move from claude.ts:
- `loadCustomTopics()`
- `updateSearchTopics()`
- `updatePriorities()`
- `loadRecentTweets()`
- `loadMemory()`

### Step 3: Simplify claude.ts → api.ts
Keep only:
- `initClaude()`
- `getApiCalls()`, `clearApiCalls()`
- `generateContent()` (simplified, imports from config/memory)

Remove:
- `parseThinkingToThread()` - dead code
- All memory-related functions (moved to memory.ts)

### Step 4: Consolidate types.ts
Move from claude.ts:
- `InteractionDecision`
- `ContentResult`

### Step 5: Update index.ts
- Update imports
- Remove `INTERESTING_TOPICS`, `INTERESTING_ACCOUNTS`

### Step 6: Simplify prompts
User prompt: Remove JSON format explanation (Zod handles it)
System prompt: Clarify reflection is an output field

### Step 7: Build & Review
- `npm run build`
- Review each file for clarity
- Check no dead imports/exports

## File Dependencies (after refactor)

```
config.ts     → (standalone, exports constants)
types.ts      → (standalone, exports types)
memory.ts     → types.ts
api.ts        → config.ts, memory.ts, types.ts
twitter.ts    → types.ts
state.ts      → types.ts
index.ts      → api.ts, twitter.ts, state.ts, memory.ts, config.ts, types.ts
```
