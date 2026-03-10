"use strict";
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
exports.checkHealth = checkHealth;
exports.getModelInfo = getModelInfo;
exports.runVirtualTest = runVirtualTest;
exports.startRealTest = startRealTest;
exports.sendStep = sendStep;
exports.getResults = getResults;
const API_BASE = "http://localhost:8000";
function checkHealth() {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield fetch(`${API_BASE}/api/health`);
        if (!res.ok)
            throw new Error("Server unavailable");
        return res.json();
    });
}
function getModelInfo() {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield fetch(`${API_BASE}/api/model_info`);
        if (!res.ok)
            throw new Error("Failed to get model info");
        return res.json();
    });
}
function runVirtualTest() {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield fetch(`${API_BASE}/api/virtual_test`, { method: "POST" });
        if (!res.ok)
            throw new Error("Virtual test failed");
        return res.json();
    });
}
function startRealTest(sessionId) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield fetch(`${API_BASE}/api/start_test`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId }),
        });
        if (!res.ok)
            throw new Error("Failed to start test");
        return res.json();
    });
}
function sendStep(sessionId, heard) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield fetch(`${API_BASE}/api/step`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId, heard }),
        });
        if (!res.ok)
            throw new Error("Step failed");
        return res.json();
    });
}
function getResults(sessionId) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield fetch(`${API_BASE}/api/results/${sessionId}`);
        if (!res.ok)
            throw new Error("Failed to get results");
        return res.json();
    });
}
