# Gomoku Game (五子棋游戏)

一个基于 Python 和 Pygame 开发的五子棋游戏，支持人机对战。

## 功能特点

- 🎮 流畅的游戏界面
- 🤖 AI 对手（基于 Minimax 算法）
- 🎯 智能落子提示
- ↩️ 悔棋功能
- 🔄 重新开始游戏

## 运行要求

- Python 3.x
- Pygame

## 安装依赖

```bash
pip install pygame
```

## 运行游戏

```bash
python gomoku.py
```

## 游戏规则

- 玩家使用黑子，AI 使用白子
- 点击棋盘落子
- 先连成五子者获胜
- 支持横、竖、斜四个方向

## 操作说明

- **鼠标点击**：在棋盘上落子
- **悔棋按钮**：撤销上一步
- **重新开始**：开始新游戏

## 技术实现

- 使用 Pygame 进行图形界面渲染
- Minimax 算法实现 AI 决策
- 启发式评估函数优化 AI 棋力

## 许可证

MIT License
