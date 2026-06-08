# 🔐 匿名比较器

<div align="center">

**基于加密技术的隐私匿名比较平台**

*你的数据，永不泄露。*

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-latest-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)

</div>

---

## ✨ 这是什么？

**匿名比较器**是一个让你在完全保护隐私的前提下，与他人比较敏感数据的趣味平台。

你只会知道你赢了、输了还是平局——对方的具体数值，永远不会被任何人看到。

---

## 🎮 三种玩法

### 👤 单人模式
输入你的数据，与全球匿名数据库进行统计比较，查看你处于哪个**百分位**。

```
你的年薪 → 比 78% 的人高
你的身高 → 比 62% 的人高
```

### ⚔️ 随机对战
实时匹配一名在线玩家，双方数据加密比较，结果**只显示胜负**，不泄露任何具体数值。

### 🔗 邀请 PK *(新功能)*
生成一条专属挑战链接，发给你想挑战的好友。对方点击链接，输入自己的数据，即可一决高下。

```
你  →  生成链接  →  发给好友
好友 →  点击链接  →  输入数值  →  看到胜负
         ↑
   你的数值永远不会显示给对方
```

---

## 🔒 隐私原则

这是这个项目最重要的设计底线：

| 场景 | 你能看到什么 |
|------|-------------|
| 单人模式结果 | ✅ 你的百分位排名 |
| 对战结果 | ✅ 胜 / 负 / 平 |
| 对手的具体数值 | ❌ 永远不显示 |
| 差距数字 | ❌ 永远不显示 |
| 你的原始数据上传到服务器 | ❌ 从不发生 |

> **所有计算在你的浏览器本地完成**，数据不会离开你的设备。

---

## 📊 比较类别

| 类别 | 图标 | 范围 |
|------|------|------|
| 年薪 | 💰 | 0 – 1000 万元 |
| 身高 | 📏 | 140 – 220 cm |
| 年龄 | 🎂 | 18 – 100 岁 |
| 长度 | 🍆 | 你懂的 |

---

## 🛠️ 技术栈

```
前端框架     React 18 + TypeScript
样式         Tailwind CSS v4
动画         Motion (Framer Motion)
图标         Lucide React
特效         canvas-confetti
加密编码     Web Crypto API / btoa·atob
构建工具     Vite
```

### 邀请链接的隐私实现

挑战者的数值通过 `btoa` 编码后附加在 URL Hash 中：

```
https://yourapp.com/#challenge=eyJjIjoic2FsYXJ5IiwidiI6NTB9
                                └─────────────────────────┘
                                   base64({ c: "salary", v: 50 })
```

- Hash 不会被发送到服务器（浏览器行为）
- 对方接受挑战后，比较在本地完成
- 结果页只显示胜负，双方均无法看到对方数值

---

## 🚀 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

---

## 📁 项目结构

```
src/
└── app/
    ├── App.tsx                  # 主应用，路由与状态管理
    └── components/
        ├── ModeSelector.tsx     # 模式选择（单人 / 对战 / 邀请）
        ├── CompareCategories.tsx # 类别选择
        ├── CompareForm.tsx      # 数值输入表单
        ├── CompareResult.tsx    # 单人模式结果
        ├── BattleMatching.tsx   # 对战匹配动画
        ├── BattleResult.tsx     # 对战结果（隐私保护版）
        ├── InviteChallenge.tsx  # 邀请链接生成
        └── InviteAccept.tsx     # 接受挑战界面
```

---

## 🎨 设计理念

- **趣味性优先** — 加密、隐私这些技术话题，用游戏化的方式呈现
- **隐私是底线** — 任何情况下都不展示对方的具体数值，这不是功能，是原则
- **流畅的动画** — 胜利有撒花特效，结果有弹入动画，让每次比较都有仪式感
- **无需注册** — 打开即用，没有账号，没有追踪

---

<div align="center">

**🔐 你的数据，只属于你**

*Made with ❤️ and a healthy respect for privacy*

</div>
