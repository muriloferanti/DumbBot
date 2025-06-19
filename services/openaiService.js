const axios = require('axios');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const memory = {};

const MAX_HISTORY = parseInt(process.env.OPENAI_MAX_HISTORY) || 50;
const RESPONSE_PROBABILITY =
    parseFloat(process.env.OPENAI_RESPONSE_PROBABILITY) || 0.7;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

const SYSTEM_PROMPT = fs.readFileSync(
    path.join(__dirname, '../configs/prompt.txt'),
    'utf8',
);

function saveMessage(jid, role, content) {
    if (!memory[jid]) memory[jid] = [];
    memory[jid].push({ role, content });

    if (memory[jid].length > MAX_HISTORY) {
        memory[jid] = memory[jid].slice(-MAX_HISTORY);
    }
}

function getHistory(jid) {
    return memory[jid] ? [...memory[jid]] : [];
}

function shouldRespond(isGroup) {
    const probability = isGroup
        ? RESPONSE_PROBABILITY_GROUP
        : RESPONSE_PROBABILITY_PRIVATE;
    return Math.random() < probability;
}

function shouldRespond(isGroup, probability = RESPONSE_PROBABILITY) {
    if (isGroup) {
        return Math.random() < probability;
    }
    return true;
}

async function askChatGPTWithMemory(jid, message) {
    const isGroup = jid.endsWith('@g.us');
    saveMessage(jid, 'user', message);

    if (!shouldRespond(isGroup)) {
        console.log(`🛑 Não respondeu ${jid} — caiu fora na roleta`);
        return null;
    }

    const chatHistory = getHistory(jid);
    const systemPrompt = { role: 'system', content: SYSTEM_PROMPT };

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: MODEL,
                messages: [systemPrompt, ...chatHistory],
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            },
        );

        const reply = response.data.choices[0].message.content.trim();

        saveMessage(jid, 'assistant', reply);

        return reply;
    } catch (error) {
        console.error(
            '❌ Erro na OpenAI:',
            error.response?.data || error.message,
        );
        return 'Deu ruim pra responder, tenta aí de novo depois.';
    }
}

module.exports = { askChatGPTWithMemory };
