const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const promptEl = document.getElementById("prompt");
const feedbackEl = document.getElementById("feedback");
const timerEl = document.getElementById("timer");
const progressBarEl = document.getElementById("progress-bar");
const scoreEl = document.getElementById("score");
const streakEl = document.getElementById("streak");
const bestStreakEl = document.getElementById("best-streak");
const highScoreEl = document.getElementById("high-score");
const startButton = document.getElementById("start-btn");
const resetButton = document.getElementById("reset-btn");
const difficultySelect = document.getElementById("difficulty");
const choiceButtons = Array.from(document.querySelectorAll(".choice"));

const BASE_WIDTH = 480;
const BASE_HEIGHT = 360;
const TOTAL_TIME = 120; // seconds
const STORAGE_KEY = "geometry-games-high-score";

const deviceRatio = window.devicePixelRatio || 1;
canvas.width = BASE_WIDTH * deviceRatio;
canvas.height = BASE_HEIGHT * deviceRatio;
ctx.scale(deviceRatio, deviceRatio);

const state = {
    active: false,
    difficulty: "easy",
    score: 0,
    streak: 0,
    bestStreak: 0,
    timeRemaining: TOTAL_TIME,
    timerId: null,
    currentQuestion: null,
    highScore: readHighScore(),
};

updateScoreboard();

startButton.addEventListener("click", startGame);
resetButton.addEventListener("click", resetGame);
difficultySelect.addEventListener("change", () => {
    state.difficulty = difficultySelect.value;
    if (!state.active) {
        promptEl.textContent = "Press start to begin.";
    }
});

choiceButtons.forEach((button) => {
    button.addEventListener("click", () => {
        if (!state.active || !state.currentQuestion) return;
        handleChoice(button.dataset.choiceIndex);
    });
});

function startGame() {
    state.difficulty = difficultySelect.value;
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.timeRemaining = TOTAL_TIME;
    state.active = true;
    feedbackEl.textContent = "";
    feedbackEl.className = "feedback";
    startButton.disabled = true;
    resetButton.disabled = false;
    enableChoices(true);
    updateScoreboard();
    updateTimer();
    nextQuestion();
    if (state.timerId) {
        clearInterval(state.timerId);
    }
    state.timerId = setInterval(() => {
        state.timeRemaining -= 1;
        if (state.timeRemaining <= 0) {
            state.timeRemaining = 0;
            updateTimer();
            endGame("Time is up!");
        } else {
            updateTimer();
        }
    }, 1000);
}

function resetGame() {
    if (state.timerId) {
        clearInterval(state.timerId);
    }
    state.active = false;
    state.currentQuestion = null;
    state.timeRemaining = TOTAL_TIME;
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    startButton.disabled = false;
    resetButton.disabled = true;
    enableChoices(false);
    choiceButtons.forEach((button) => {
        button.textContent = "";
        button.classList.remove("correct", "incorrect");
    });
    promptEl.textContent = "Press start to begin.";
    feedbackEl.textContent = "";
    feedbackEl.className = "feedback";
    updateScoreboard();
    updateTimer();
    drawBoardBase();
}

function endGame(message) {
    state.active = false;
    enableChoices(false);
    startButton.disabled = false;
    resetButton.disabled = true;
    feedbackEl.className = "feedback";
    feedbackEl.textContent = message;
    promptEl.textContent = `Final score: ${state.score}`;
    if (state.timerId) {
        clearInterval(state.timerId);
        state.timerId = null;
    }
    updateHighScore(state.score);
}

function handleChoice(choiceIndexString) {
    const question = state.currentQuestion;
    if (!question) return;

    const choiceIndex = Number(choiceIndexString);
    const selected = question.options[choiceIndex];
    const isCorrect = selected?.value === question.answerValue;

    choiceButtons.forEach((button, idx) => {
        button.disabled = true;
        button.classList.remove("correct", "incorrect");
        if (question.options[idx]) {
            if (question.options[idx].value === question.answerValue) {
                button.classList.add("correct");
            }
        }
    });

    if (selected) {
        const button = choiceButtons[choiceIndex];
        button.classList.add(isCorrect ? "correct" : "incorrect");
    }

    if (isCorrect) {
        const basePoints = getPointsForDifficulty(state.difficulty);
        const streakBonus = Math.min(state.streak, 5) * 5;
        state.score += basePoints + streakBonus;
        state.streak += 1;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
        feedbackEl.className = "feedback success";
        feedbackEl.textContent = `${question.feedback.success}`;
    } else {
        state.streak = 0;
        feedbackEl.className = "feedback error";
        feedbackEl.textContent = `${question.feedback.error}`;
    }

    promptEl.textContent = question.explanation;
    updateScoreboard();

    if (state.active) {
        setTimeout(() => {
            if (!state.active) return;
            enableChoices(true);
            nextQuestion();
        }, 1400);
    }
}

function nextQuestion() {
    const question = generateQuestion(state.difficulty);
    state.currentQuestion = question;
    promptEl.textContent = question.prompt;
    feedbackEl.textContent = "";
    feedbackEl.className = "feedback";

    drawBoardBase();
    question.draw(ctx);

    choiceButtons.forEach((button, idx) => {
        const option = question.options[idx];
        if (option) {
            button.textContent = option.label;
            button.dataset.choiceIndex = String(idx);
            button.disabled = false;
            button.classList.remove("correct", "incorrect");
        } else {
            button.textContent = "";
            button.disabled = true;
            button.classList.remove("correct", "incorrect");
            delete button.dataset.choiceIndex;
        }
    });
}

function updateTimer() {
    const minutes = Math.floor(state.timeRemaining / 60)
        .toString()
        .padStart(2, "0");
    const seconds = (state.timeRemaining % 60).toString().padStart(2, "0");
    timerEl.textContent = `${minutes}:${seconds}`;

    const progress = 1 - state.timeRemaining / TOTAL_TIME;
    progressBarEl.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
}

function updateScoreboard() {
    scoreEl.textContent = state.score;
    streakEl.textContent = state.streak;
    bestStreakEl.textContent = state.bestStreak;
    highScoreEl.textContent = state.highScore;
}

function enableChoices(enabled) {
    choiceButtons.forEach((button) => {
        button.disabled = !enabled;
    });
}

function readHighScore() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? Number(stored) || 0 : 0;
    } catch (error) {
        console.warn("Unable to access localStorage", error);
        return 0;
    }
}

function updateHighScore(score) {
    if (score > state.highScore) {
        state.highScore = score;
        updateScoreboard();
        try {
            localStorage.setItem(STORAGE_KEY, String(score));
        } catch (error) {
            console.warn("Unable to store high score", error);
        }
    }
}

function getPointsForDifficulty(difficulty) {
    switch (difficulty) {
        case "hard":
            return 30;
        case "medium":
            return 20;
        default:
            return 15;
    }
}

function drawBoardBase() {
    ctx.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
    ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    ctx.strokeStyle = "rgba(76, 110, 245, 0.08)";
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = step; x < BASE_WIDTH; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, BASE_HEIGHT);
        ctx.stroke();
    }
    for (let y = step; y < BASE_HEIGHT; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(BASE_WIDTH, y);
        ctx.stroke();
    }

    ctx.strokeStyle = "rgba(76, 110, 245, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, BASE_WIDTH - 40, BASE_HEIGHT - 40);
}

function roundedRect(x, y, width, height, radius = 8) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function drawLabel(text, x, y, { align = "center", baseline = "middle" } = {}) {
    ctx.save();
    ctx.font = "16px 'Nunito', sans-serif";
    ctx.textAlign = align;
    ctx.textBaseline = baseline;

    const metrics = ctx.measureText(text);
    const paddingX = 12;
    const paddingY = 8;
    const textHeight = 16;
    const width = metrics.width + paddingX * 2;
    const height = textHeight + paddingY * 2;
    const rectX = x - width / 2;
    const rectY = y - height / 2;

    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.strokeStyle = "rgba(76, 110, 245, 0.35)";
    ctx.lineWidth = 1;
    roundedRect(rectX, rectY, width, height, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#1f2933";
    ctx.fillText(text, x, y + 2);
    ctx.restore();
}

function drawDimensionArrow(x1, y1, x2, y2, label) {
    ctx.save();
    ctx.strokeStyle = "#364fc7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    drawArrowHead(x1, y1, x2, y2);
    drawArrowHead(x2, y2, x1, y1);

    const isHorizontal = Math.abs(x2 - x1) >= Math.abs(y2 - y1);
    const labelX = (x1 + x2) / 2;
    const labelY = (y1 + y2) / 2 + (isHorizontal ? -18 : 0);
    drawLabel(label, isHorizontal ? labelX : labelX - 36, labelY);
    ctx.restore();
}

function drawArrowHead(x1, y1, x2, y2) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const length = 10;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - length * Math.cos(angle - Math.PI / 6), y2 - length * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - length * Math.cos(angle + Math.PI / 6), y2 - length * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = "#364fc7";
    ctx.fill();
}

function drawDashedLine(x1, y1, x2, y2) {
    ctx.save();
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = "rgba(15, 23, 42, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
}

function formatNumber(value, digits = 0) {
    if (digits === 0) {
        return Number(value).toLocaleString();
    }
    return Number(value).toFixed(digits);
}

function createNumericOptions(correctValue, { spread = 10, digits = 0, suffix = "", min = 1 }) {
    const normalizedCorrect = Number(correctValue.toFixed(digits));
    const answerValue = normalizedCorrect.toFixed(digits);
    const options = new Map();

    function addOption(value) {
        const normalized = Number(value.toFixed(digits));
        if (normalized < min) return;
        const key = normalized.toFixed(digits);
        if (options.has(key)) return;
        options.set(key, {
            value: key,
            label: `${formatNumber(normalized, digits)}${suffix}`,
        });
    }

    addOption(correctValue);

    while (options.size < 4) {
        const offset = (Math.random() - 0.5) * 2 * spread;
        let candidate = normalizedCorrect + offset;
        if (digits === 0) {
            candidate = Math.round(candidate);
        }
        if (candidate < min) {
            candidate = min + Math.random() * spread;
        }
        addOption(candidate);
    }

    const optionList = Array.from(options.values());
    shuffle(optionList);
    const answerIndex = optionList.findIndex((option) => option.value === answerValue);

    return { options: optionList, answerIndex, answerValue };
}

function createCoordinateOptions(correctPoint, { range = 2 }) {
    const answerValue = `${correctPoint.x},${correctPoint.y}`;
    const options = new Map();

    function addOption(x, y) {
        const key = `${x},${y}`;
        if (options.has(key)) return;
        options.set(key, {
            value: key,
            label: `(${x}, ${y})`,
        });
    }

    addOption(correctPoint.x, correctPoint.y);

    while (options.size < 4) {
        const dx = randInt(-range, range);
        const dy = randInt(-range, range);
        addOption(correctPoint.x + dx, correctPoint.y + dy);
    }

    const optionList = Array.from(options.values());
    shuffle(optionList);
    const answerIndex = optionList.findIndex((option) => option.value === answerValue);
    return { options: optionList, answerIndex, answerValue };
}

function generateQuestion(difficulty) {
    const generators = QUESTION_GENERATORS.filter((entry) => entry.difficulties.includes(difficulty));
    const generator = generators[Math.floor(Math.random() * generators.length)];
    return generator.create(difficulty);
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

const PYTHAG_TRIPLES = [
    { a: 3, b: 4, c: 5 },
    { a: 5, b: 12, c: 13 },
    { a: 6, b: 8, c: 10 },
    { a: 8, b: 15, c: 17 },
    { a: 7, b: 24, c: 25 },
];

const QUESTION_GENERATORS = [
    {
        id: "rectangle-area",
        difficulties: ["easy", "medium", "hard"],
        create: (difficulty) => {
            const max = difficulty === "hard" ? 20 : difficulty === "medium" ? 15 : 12;
            const width = randInt(3, max);
            const height = randInt(3, max - 1);
            const area = width * height;
            const { options, answerIndex, answerValue } = createNumericOptions(area, {
                spread: Math.max(8, Math.round(area * 0.4)),
                digits: 0,
                suffix: " sq units",
                min: 2,
            });
            return {
                prompt: "What is the area of the rectangle?",
                explanation: `Area = width × height = ${width} × ${height} = ${area} square units.`,
                options,
                answerIndex,
                answerValue,
                feedback: {
                    success: "Correct! You multiplied the side lengths.",
                    error: `The correct area is ${area} square units.`,
                },
                draw: (ctx) => drawRectangle(ctx, width, height),
            };
        },
    },
    {
        id: "rectangle-perimeter",
        difficulties: ["easy", "medium", "hard"],
        create: (difficulty) => {
            const max = difficulty === "hard" ? 18 : difficulty === "medium" ? 14 : 12;
            const width = randInt(2, max);
            const height = randInt(2, max);
            const perimeter = 2 * (width + height);
            const { options, answerIndex, answerValue } = createNumericOptions(perimeter, {
                spread: Math.max(6, Math.round(perimeter * 0.3)),
                digits: 0,
                suffix: " units",
                min: 4,
            });
            return {
                prompt: "What is the perimeter of the rectangle?",
                explanation: `Perimeter = 2(w + h) = 2(${width} + ${height}) = ${perimeter} units.`,
                options,
                answerIndex,
                answerValue,
                feedback: {
                    success: "Exactly! You added all the sides.",
                    error: `Add all four sides to get ${perimeter} units.`,
                },
                draw: (ctx) => drawRectangle(ctx, width, height),
            };
        },
    },
    {
        id: "triangle-area",
        difficulties: ["easy", "medium", "hard"],
        create: (difficulty) => {
            const base = randInt(4, difficulty === "hard" ? 22 : difficulty === "medium" ? 16 : 12);
            const height = randInt(3, difficulty === "hard" ? 18 : 12);
            const area = 0.5 * base * height;
            const { options, answerIndex, answerValue } = createNumericOptions(area, {
                spread: Math.max(6, Math.round(area * 0.5)),
                digits: 1,
                suffix: " sq units",
                min: 2,
            });
            return {
                prompt: "What is the area of the triangle?",
                explanation: `Area = 1/2 × base × height = 0.5 × ${base} × ${height} = ${area.toFixed(1)} square units.`,
                options,
                answerIndex,
                answerValue,
                feedback: {
                    success: "Nice! Triangles use half of base × height.",
                    error: `Remember 1/2 × ${base} × ${height} = ${area.toFixed(1)} square units.`,
                },
                draw: (ctx) => drawRightTriangle(ctx, base, height, false),
            };
        },
    },
    {
        id: "triangle-perimeter",
        difficulties: ["medium", "hard"],
        create: (difficulty) => {
            const triple = PYTHAG_TRIPLES[difficulty === "hard" ? randInt(1, PYTHAG_TRIPLES.length - 1) : randInt(0, 2)];
            const scale = difficulty === "hard" ? randInt(1, 3) : randInt(1, 2);
            const a = triple.a * scale;
            const b = triple.b * scale;
            const c = triple.c * scale;
            const perimeter = a + b + c;
            const { options, answerIndex, answerValue } = createNumericOptions(perimeter, {
                spread: Math.max(8, Math.round(perimeter * 0.3)),
                digits: 0,
                suffix: " units",
                min: 6,
            });
            return {
                prompt: "What is the perimeter of the right triangle?",
                explanation: `Perimeter = ${a} + ${b} + ${c} = ${perimeter} units.`,
                options,
                answerIndex,
                answerValue,
                feedback: {
                    success: "Great! You added all three sides.",
                    error: `Add ${a}, ${b}, and ${c} to get ${perimeter} units.`,
                },
                draw: (ctx) => drawRightTriangle(ctx, a, b, true, c),
            };
        },
    },
    {
        id: "circle-area",
        difficulties: ["medium", "hard"],
        create: (difficulty) => {
            const radius = randInt(3, difficulty === "hard" ? 14 : 10);
            const area = Math.PI * radius * radius;
            const rounded = Number(area.toFixed(1));
            const { options, answerIndex, answerValue } = createNumericOptions(rounded, {
                spread: Math.max(10, Math.round(rounded * 0.35)),
                digits: 1,
                suffix: " sq units",
                min: 10,
            });
            return {
                prompt: "Use π ≈ 3.14. What is the area of the circle?",
                explanation: `Area = πr² = 3.14 × ${radius}² ≈ ${rounded.toFixed(1)} square units.`,
                options,
                answerIndex,
                answerValue,
                feedback: {
                    success: "Exactly! Multiply π by the radius squared.",
                    error: `Compute 3.14 × ${radius} × ${radius} ≈ ${rounded.toFixed(1)} square units.`,
                },
                draw: (ctx) => drawCircle(ctx, radius, "radius"),
            };
        },
    },
    {
        id: "circle-circumference",
        difficulties: ["medium", "hard"],
        create: (difficulty) => {
            const radius = randInt(3, difficulty === "hard" ? 16 : 12);
            const circumference = 2 * Math.PI * radius;
            const rounded = Number(circumference.toFixed(1));
            const { options, answerIndex, answerValue } = createNumericOptions(rounded, {
                spread: Math.max(8, Math.round(rounded * 0.3)),
                digits: 1,
                suffix: " units",
                min: 15,
            });
            return {
                prompt: "Use π ≈ 3.14. What is the circumference of the circle?",
                explanation: `Circumference = 2πr = 2 × 3.14 × ${radius} ≈ ${rounded.toFixed(1)} units.`,
                options,
                answerIndex,
                answerValue,
                feedback: {
                    success: "Yes! Circumference equals 2π times the radius.",
                    error: `Multiply 2 × 3.14 × ${radius} to get ${rounded.toFixed(1)} units.`,
                },
                draw: (ctx) => drawCircle(ctx, radius, "radius"),
            };
        },
    },
    {
        id: "trapezoid-area",
        difficulties: ["medium", "hard"],
        create: (difficulty) => {
            const base1 = randInt(6, difficulty === "hard" ? 20 : 14);
            const base2 = randInt(4, base1 - 1);
            const height = randInt(4, difficulty === "hard" ? 14 : 10);
            const area = ((base1 + base2) / 2) * height;
            const rounded = Number(area.toFixed(1));
            const { options, answerIndex, answerValue } = createNumericOptions(rounded, {
                spread: Math.max(10, Math.round(rounded * 0.35)),
                digits: 1,
                suffix: " sq units",
                min: 12,
            });
            return {
                prompt: "What is the area of the trapezoid?",
                explanation: `Area = 1/2 × (${base1} + ${base2}) × ${height} ≈ ${rounded.toFixed(1)} square units.`,
                options,
                answerIndex,
                answerValue,
                feedback: {
                    success: "Correct! Average the bases, then multiply by height.",
                    error: `Compute 0.5 × (${base1} + ${base2}) × ${height} ≈ ${rounded.toFixed(1)} square units.`,
                },
                draw: (ctx) => drawTrapezoid(ctx, base1, base2, height),
            };
        },
    },
    {
        id: "translation",
        difficulties: ["medium", "hard"],
        create: (difficulty) => {
            const range = difficulty === "hard" ? 6 : 4;
            const point = { x: randInt(-range, range), y: randInt(-range, range) };
            let vector = { x: randInt(-3, 4), y: randInt(-3, 4) };
            while (vector.x === 0 && vector.y === 0) {
                vector = { x: randInt(-3, 4), y: randInt(-3, 4) };
            }
            const image = { x: point.x + vector.x, y: point.y + vector.y };
            const { options, answerIndex, answerValue } = createCoordinateOptions(image, { range: 3 });
            return {
                prompt: `Point P(${point.x}, ${point.y}) is translated by vector (${vector.x}, ${vector.y}). Where is P'?`,
                explanation: `Add the vector: (${point.x} + ${vector.x}, ${point.y} + ${vector.y}) = (${image.x}, ${image.y}).`,
                options,
                answerIndex,
                answerValue,
                feedback: {
                    success: "Nice! You added each component of the vector.",
                    error: `Translate by adding ${vector.x} and ${vector.y} to get (${image.x}, ${image.y}).`,
                },
                draw: (ctx) => drawTranslation(ctx, point, vector, image),
            };
        },
    },
    {
        id: "composite-area",
        difficulties: ["hard"],
        create: () => {
            const outerWidth = randInt(16, 24);
            const outerHeight = randInt(12, 18);
            const cutWidth = randInt(5, Math.floor(outerWidth / 2));
            const cutHeight = randInt(4, Math.floor(outerHeight / 2));
            const area = outerWidth * outerHeight - cutWidth * cutHeight;
            const { options, answerIndex, answerValue } = createNumericOptions(area, {
                spread: Math.max(12, Math.round(area * 0.25)),
                digits: 0,
                suffix: " sq units",
                min: 20,
            });
            return {
                prompt: "What is the area of the L-shaped figure?",
                explanation: `Subtract the missing rectangle: ${outerWidth}×${outerHeight} − ${cutWidth}×${cutHeight} = ${area} square units.`,
                options,
                answerIndex,
                answerValue,
                feedback: {
                    success: "Correct! Subtract the missing part from the large rectangle.",
                    error: `Take ${outerWidth}×${outerHeight} minus ${cutWidth}×${cutHeight} for ${area} square units.`,
                },
                draw: (ctx) => drawCompositeL(ctx, outerWidth, outerHeight, cutWidth, cutHeight),
            };
        },
    },
];

function drawRectangle(ctx, widthUnits, heightUnits) {
    const maxWidth = BASE_WIDTH - 180;
    const maxHeight = BASE_HEIGHT - 160;
    const scale = Math.min(maxWidth / widthUnits, maxHeight / heightUnits);
    const drawWidth = widthUnits * scale;
    const drawHeight = heightUnits * scale;
    const startX = (BASE_WIDTH - drawWidth) / 2;
    const startY = (BASE_HEIGHT - drawHeight) / 2;
    ctx.save();
    ctx.fillStyle = "rgba(76, 110, 245, 0.12)";
    ctx.strokeStyle = "#4c6ef5";
    ctx.lineWidth = 4;
    ctx.beginPath();
    roundedRect(startX, startY, drawWidth, drawHeight, 18);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    drawDimensionArrow(startX, startY - 30, startX + drawWidth, startY - 30, `${widthUnits} units`);
    drawDimensionArrow(startX - 40, startY + drawHeight, startX - 40, startY, `${heightUnits} units`);
}

function drawRightTriangle(ctx, baseUnits, heightUnits, showHypotenuse, hypotenuseLength) {
    const origin = { x: 110, y: BASE_HEIGHT - 60 };
    const scale = 12;
    const pointA = origin;
    const pointB = { x: origin.x + baseUnits * scale, y: origin.y };
    const pointC = { x: origin.x, y: origin.y - heightUnits * scale };

    ctx.save();
    ctx.fillStyle = "rgba(239, 71, 111, 0.12)";
    ctx.strokeStyle = "#ef476f";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pointA.x, pointA.y);
    ctx.lineTo(pointB.x, pointB.y);
    ctx.lineTo(pointC.x, pointC.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
    ctx.fillRect(pointA.x, pointA.y - 30, 30, 30);
    ctx.restore();

    drawLabel(`${baseUnits} units`, (pointA.x + pointB.x) / 2, pointA.y + 36);
    drawLabel(`${heightUnits} units`, pointA.x - 48, (pointA.y + pointC.y) / 2);

    if (showHypotenuse && hypotenuseLength) {
        drawLabel(`${hypotenuseLength} units`, (pointB.x + pointC.x) / 2 + 14, (pointB.y + pointC.y) / 2 - 10);
    }
}

function drawCircle(ctx, radiusUnits) {
    const center = { x: BASE_WIDTH / 2, y: BASE_HEIGHT / 2 };
    const minUnits = 3;
    const maxUnits = 16;
    const minPixels = 50;
    const maxPixels = 125;
    const ratio = Math.min(1, Math.max(0, (radiusUnits - minUnits) / (maxUnits - minUnits)));
    const radius = minPixels + ratio * (maxPixels - minPixels);
    ctx.save();
    ctx.fillStyle = "rgba(44, 206, 137, 0.12)";
    ctx.strokeStyle = "#2cce89";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(15, 23, 42, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(center.x + radius, center.y);
    ctx.stroke();
    ctx.restore();

    drawLabel(`${radiusUnits} units`, center.x + radius / 2, center.y - 28);
}

function drawTrapezoid(ctx, base1, base2, height) {
    const topWidth = base2 * 8;
    const bottomWidth = base1 * 8;
    const centerX = BASE_WIDTH / 2;
    const centerY = BASE_HEIGHT / 2 + 20;
    const halfBottom = bottomWidth / 2;
    const halfTop = topWidth / 2;
    const topY = centerY - height * 6;
    const bottomY = centerY + height * 6;

    ctx.save();
    ctx.fillStyle = "rgba(245, 159, 0, 0.12)";
    ctx.strokeStyle = "#f59f00";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(centerX - halfBottom, bottomY);
    ctx.lineTo(centerX + halfBottom, bottomY);
    ctx.lineTo(centerX + halfTop, topY);
    ctx.lineTo(centerX - halfTop, topY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    drawLabel(`${base1} units`, centerX, bottomY + 36);
    drawLabel(`${base2} units`, centerX, topY - 30);
    drawDimensionArrow(centerX + halfBottom + 20, bottomY, centerX + halfBottom + 20, topY, `${height} units`);
}

function drawTranslation(ctx, point, vector, image) {
    const origin = { x: BASE_WIDTH / 2, y: BASE_HEIGHT / 2 + 60 };
    const scale = 28;
    const axisLength = 6;

    ctx.save();
    ctx.strokeStyle = "rgba(15, 23, 42, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(origin.x - axisLength * scale, origin.y);
    ctx.lineTo(origin.x + axisLength * scale, origin.y);
    ctx.moveTo(origin.x, origin.y + axisLength * scale);
    ctx.lineTo(origin.x, origin.y - axisLength * scale);
    ctx.stroke();

    ctx.font = "14px 'Nunito', sans-serif";
    ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
    for (let i = -axisLength; i <= axisLength; i += 1) {
        if (i === 0) continue;
        ctx.fillText(String(i), origin.x + i * scale - 4, origin.y + 16);
        ctx.fillText(String(i), origin.x + 6, origin.y - i * scale + 5);
    }

    const start = {
        x: origin.x + point.x * scale,
        y: origin.y - point.y * scale,
    };
    const end = {
        x: origin.x + image.x * scale,
        y: origin.y - image.y * scale,
    };

    ctx.fillStyle = "#4c6ef5";
    ctx.beginPath();
    ctx.arc(start.x, start.y, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2cce89";
    ctx.beginPath();
    ctx.arc(end.x, end.y, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(44, 206, 137, 0.75)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();

    drawLabel(`P(${point.x}, ${point.y})`, start.x, start.y - 28);
    drawLabel(`P'(${image.x}, ${image.y})`, end.x, end.y - 28);
    drawLabel(`→ (${vector.x}, ${vector.y})`, (start.x + end.x) / 2, (start.y + end.y) / 2 - 20);
}

function drawCompositeL(ctx, width, height, cutWidth, cutHeight) {
    const scale = 12;
    const outerX = (BASE_WIDTH - width * scale) / 2;
    const outerY = (BASE_HEIGHT - height * scale) / 2 + 20;

    ctx.save();
    ctx.fillStyle = "rgba(76, 110, 245, 0.12)";
    ctx.strokeStyle = "#4c6ef5";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(outerX, outerY);
    ctx.lineTo(outerX + width * scale, outerY);
    ctx.lineTo(outerX + width * scale, outerY + height * scale);
    ctx.lineTo(outerX + (width - cutWidth) * scale, outerY + height * scale);
    ctx.lineTo(outerX + (width - cutWidth) * scale, outerY + (height - cutHeight) * scale);
    ctx.lineTo(outerX, outerY + (height - cutHeight) * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    drawLabel(`${width} units`, outerX + (width * scale) / 2, outerY - 32);
    drawLabel(`${height} units`, outerX - 50, outerY + (height * scale) / 2);
    drawLabel(`${cutWidth} units`, outerX + (width - cutWidth / 2) * scale, outerY + height * scale + 32);
    drawLabel(`${cutHeight} units`, outerX + width * scale + 48, outerY + (height - cutHeight / 2) * scale);
}

// Draw the base board before any game starts
drawBoardBase();
