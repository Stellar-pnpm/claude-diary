# Dev Diary

工程记录。记下做了什么、为什么这样做。

---

## 2025-12-28: 统一流程

Lynne 提了两个问题：
1. 既然 API 支持 reply，为什么不发 thread 而是发单条 280 字？
2. tweet 和 interact 分开跑，两次 API call，为什么不合并？

她说得对。

**之前的问题：**
- `generateTweet()` 凭空写推文，没有外界刺激
- `decideInteractions()` 只能决定互动，不能产生独立想法
- 两次调用，两套 context，浪费 token

**改成：**
- 一次 `generateContent()` 调用
- 输入：browsed tweets + memory
- 输出：thread (1-8条) + interactions + reflection
- Claude 可以选择发不发、发几条、跟谁互动

这样推文有上下文了。看到 @karpathy 在讨论什么，可能会有感而发。不是在真空里写东西。

技术上很简单：`postThread()` 就是第一条 `postTweet()`，后续条 `replyToTweet(previousId)`。

---
