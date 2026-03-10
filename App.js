"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
const react_1 = __importStar(require("react"));
const api_1 = require("./utils/api");
const FREQUENCIES = [125, 250, 500, 1000, 2000, 4000, 8000];
// ═══════════ AudioContext для генерации тонов ═══════════
let audioCtx = null;
function playTone(frequency, dbLevel, durationMs = 1000) {
    if (!audioCtx)
        audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    // dB HL → amplitude (очень грубое приближение)
    const amplitude = Math.pow(10, (dbLevel - 90) / 20) * 0.5;
    const clampedAmp = Math.min(Math.max(amplitude, 0.0001), 1.0);
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(clampedAmp, now + 0.05);
    gain.gain.setValueAtTime(clampedAmp, now + durationMs / 1000 - 0.05);
    gain.gain.linearRampToValueAtTime(0, now + durationMs / 1000);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + durationMs / 1000);
}
function Audiogram({ thresholds, trueThresholds, title }) {
    const width = 500;
    const height = 350;
    const padding = { top: 40, right: 30, bottom: 40, left: 55 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;
    const freqLabels = FREQUENCIES.map((f) => (f >= 1000 ? `${f / 1000}k` : `${f}`));
    const xScale = (i) => padding.left + (i / (FREQUENCIES.length - 1)) * plotW;
    const yScale = (db) => padding.top + (db / 120) * plotH;
    const makePolyline = (data, color, dashed = false) => {
        const points = [];
        FREQUENCIES.forEach((f, i) => {
            const val = data[String(f)];
            if (val !== undefined) {
                points.push(`${xScale(i)},${yScale(val)}`);
            }
        });
        if (points.length < 2)
            return null;
        return (react_1.default.createElement("polyline", { points: points.join(" "), fill: "none", stroke: color, strokeWidth: 2, strokeDasharray: dashed ? "6,4" : "none" }));
    };
    return (react_1.default.createElement("div", { className: "bg-gray-900 rounded-xl p-4" },
        react_1.default.createElement("h3", { className: "text-center text-sm font-semibold text-gray-300 mb-2" }, title),
        react_1.default.createElement("svg", { viewBox: `0 0 ${width} ${height}`, className: "w-full" },
            [0, 20, 40, 60, 80, 100, 120].map((db) => (react_1.default.createElement("g", { key: db },
                react_1.default.createElement("line", { x1: padding.left, y1: yScale(db), x2: width - padding.right, y2: yScale(db), stroke: "#374151", strokeWidth: 1 }),
                react_1.default.createElement("text", { x: padding.left - 8, y: yScale(db) + 4, textAnchor: "end", fill: "#9CA3AF", fontSize: 11 }, db)))),
            FREQUENCIES.map((_, i) => (react_1.default.createElement("g", { key: i },
                react_1.default.createElement("line", { x1: xScale(i), y1: padding.top, x2: xScale(i), y2: height - padding.bottom, stroke: "#374151", strokeWidth: 1 }),
                react_1.default.createElement("text", { x: xScale(i), y: height - padding.bottom + 18, textAnchor: "middle", fill: "#9CA3AF", fontSize: 11 }, freqLabels[i])))),
            react_1.default.createElement("text", { x: width / 2, y: height - 5, textAnchor: "middle", fill: "#9CA3AF", fontSize: 12 }, "\u0427\u0430\u0441\u0442\u043E\u0442\u0430 (\u0413\u0446)"),
            react_1.default.createElement("text", { x: 14, y: height / 2, textAnchor: "middle", fill: "#9CA3AF", fontSize: 12, transform: `rotate(-90, 14, ${height / 2})` }, "\u0434\u0411 HL"),
            trueThresholds && makePolyline(trueThresholds, "#6B7280", true),
            trueThresholds && FREQUENCIES.map((f, i) => {
                const val = trueThresholds[String(f)];
                if (val === undefined)
                    return null;
                return (react_1.default.createElement("circle", { key: `true-${f}`, cx: xScale(i), cy: yScale(val), r: 4, fill: "none", stroke: "#6B7280", strokeWidth: 1.5 }));
            }),
            makePolyline(thresholds, "#3B82F6"),
            FREQUENCIES.map((f, i) => {
                const val = thresholds[String(f)];
                if (val === undefined)
                    return null;
                return (react_1.default.createElement("circle", { key: `found-${f}`, cx: xScale(i), cy: yScale(val), r: 5, fill: "#3B82F6", stroke: "#1E40AF", strokeWidth: 1.5 }));
            }),
            react_1.default.createElement("circle", { cx: padding.left + 10, cy: padding.top - 20, r: 4, fill: "#3B82F6" }),
            react_1.default.createElement("text", { x: padding.left + 20, y: padding.top - 16, fill: "#93C5FD", fontSize: 10 }, "\u041D\u0430\u0439\u0434\u0435\u043D\u043D\u044B\u0435 \u043F\u043E\u0440\u043E\u0433\u0438"),
            trueThresholds && (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement("circle", { cx: padding.left + 150, cy: padding.top - 20, r: 4, fill: "none", stroke: "#6B7280", strokeWidth: 1.5 }),
                react_1.default.createElement("text", { x: padding.left + 160, y: padding.top - 16, fill: "#9CA3AF", fontSize: 10 }, "\u0418\u0441\u0442\u0438\u043D\u043D\u044B\u0435 \u043F\u043E\u0440\u043E\u0433\u0438"))))));
}
function App() {
    var _a, _b;
    const [tab, setTab] = (0, react_1.useState)("virtual");
    const [connected, setConnected] = (0, react_1.useState)(null);
    const [modelLoaded, setModelLoaded] = (0, react_1.useState)(false);
    const [modelInfo, setModelInfo] = (0, react_1.useState)(null);
    // Virtual test
    const [virtualResult, setVirtualResult] = (0, react_1.useState)(null);
    const [virtualLoading, setVirtualLoading] = (0, react_1.useState)(false);
    // Real test
    const [realActive, setRealActive] = (0, react_1.useState)(false);
    const [currentTone, setCurrentTone] = (0, react_1.useState)(null);
    const [realDone, setRealDone] = (0, react_1.useState)(false);
    const [, setRealSteps] = (0, react_1.useState)([]);
    const [playing, setPlaying] = (0, react_1.useState)(false);
    const sessionIdRef = (0, react_1.useRef)(`session_${Date.now()}`);
    // Check connection
    (0, react_1.useEffect)(() => {
        (0, api_1.checkHealth)()
            .then((data) => {
            setConnected(true);
            setModelLoaded(data.model_loaded);
        })
            .catch(() => setConnected(false));
        (0, api_1.getModelInfo)()
            .then(setModelInfo)
            .catch(() => { });
    }, []);
    // ─── Virtual test ───
    const handleVirtualTest = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        setVirtualLoading(true);
        setVirtualResult(null);
        try {
            const result = yield (0, api_1.runVirtualTest)();
            setVirtualResult(result);
        }
        catch (e) {
            alert("Ошибка: " + e.message);
        }
        setVirtualLoading(false);
    }), []);
    // ─── Real test ───
    const handleStartReal = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        sessionIdRef.current = `session_${Date.now()}`;
        setRealSteps([]);
        setRealDone(false);
        try {
            const tone = yield (0, api_1.startRealTest)(sessionIdRef.current);
            setCurrentTone(tone);
            setRealActive(true);
        }
        catch (e) {
            alert("Ошибка: " + e.message);
        }
    }), []);
    const handlePlayTone = (0, react_1.useCallback)(() => {
        if (!currentTone)
            return;
        setPlaying(true);
        playTone(currentTone.frequency, currentTone.db_level, 1000);
        setTimeout(() => setPlaying(false), 1100);
    }, [currentTone]);
    const handleRespond = (0, react_1.useCallback)((heard) => __awaiter(this, void 0, void 0, function* () {
        if (!currentTone)
            return;
        try {
            // Log this step
            setRealSteps((prev) => [
                ...prev,
                {
                    step: prev.length + 1,
                    frequency: currentTone.frequency,
                    db_level: currentTone.db_level,
                    action: "response",
                    heard,
                },
            ]);
            const response = yield (0, api_1.sendStep)(sessionIdRef.current, heard);
            setCurrentTone(response);
            if (response.test_done) {
                setRealDone(true);
                setRealActive(false);
            }
        }
        catch (e) {
            alert("Ошибка: " + e.message);
        }
    }), [currentTone]);
    // ═══════════ UI ═══════════
    return (react_1.default.createElement("div", { className: "min-h-screen bg-gray-950 text-white" },
        react_1.default.createElement("header", { className: "bg-gray-900 border-b border-gray-800 py-4" },
            react_1.default.createElement("div", { className: "max-w-5xl mx-auto px-4 flex items-center justify-between" },
                react_1.default.createElement("div", null,
                    react_1.default.createElement("h1", { className: "text-2xl font-bold text-blue-400" }, "\uD83C\uDFA7 \u0412\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u0430\u0443\u0434\u0438\u043E\u043C\u0435\u0442\u0440"),
                    react_1.default.createElement("p", { className: "text-sm text-gray-400 mt-1" }, "RL-\u0430\u0433\u0435\u043D\u0442 (PPO) \u0441 5 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F\u043C\u0438: +5, -5, +1, -1, \u0421\u0422\u041E\u041F")),
                react_1.default.createElement("div", { className: "flex items-center gap-3" },
                    react_1.default.createElement("span", { className: `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${connected === null ? "bg-gray-700 text-gray-300" :
                            connected ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}` },
                        react_1.default.createElement("span", { className: `w-2 h-2 rounded-full ${connected === null ? "bg-gray-400" :
                                connected ? "bg-green-400" : "bg-red-400"}` }),
                        connected === null ? "Проверка..." : connected ? "Сервер подключён" : "Нет связи"),
                    connected && (react_1.default.createElement("span", { className: `px-3 py-1 rounded-full text-xs font-medium ${modelLoaded ? "bg-blue-900 text-blue-300" : "bg-yellow-900 text-yellow-300"}` }, modelLoaded ? "Модель загружена" : "Модель не найдена"))))),
        react_1.default.createElement("div", { className: "max-w-5xl mx-auto px-4 mt-6" },
            react_1.default.createElement("div", { className: "flex gap-2 mb-6" }, [
                ["virtual", "🤖 Виртуальный пациент"],
                ["real", "🎧 Реальный тест"],
                ["info", "🧠 Архитектура ИНС"],
            ].map(([key, label]) => (react_1.default.createElement("button", { key: key, onClick: () => setTab(key), className: `px-5 py-2.5 rounded-lg font-medium text-sm transition ${tab === key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"}` }, label)))),
            tab === "virtual" && (react_1.default.createElement("div", { className: "space-y-6" },
                react_1.default.createElement("div", { className: "bg-gray-900 rounded-xl p-6 border border-gray-800" },
                    react_1.default.createElement("h2", { className: "text-lg font-semibold mb-3" }, "\u0422\u0435\u0441\u0442 \u0432\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u043F\u0430\u0446\u0438\u0435\u043D\u0442\u0430"),
                    react_1.default.createElement("p", { className: "text-gray-400 text-sm mb-4" }, "\u0418\u041D\u0421 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043F\u0440\u043E\u0432\u0435\u0434\u0451\u0442 \u0430\u0443\u0434\u0438\u043E\u043C\u0435\u0442\u0440\u0438\u044E \u0432\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u043F\u0430\u0446\u0438\u0435\u043D\u0442\u0430 \u0441\u043E \u0441\u043B\u0443\u0447\u0430\u0439\u043D\u044B\u043C \u043F\u0440\u043E\u0444\u0438\u043B\u0435\u043C \u0441\u043B\u0443\u0445\u0430. \u0410\u0433\u0435\u043D\u0442 \u0432\u044B\u0431\u0438\u0440\u0430\u0435\u0442 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F (+5, -5, +1, -1, \u0421\u0422\u041E\u041F) \u0447\u0442\u043E\u0431\u044B \u043D\u0430\u0439\u0442\u0438 \u043F\u043E\u0440\u043E\u0433 \u043D\u0430 \u043A\u0430\u0436\u0434\u043E\u0439 \u0438\u0437 7 \u0447\u0430\u0441\u0442\u043E\u0442."),
                    react_1.default.createElement("button", { onClick: handleVirtualTest, disabled: virtualLoading || !connected || !modelLoaded, className: "px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition" }, virtualLoading ? "⏳ Тестирование..." : "▶ Запустить тест")),
                virtualResult && (react_1.default.createElement(react_1.default.Fragment, null,
                    react_1.default.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4" },
                        react_1.default.createElement(StatCard, { label: "\u0414\u0438\u0430\u0433\u043D\u043E\u0437", value: virtualResult.diagnosis }),
                        react_1.default.createElement(StatCard, { label: "\u0421\u0440. \u043E\u0448\u0438\u0431\u043A\u0430", value: `${virtualResult.avg_error} дБ`, color: virtualResult.avg_error <= 1 ? "green" : virtualResult.avg_error <= 5 ? "yellow" : "red" }),
                        react_1.default.createElement(StatCard, { label: "\u041C\u0430\u043A\u0441. \u043E\u0448\u0438\u0431\u043A\u0430", value: `${virtualResult.max_error} дБ`, color: virtualResult.max_error <= 2 ? "green" : virtualResult.max_error <= 5 ? "yellow" : "red" }),
                        react_1.default.createElement(StatCard, { label: "\u0412\u0441\u0435\u0433\u043E \u0448\u0430\u0433\u043E\u0432", value: String(virtualResult.total_steps) })),
                    react_1.default.createElement(Audiogram, { thresholds: virtualResult.found_thresholds, trueThresholds: virtualResult.true_thresholds, title: "\u0410\u0443\u0434\u0438\u043E\u0433\u0440\u0430\u043C\u043C\u0430 \u0432\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u043F\u0430\u0446\u0438\u0435\u043D\u0442\u0430" }),
                    react_1.default.createElement("div", { className: "bg-gray-900 rounded-xl p-4 border border-gray-800" },
                        react_1.default.createElement("h3", { className: "font-semibold mb-3" }, "\u0414\u0435\u0442\u0430\u043B\u0438 \u043F\u043E \u0447\u0430\u0441\u0442\u043E\u0442\u0430\u043C"),
                        react_1.default.createElement("div", { className: "overflow-x-auto" },
                            react_1.default.createElement("table", { className: "w-full text-sm" },
                                react_1.default.createElement("thead", null,
                                    react_1.default.createElement("tr", { className: "border-b border-gray-700 text-gray-400" },
                                        react_1.default.createElement("th", { className: "text-left py-2 px-3" }, "\u0427\u0430\u0441\u0442\u043E\u0442\u0430"),
                                        react_1.default.createElement("th", { className: "text-center py-2 px-3" }, "\u0418\u0441\u0442\u0438\u043D\u043D\u044B\u0439 \u043F\u043E\u0440\u043E\u0433"),
                                        react_1.default.createElement("th", { className: "text-center py-2 px-3" }, "\u041D\u0430\u0439\u0434\u0435\u043D\u043D\u044B\u0439"),
                                        react_1.default.createElement("th", { className: "text-center py-2 px-3" }, "\u041E\u0448\u0438\u0431\u043A\u0430"),
                                        react_1.default.createElement("th", { className: "text-center py-2 px-3" }, "\u0421\u0442\u0430\u0442\u0443\u0441"))),
                                react_1.default.createElement("tbody", null, FREQUENCIES.map((f) => {
                                    const trueVal = virtualResult.true_thresholds[String(f)];
                                    const foundVal = virtualResult.found_thresholds[String(f)];
                                    const error = virtualResult.errors[String(f)];
                                    return (react_1.default.createElement("tr", { key: f, className: "border-b border-gray-800" },
                                        react_1.default.createElement("td", { className: "py-2 px-3 font-medium" },
                                            f,
                                            " \u0413\u0446"),
                                        react_1.default.createElement("td", { className: "py-2 px-3 text-center text-gray-400" }, trueVal !== null && trueVal !== void 0 ? trueVal : "—",
                                            " \u0434\u0411"),
                                        react_1.default.createElement("td", { className: "py-2 px-3 text-center text-blue-400" }, foundVal !== null && foundVal !== void 0 ? foundVal : "—",
                                            " \u0434\u0411"),
                                        react_1.default.createElement("td", { className: "py-2 px-3 text-center" }, error !== null && error !== void 0 ? error : "—",
                                            " \u0434\u0411"),
                                        react_1.default.createElement("td", { className: "py-2 px-3 text-center" }, error === 0 ? "✅" : error !== undefined && error <= 5 ? "⚠️" : "❌")));
                                }))))),
                    react_1.default.createElement("div", { className: "bg-gray-900 rounded-xl p-4 border border-gray-800" },
                        react_1.default.createElement("h3", { className: "font-semibold mb-2" }, "\u041A\u043B\u0430\u0441\u0441\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u044F"),
                        react_1.default.createElement("p", { className: "text-lg text-blue-400" }, virtualResult.classification)),
                    react_1.default.createElement("div", { className: "bg-gray-900 rounded-xl p-4 border border-gray-800" },
                        react_1.default.createElement("h3", { className: "font-semibold mb-3" }, "\u041B\u043E\u0433 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439 \u0430\u0433\u0435\u043D\u0442\u0430"),
                        react_1.default.createElement("div", { className: "max-h-64 overflow-y-auto" },
                            react_1.default.createElement("table", { className: "w-full text-xs font-mono" },
                                react_1.default.createElement("thead", null,
                                    react_1.default.createElement("tr", { className: "text-gray-500 border-b border-gray-700" },
                                        react_1.default.createElement("th", { className: "text-left py-1 px-2" }, "#"),
                                        react_1.default.createElement("th", { className: "text-left py-1 px-2" }, "\u0427\u0430\u0441\u0442\u043E\u0442\u0430"),
                                        react_1.default.createElement("th", { className: "text-center py-1 px-2" }, "\u0434\u0411"),
                                        react_1.default.createElement("th", { className: "text-center py-1 px-2" }, "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435"),
                                        react_1.default.createElement("th", { className: "text-center py-1 px-2" }, "\u0421\u043B\u044B\u0448\u0438\u0442"),
                                        react_1.default.createElement("th", { className: "text-center py-1 px-2" }, "\u041D\u0430\u0433\u0440\u0430\u0434\u0430"))),
                                react_1.default.createElement("tbody", null, virtualResult.steps_log.map((s, i) => (react_1.default.createElement("tr", { key: i, className: "border-b border-gray-800 hover:bg-gray-800" },
                                    react_1.default.createElement("td", { className: "py-1 px-2 text-gray-500" }, s.step),
                                    react_1.default.createElement("td", { className: "py-1 px-2" },
                                        s.frequency,
                                        " \u0413\u0446"),
                                    react_1.default.createElement("td", { className: "py-1 px-2 text-center text-blue-300" }, s.db_level),
                                    react_1.default.createElement("td", { className: `py-1 px-2 text-center font-bold ${s.action === "СТОП" ? "text-green-400" :
                                            s.action.includes("+") ? "text-yellow-400" : "text-purple-400"}` }, s.action),
                                    react_1.default.createElement("td", { className: "py-1 px-2 text-center" }, s.heard === true ? "✅" : s.heard === false ? "❌" : "—"),
                                    react_1.default.createElement("td", { className: `py-1 px-2 text-center ${s.reward > 0 ? "text-green-400" : s.reward < 0 ? "text-red-400" : "text-gray-400"}` }, s.reward)))))))))))),
            tab === "real" && (react_1.default.createElement("div", { className: "space-y-6" },
                !realActive && !realDone && (react_1.default.createElement("div", { className: "bg-gray-900 rounded-xl p-6 border border-gray-800" },
                    react_1.default.createElement("h2", { className: "text-lg font-semibold mb-3" }, "\uD83C\uDFA7 \u0422\u0435\u0441\u0442 \u0440\u0435\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0441\u043B\u0443\u0445\u0430"),
                    react_1.default.createElement("p", { className: "text-gray-400 text-sm mb-4" }, "\u041D\u0430\u0434\u0435\u043D\u044C\u0442\u0435 \u043D\u0430\u0443\u0448\u043D\u0438\u043A\u0438. \u0418\u041D\u0421 \u0431\u0443\u0434\u0435\u0442 \u043F\u043E\u0434\u0430\u0432\u0430\u0442\u044C \u0442\u043E\u043D\u044B \u0440\u0430\u0437\u043D\u044B\u0445 \u0447\u0430\u0441\u0442\u043E\u0442 \u0438 \u0433\u0440\u043E\u043C\u043A\u043E\u0441\u0442\u0435\u0439. \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u00AB\u0421\u043B\u044B\u0448\u0443\u00BB \u0438\u043B\u0438 \u00AB\u041D\u0435 \u0441\u043B\u044B\u0448\u0443\u00BB \u043F\u043E\u0441\u043B\u0435 \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u0442\u043E\u043D\u0430. \u0410\u0433\u0435\u043D\u0442 \u0441\u0430\u043C \u0440\u0435\u0448\u0438\u0442 \u043A\u0430\u043A\u0443\u044E \u0433\u0440\u043E\u043C\u043A\u043E\u0441\u0442\u044C \u043F\u043E\u0434\u0430\u0442\u044C \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0439."),
                    react_1.default.createElement("button", { onClick: handleStartReal, disabled: !connected || !modelLoaded, className: "px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition" }, "\u25B6 \u041D\u0430\u0447\u0430\u0442\u044C \u0442\u0435\u0441\u0442"))),
                realActive && currentTone && (react_1.default.createElement("div", { className: "space-y-6" },
                    react_1.default.createElement("div", { className: "bg-gray-900 rounded-xl p-4 border border-gray-800" },
                        react_1.default.createElement("div", { className: "flex items-center justify-between mb-2" },
                            react_1.default.createElement("span", { className: "text-sm text-gray-400" }, "\u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441"),
                            react_1.default.createElement("span", { className: "text-sm text-gray-400" },
                                "\u0427\u0430\u0441\u0442\u043E\u0442\u0430 ",
                                currentTone.freq_index + 1,
                                " / ",
                                currentTone.total_frequencies)),
                        react_1.default.createElement("div", { className: "w-full bg-gray-700 rounded-full h-2" },
                            react_1.default.createElement("div", { className: "bg-blue-500 h-2 rounded-full transition-all duration-300", style: { width: `${((currentTone.freq_index) / currentTone.total_frequencies) * 100}%` } })),
                        react_1.default.createElement("div", { className: "flex justify-between mt-2 text-xs text-gray-500" }, FREQUENCIES.map((f, i) => (react_1.default.createElement("span", { key: f, className: i === currentTone.freq_index ? "text-blue-400 font-bold" : "" }, f >= 1000 ? `${f / 1000}k` : f))))),
                    react_1.default.createElement("div", { className: "bg-gray-900 rounded-xl p-8 border border-blue-800 text-center" },
                        react_1.default.createElement("p", { className: "text-gray-400 text-sm mb-2" }, "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0442\u043E\u043D"),
                        react_1.default.createElement("div", { className: "text-4xl font-bold text-blue-400 mb-1" },
                            currentTone.frequency,
                            " \u0413\u0446"),
                        react_1.default.createElement("div", { className: "text-2xl text-gray-300 mb-1" },
                            currentTone.db_level,
                            " \u0434\u0411 HL"),
                        react_1.default.createElement("div", { className: "text-sm text-gray-500 mb-4" },
                            "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0430\u0433\u0435\u043D\u0442\u0430: ",
                            react_1.default.createElement("span", { className: "text-yellow-400" }, currentTone.action_name)),
                        currentTone.gap !== null && currentTone.gap !== undefined && (react_1.default.createElement("div", { className: "text-xs text-gray-500 mb-4" },
                            "Gap: ",
                            currentTone.gap,
                            " \u0434\u0411 | Min heard: ", (_a = currentTone.min_heard) !== null && _a !== void 0 ? _a : "—",
                            " | Max not heard: ", (_b = currentTone.max_not_heard) !== null && _b !== void 0 ? _b : "—")),
                        react_1.default.createElement("button", { onClick: handlePlayTone, disabled: playing, className: `px-8 py-3 rounded-full font-medium text-lg mb-6 transition ${playing
                                ? "bg-yellow-600 text-yellow-100 animate-pulse"
                                : "bg-blue-600 hover:bg-blue-500 text-white"}` }, playing ? "🔊 Воспроизведение..." : "🔊 Воспроизвести тон"),
                        react_1.default.createElement("div", { className: "flex gap-4 justify-center" },
                            react_1.default.createElement("button", { onClick: () => handleRespond(true), className: "px-10 py-4 bg-green-600 hover:bg-green-500 rounded-xl text-lg font-bold transition transform hover:scale-105" }, "\u2705 \u0421\u043B\u044B\u0448\u0443"),
                            react_1.default.createElement("button", { onClick: () => handleRespond(false), className: "px-10 py-4 bg-red-600 hover:bg-red-500 rounded-xl text-lg font-bold transition transform hover:scale-105" }, "\u274C \u041D\u0435 \u0441\u043B\u044B\u0448\u0443"))),
                    Object.keys(currentTone.found_thresholds).length > 0 && (react_1.default.createElement("div", { className: "bg-gray-900 rounded-xl p-4 border border-gray-800" },
                        react_1.default.createElement("h3", { className: "font-semibold mb-2 text-sm" }, "\u041D\u0430\u0439\u0434\u0435\u043D\u043D\u044B\u0435 \u043F\u043E\u0440\u043E\u0433\u0438"),
                        react_1.default.createElement("div", { className: "flex gap-4 flex-wrap" }, Object.entries(currentTone.found_thresholds).map(([freq, db]) => (react_1.default.createElement("div", { key: freq, className: "bg-gray-800 px-3 py-2 rounded-lg text-sm" },
                            react_1.default.createElement("span", { className: "text-gray-400" },
                                freq,
                                " \u0413\u0446:"),
                            " ",
                            react_1.default.createElement("span", { className: "text-blue-400 font-bold" },
                                db,
                                " \u0434\u0411"))))))),
                    react_1.default.createElement("div", { className: "text-center text-sm text-gray-500" },
                        "\u0428\u0430\u0433\u043E\u0432: ",
                        currentTone.steps_taken))),
                realDone && currentTone && (react_1.default.createElement("div", { className: "space-y-6" },
                    react_1.default.createElement("div", { className: "bg-green-900/30 border border-green-700 rounded-xl p-6 text-center" },
                        react_1.default.createElement("h2", { className: "text-xl font-bold text-green-400 mb-2" }, "\u2705 \u0422\u0435\u0441\u0442 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D!"),
                        react_1.default.createElement("p", { className: "text-gray-300" },
                            "\u0412\u0441\u0435\u0433\u043E \u0448\u0430\u0433\u043E\u0432: ",
                            currentTone.steps_taken)),
                    react_1.default.createElement(Audiogram, { thresholds: currentTone.found_thresholds, title: "\u0412\u0430\u0448\u0430 \u0430\u0443\u0434\u0438\u043E\u0433\u0440\u0430\u043C\u043C\u0430" }),
                    react_1.default.createElement("div", { className: "bg-gray-900 rounded-xl p-4 border border-gray-800" },
                        react_1.default.createElement("h3", { className: "font-semibold mb-3" }, "\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B"),
                        react_1.default.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3" }, Object.entries(currentTone.found_thresholds).map(([freq, db]) => (react_1.default.createElement("div", { key: freq, className: "bg-gray-800 p-3 rounded-lg text-center" },
                            react_1.default.createElement("div", { className: "text-gray-400 text-xs" },
                                freq,
                                " \u0413\u0446"),
                            react_1.default.createElement("div", { className: "text-xl font-bold text-blue-400" },
                                db,
                                " \u0434\u0411")))))),
                    react_1.default.createElement("button", { onClick: () => {
                            setRealDone(false);
                            setRealActive(false);
                            setCurrentTone(null);
                            setRealSteps([]);
                        }, className: "px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition" }, "\uD83D\uDD04 \u041F\u0440\u043E\u0439\u0442\u0438 \u0435\u0449\u0451 \u0440\u0430\u0437"))))),
            tab === "info" && (react_1.default.createElement("div", { className: "space-y-6" }, modelInfo ? (react_1.default.createElement(react_1.default.Fragment, null,
                react_1.default.createElement("div", { className: "bg-gray-900 rounded-xl p-6 border border-gray-800" },
                    react_1.default.createElement("h2", { className: "text-lg font-semibold mb-4" }, "\uD83E\uDDE0 \u0410\u0440\u0445\u0438\u0442\u0435\u043A\u0442\u0443\u0440\u0430 \u0418\u041D\u0421"),
                    react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6" },
                        react_1.default.createElement("div", null,
                            react_1.default.createElement("h3", { className: "text-sm font-semibold text-gray-400 mb-2" }, "\u041E\u0431\u0449\u0435\u0435"),
                            react_1.default.createElement("div", { className: "space-y-2 text-sm" },
                                react_1.default.createElement(InfoRow, { label: "\u0410\u043B\u0433\u043E\u0440\u0438\u0442\u043C", value: modelInfo.architecture.type }),
                                react_1.default.createElement(InfoRow, { label: "Policy", value: modelInfo.architecture.policy }),
                                react_1.default.createElement(InfoRow, { label: "Actor", value: modelInfo.architecture.actor }),
                                react_1.default.createElement(InfoRow, { label: "Critic", value: modelInfo.architecture.critic }))),
                        react_1.default.createElement("div", null,
                            react_1.default.createElement("h3", { className: "text-sm font-semibold text-gray-400 mb-2" }, "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F"),
                            react_1.default.createElement("div", { className: "flex flex-wrap gap-2" }, modelInfo.architecture.actions.map((a, i) => (react_1.default.createElement("span", { key: i, className: "bg-gray-800 px-3 py-1 rounded-full text-sm text-blue-300" }, a))))))),
                react_1.default.createElement("div", { className: "bg-gray-900 rounded-xl p-6 border border-gray-800" },
                    react_1.default.createElement("h3", { className: "text-sm font-semibold text-gray-400 mb-3" },
                        "Observation (",
                        modelInfo.architecture.observation_dim,
                        " \u043F\u0440\u0438\u0437\u043D\u0430\u043A\u043E\u0432)"),
                    react_1.default.createElement("div", { className: "space-y-1.5" }, modelInfo.architecture.features.map((f, i) => (react_1.default.createElement("div", { key: i, className: "flex items-center gap-2 text-sm" },
                        react_1.default.createElement("span", { className: "text-gray-500 font-mono w-6" },
                            "[",
                            i,
                            "]"),
                        react_1.default.createElement("span", { className: "text-gray-300" }, f)))))),
                react_1.default.createElement("div", { className: "bg-gray-900 rounded-xl p-6 border border-gray-800" },
                    react_1.default.createElement("h3", { className: "text-sm font-semibold text-gray-400 mb-3" }, "\u0421\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u044F \u0430\u0433\u0435\u043D\u0442\u0430"),
                    react_1.default.createElement("div", { className: "space-y-3 text-sm text-gray-300" },
                        react_1.default.createElement("div", { className: "flex gap-3" },
                            react_1.default.createElement("span", { className: "text-2xl" }, "1\uFE0F\u20E3"),
                            react_1.default.createElement("div", null,
                                react_1.default.createElement("p", { className: "font-semibold" }, "\u0413\u0440\u0443\u0431\u044B\u0439 \u043F\u043E\u0438\u0441\u043A (\u00B15 \u0434\u0411)"),
                                react_1.default.createElement("p", { className: "text-gray-500" }, "\u041D\u0430\u0447\u0438\u043D\u0430\u0435\u0442 \u0441 60 \u0434\u0411 \u0438 \u043A\u0440\u0443\u043F\u043D\u044B\u043C\u0438 \u0448\u0430\u0433\u0430\u043C\u0438 \u043D\u0430\u0445\u043E\u0434\u0438\u0442 \u0437\u043E\u043D\u0443 \u043F\u043E\u0440\u043E\u0433\u0430"))),
                        react_1.default.createElement("div", { className: "flex gap-3" },
                            react_1.default.createElement("span", { className: "text-2xl" }, "2\uFE0F\u20E3"),
                            react_1.default.createElement("div", null,
                                react_1.default.createElement("p", { className: "font-semibold" }, "\u0422\u043E\u0447\u043D\u044B\u0439 \u043F\u043E\u0438\u0441\u043A (\u00B11 \u0434\u0411)"),
                                react_1.default.createElement("p", { className: "text-gray-500" }, "\u041A\u043E\u0433\u0434\u0430 gap \u2264 6, \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0430\u0435\u0442\u0441\u044F \u043D\u0430 \u043C\u0435\u043B\u043A\u0438\u0435 \u0448\u0430\u0433\u0438"))),
                        react_1.default.createElement("div", { className: "flex gap-3" },
                            react_1.default.createElement("span", { className: "text-2xl" }, "3\uFE0F\u20E3"),
                            react_1.default.createElement("div", null,
                                react_1.default.createElement("p", { className: "font-semibold" }, "\u0421\u0422\u041E\u041F"),
                                react_1.default.createElement("p", { className: "text-gray-500" }, "\u041A\u043E\u0433\u0434\u0430 gap = 1 (min_heard - max_not_heard = 1), \u043F\u043E\u0440\u043E\u0433 \u043D\u0430\u0439\u0434\u0435\u043D \u0442\u043E\u0447\u043D\u043E"))))),
                react_1.default.createElement("div", { className: "bg-gray-900 rounded-xl p-6 border border-gray-800" },
                    react_1.default.createElement("h3", { className: "text-sm font-semibold text-gray-400 mb-3" }, "\u0421\u0438\u0441\u0442\u0435\u043C\u0430 \u043D\u0430\u0433\u0440\u0430\u0434"),
                    react_1.default.createElement("div", { className: "overflow-x-auto" },
                        react_1.default.createElement("table", { className: "w-full text-sm" },
                            react_1.default.createElement("thead", null,
                                react_1.default.createElement("tr", { className: "border-b border-gray-700 text-gray-400" },
                                    react_1.default.createElement("th", { className: "text-left py-2 px-3" }, "\u0423\u0441\u043B\u043E\u0432\u0438\u0435"),
                                    react_1.default.createElement("th", { className: "text-center py-2 px-3" }, "\u041D\u0430\u0433\u0440\u0430\u0434\u0430"))),
                            react_1.default.createElement("tbody", { className: "text-gray-300" },
                                react_1.default.createElement("tr", { className: "border-b border-gray-800" },
                                    react_1.default.createElement("td", { className: "py-2 px-3" }, "\u0421\u0422\u041E\u041F \u043F\u0440\u0438 gap=1 (\u0438\u0434\u0435\u0430\u043B\u044C\u043D\u043E)"),
                                    react_1.default.createElement("td", { className: "py-2 px-3 text-center text-green-400 font-bold" }, "+50")),
                                react_1.default.createElement("tr", { className: "border-b border-gray-800" },
                                    react_1.default.createElement("td", { className: "py-2 px-3" }, "\u0421\u0422\u041E\u041F \u043F\u0440\u0438 gap\u22642"),
                                    react_1.default.createElement("td", { className: "py-2 px-3 text-center text-green-400" }, "+30")),
                                react_1.default.createElement("tr", { className: "border-b border-gray-800" },
                                    react_1.default.createElement("td", { className: "py-2 px-3" }, "\u0421\u0443\u0436\u0435\u043D\u0438\u0435 gap \u0434\u043E 1"),
                                    react_1.default.createElement("td", { className: "py-2 px-3 text-center text-green-400" }, "+10")),
                                react_1.default.createElement("tr", { className: "border-b border-gray-800" },
                                    react_1.default.createElement("td", { className: "py-2 px-3" }, "\u041A\u0430\u0436\u0434\u044B\u0439 \u0448\u0430\u0433"),
                                    react_1.default.createElement("td", { className: "py-2 px-3 text-center text-red-400" }, "-0.3")),
                                react_1.default.createElement("tr", { className: "border-b border-gray-800" },
                                    react_1.default.createElement("td", { className: "py-2 px-3" }, "\u0411\u0435\u0441\u0441\u043C\u044B\u0441\u043B\u0435\u043D\u043D\u043E\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435"),
                                    react_1.default.createElement("td", { className: "py-2 px-3 text-center text-red-400" }, "-3")),
                                react_1.default.createElement("tr", { className: "border-b border-gray-800" },
                                    react_1.default.createElement("td", { className: "py-2 px-3" }, "\u00B11 \u043F\u0440\u0438 \u0431\u043E\u043B\u044C\u0448\u043E\u043C gap"),
                                    react_1.default.createElement("td", { className: "py-2 px-3 text-center text-red-400" }, "-2")),
                                react_1.default.createElement("tr", { className: "border-b border-gray-800" },
                                    react_1.default.createElement("td", { className: "py-2 px-3" }, "\u041F\u0440\u0435\u0432\u044B\u0448\u0435\u043D\u0438\u0435 \u043B\u0438\u043C\u0438\u0442\u0430 \u0448\u0430\u0433\u043E\u0432"),
                                    react_1.default.createElement("td", { className: "py-2 px-3 text-center text-red-400 font-bold" }, "-20")))))))) : (react_1.default.createElement("div", { className: "bg-gray-900 rounded-xl p-6 border border-gray-800 text-center text-gray-400" }, connected ? "Загрузка информации о модели..." : "Подключитесь к серверу"))))),
        react_1.default.createElement("footer", { className: "mt-12 pb-6 text-center text-xs text-gray-600" }, "\u0412\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u0430\u0443\u0434\u0438\u043E\u043C\u0435\u0442\u0440 \u2014 \u041C\u0430\u0433\u0438\u0441\u0442\u0435\u0440\u0441\u043A\u0430\u044F \u0440\u0430\u0431\u043E\u0442\u0430 | PPO + Gymnasium + Stable Baselines3")));
}
// ═══════════ Helper components ═══════════
function StatCard({ label, value, color = "blue" }) {
    const colorMap = {
        blue: "text-blue-400",
        green: "text-green-400",
        yellow: "text-yellow-400",
        red: "text-red-400",
    };
    return (react_1.default.createElement("div", { className: "bg-gray-900 rounded-xl p-4 border border-gray-800" },
        react_1.default.createElement("p", { className: "text-xs text-gray-500 mb-1" }, label),
        react_1.default.createElement("p", { className: `text-lg font-bold ${colorMap[color] || colorMap.blue}` }, value)));
}
function InfoRow({ label, value }) {
    return (react_1.default.createElement("div", { className: "flex justify-between" },
        react_1.default.createElement("span", { className: "text-gray-500" },
            label,
            ":"),
        react_1.default.createElement("span", { className: "text-gray-300 font-mono text-xs" }, value)));
}
