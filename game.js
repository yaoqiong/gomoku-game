/**
 * 五子棋游戏核心逻辑
 * 使用 IIFE 封装，避免全局命名污染，防止变量冲突与控制台篡改
 */
(function () {
    'use strict';

    // =====================
    // 常量与配置
    // =====================
    const GRID_SIZE = 15;           // 棋盘格数（15x15 标准五子棋）
    const MAX_RADIUS_RATIO = 0.45;  // 棋子半径占格子尺寸的比例

    // =====================
    // DOM 元素获取与错误检查
    // =====================
    const canvas = document.getElementById('board');
    const currentPlayerEl = document.getElementById('current-player');
    const messageEl = document.getElementById('message');
    const resetBtn = document.getElementById('reset-btn');
    const undoBtn = document.getElementById('undo-btn');

    // 检查必要的 DOM 元素与 Canvas API 是否可用
    if (!canvas || !canvas.getContext) {
        console.error('五子棋：找不到 Canvas 元素或浏览器不支持 Canvas API');
        return;
    }

    const ctx = canvas.getContext('2d');

    // =====================
    // HiDPI / Retina 屏幕适配
    // =====================
    /**
     * 根据 devicePixelRatio 对 Canvas 进行高清缩放，
     * 同时实现响应式尺寸（在小屏设备上自动缩小）。
     * @returns {number} 棋盘的逻辑尺寸（CSS 像素）
     */
    function setupHiDPI() {
        const dpr = window.devicePixelRatio || 1;
        // 响应式：最大 600px，留出页面边距
        const styleSize = Math.min(window.innerWidth - 40, 600);

        // 设置 CSS 显示尺寸
        canvas.style.width = styleSize + 'px';
        canvas.style.height = styleSize + 'px';

        // 设置实际像素缓冲区（乘以 dpr，保证 Retina 清晰）
        canvas.width = Math.round(styleSize * dpr);
        canvas.height = Math.round(styleSize * dpr);

        // 缩放绘图上下文，后续绘制坐标仍以 CSS 像素为单位
        ctx.scale(dpr, dpr);

        return styleSize;
    }

    /** 棋盘逻辑尺寸（CSS 像素），随窗口变化更新 */
    let logicalSize = setupHiDPI();
    /** 每格逻辑尺寸 */
    let cellSize = logicalSize / GRID_SIZE;

    // =====================
    // 游戏状态（模块私有变量）
    // =====================
    /** 15×15 棋盘数组，值为 null / 'black' / 'white' */
    let board = [];
    /** 当前轮到的玩家：'black' 或 'white' */
    let currentPlayer = '';
    /** 游戏是否已结束 */
    let gameOver = false;
    /** 悔棋历史，每项记录 { row, col, player } */
    let history = [];

    // =====================
    // 初始化
    // =====================
    /**
     * 重置所有游戏状态并重绘空棋盘。
     * 开局及点击"重新开始"时调用。
     */
    function init() {
        board = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
        currentPlayer = 'black';
        gameOver = false;
        history = [];

        if (messageEl) {
            messageEl.textContent = '';
            messageEl.style.color = '#e74c3c';
        }
        if (currentPlayerEl) {
            currentPlayerEl.textContent = '当前玩家: 黑方';
        }

        canvas.style.cursor = 'pointer';
        updateUndoBtn();
        drawBoard();
    }

    // =====================
    // 绘制函数
    // =====================
    /**
     * 全量重绘：棋盘底色 → 网格线 → 星位 → 所有棋子 → 结束遮罩（如有）。
     * 在初始化、悔棋、窗口缩放时调用。
     */
    function drawBoard() {
        const size = logicalSize;

        // 棋盘底色（木色）
        ctx.fillStyle = '#daa520';
        ctx.fillRect(0, 0, size, size);

        // 网格线
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;

        for (let i = 0; i < GRID_SIZE; i++) {
            // 横线
            ctx.beginPath();
            ctx.moveTo(cellSize / 2, cellSize / 2 + i * cellSize);
            ctx.lineTo(size - cellSize / 2, cellSize / 2 + i * cellSize);
            ctx.stroke();

            // 竖线
            ctx.beginPath();
            ctx.moveTo(cellSize / 2 + i * cellSize, cellSize / 2);
            ctx.lineTo(cellSize / 2 + i * cellSize, size - cellSize / 2);
            ctx.stroke();
        }

        drawStarPoints();
        drawPieces();

        // 游戏已结束时叠加遮罩
        if (gameOver) {
            drawGameOverOverlay();
        }
    }

    /**
     * 绘制标准 15 路棋盘的五个星位（天元 + 四星）。
     */
    function drawStarPoints() {
        const starPoints = [
            [3, 3], [3, 11], [11, 3], [11, 11], // 四星
            [7, 7]                                 // 天元
        ];
        ctx.fillStyle = '#000';
        for (const [r, c] of starPoints) {
            ctx.beginPath();
            ctx.arc(
                cellSize / 2 + c * cellSize,
                cellSize / 2 + r * cellSize,
                4, 0, Math.PI * 2
            );
            ctx.fill();
        }
    }

    /**
     * 遍历棋盘数组，绘制所有已落的棋子。
     */
    function drawPieces() {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (board[r][c]) {
                    drawPiece(r, c, board[r][c]);
                }
            }
        }
    }

    /**
     * 在指定交叉点绘制一枚棋子（含径向渐变提升立体感）。
     * @param {number} row   - 行索引 (0 ~ GRID_SIZE-1)
     * @param {number} col   - 列索引 (0 ~ GRID_SIZE-1)
     * @param {string} color - 棋子颜色：'black' 或 'white'
     */
    function drawPiece(row, col, color) {
        const x = cellSize / 2 + col * cellSize;
        const y = cellSize / 2 + row * cellSize;
        const radius = cellSize * MAX_RADIUS_RATIO;

        // 径向渐变，模拟光泽
        const gradient = ctx.createRadialGradient(
            x - radius * 0.3, y - radius * 0.3, radius * 0.1,
            x, y, radius
        );

        if (color === 'black') {
            gradient.addColorStop(0, '#666');
            gradient.addColorStop(1, '#000');
        } else {
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(1, '#bbb');
        }

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = color === 'black' ? '#333' : '#999';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    /**
     * 游戏结束时，在棋盘上叠加半透明遮罩，
     * 给予视觉反馈表明棋盘已禁用。
     */
    function drawGameOverOverlay() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, logicalSize, logicalSize);
        canvas.style.cursor = 'not-allowed';
    }

    // =====================
    // 坐标转换
    // =====================
    /**
     * 将 CSS 像素坐标映射到棋盘交叉点（行、列）。
     * 加入容差校验：仅当距最近交叉点 <= cellSize/2 时才认为有效。
     *
     * @param {number} pixelX - 相对于 canvas 左上角的 X（CSS 像素）
     * @param {number} pixelY - 相对于 canvas 左上角的 Y（CSS 像素）
     * @returns {{ row: number, col: number } | null} 有效交叉点，否则 null
     */
    function getGridPosition(pixelX, pixelY) {
        const col = Math.round((pixelX - cellSize / 2) / cellSize);
        const row = Math.round((pixelY - cellSize / 2) / cellSize);

        // 边界检查
        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
            return null;
        }

        // 容差检查：点击点与交叉点的距离不得超过半格
        const snapX = cellSize / 2 + col * cellSize;
        const snapY = cellSize / 2 + row * cellSize;
        const dist = Math.sqrt((pixelX - snapX) ** 2 + (pixelY - snapY) ** 2);

        if (dist > cellSize / 2) {
            return null;
        }

        return { row, col };
    }

    // =====================
    // 落子逻辑
    // =====================
    /**
     * 处理一次落子动作（由鼠标点击或触摸事件触发）。
     * @param {number} pixelX - canvas 内 X 坐标（CSS 像素）
     * @param {number} pixelY - canvas 内 Y 坐标（CSS 像素）
     */
    function handlePlace(pixelX, pixelY) {
        if (gameOver) return;

        const pos = getGridPosition(pixelX, pixelY);
        if (!pos) return; // 点击位置超出有效交叉点

        const { row, col } = pos;

        // 已有棋子：提示用户而非静默忽略
        if (board[row][col]) {
            if (messageEl) {
                messageEl.textContent = '该位置已有棋子，请重新选择';
                messageEl.style.color = '#e67e22';
            }
            return;
        }

        // 清除上一条提示
        if (messageEl) {
            messageEl.textContent = '';
            messageEl.style.color = '#e74c3c';
        }

        // 记录本步到历史（支持悔棋）
        history.push({ row, col, player: currentPlayer });

        // 落子并增量绘制（性能优化：仅绘制新增棋子）
        board[row][col] = currentPlayer;
        drawPiece(row, col, currentPlayer);

        // 胜负判断
        if (checkWin(row, col)) {
            gameOver = true;
            const winner = currentPlayer === 'black' ? '黑方' : '白方';
            if (messageEl) {
                messageEl.textContent = `🎉 ${winner}获胜！`;
                messageEl.style.color = '#27ae60';
            }
            drawGameOverOverlay();
            updateUndoBtn();
            return;
        }

        // 平局判断（棋盘落满）
        if (history.length === GRID_SIZE * GRID_SIZE) {
            gameOver = true;
            if (messageEl) {
                messageEl.textContent = '平局！棋盘已满';
                messageEl.style.color = '#7f8c8d';
            }
            drawGameOverOverlay();
            updateUndoBtn();
            return;
        }

        // 切换玩家
        currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
        if (currentPlayerEl) {
            currentPlayerEl.textContent = `当前玩家: ${currentPlayer === 'black' ? '黑方' : '白方'}`;
        }

        updateUndoBtn();
    }

    // =====================
    // 悔棋
    // =====================
    /**
     * 撤销上一步落子，恢复棋盘状态、玩家顺序及界面显示。
     * 若游戏已结束，悔棋也可恢复继续对局。
     */
    function undoMove() {
        if (history.length === 0) return;

        const last = history.pop();
        board[last.row][last.col] = null;
        currentPlayer = last.player;
        gameOver = false;

        if (messageEl) {
            messageEl.textContent = '';
            messageEl.style.color = '#e74c3c';
        }
        if (currentPlayerEl) {
            currentPlayerEl.textContent = `当前玩家: ${currentPlayer === 'black' ? '黑方' : '白方'}`;
        }

        canvas.style.cursor = 'pointer';
        updateUndoBtn();
        drawBoard(); // 悔棋后需全量重绘以移除被撤销的棋子
    }

    /**
     * 根据历史记录是否为空，同步更新悔棋按钮的可用状态。
     */
    function updateUndoBtn() {
        if (undoBtn) {
            undoBtn.disabled = history.length === 0;
        }
    }

    // =====================
    // 胜负判定
    // =====================
    /**
     * 检查最近落子后当前玩家是否已连成五子（含五子以上）。
     * @param {number} row - 刚落子的行
     * @param {number} col - 刚落子的列
     * @returns {boolean} 是否获胜
     */
    function checkWin(row, col) {
        // 四个方向：横向、纵向、右斜（↘）、左斜（↙）
        const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];

        for (const [dr, dc] of directions) {
            // 正方向 + 反方向连子数 + 落子点本身
            const count = 1
                + countDirection(row, col, dr, dc)
                + countDirection(row, col, -dr, -dc);

            if (count >= 5) return true;
        }
        return false;
    }

    /**
     * 沿指定方向统计与落子点同色的连续棋子数。
     * @param {number} row - 起始行
     * @param {number} col - 起始列
     * @param {number} dr  - 行方向步长（-1、0 或 1）
     * @param {number} dc  - 列方向步长（-1、0 或 1）
     * @returns {number} 该方向上的连续同色棋子数（不含起始点）
     */
    function countDirection(row, col, dr, dc) {
        let count = 0;
        let r = row + dr;
        let c = col + dc;

        while (
            r >= 0 && r < GRID_SIZE &&
            c >= 0 && c < GRID_SIZE &&
            board[r][c] === currentPlayer
        ) {
            count++;
            r += dr;
            c += dc;
        }

        return count;
    }

    // =====================
    // 事件绑定
    // =====================

    /** 鼠标点击落子 */
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        handlePlace(e.clientX - rect.left, e.clientY - rect.top);
    });

    /**
     * 移动端触摸落子支持（touchend 避免与页面滚动冲突）。
     * passive: false 允许调用 preventDefault 阻止双触发。
     */
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault(); // 阻止 touchend 后续触发的 click 事件
        const touch = e.changedTouches[0];
        const rect = canvas.getBoundingClientRect();
        handlePlace(touch.clientX - rect.left, touch.clientY - rect.top);
    }, { passive: false });

    /** 重新开始 */
    if (resetBtn) {
        resetBtn.addEventListener('click', init);
    }

    /** 悔棋 */
    if (undoBtn) {
        undoBtn.addEventListener('click', undoMove);
    }

    /**
     * 响应式处理：窗口缩放时重新计算棋盘尺寸并重绘。
     */
    window.addEventListener('resize', () => {
        logicalSize = setupHiDPI();
        cellSize = logicalSize / GRID_SIZE;
        drawBoard();
    });

    // =====================
    // 游戏启动
    // =====================
    init();

})(); // IIFE 结束
