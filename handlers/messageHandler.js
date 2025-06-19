const { askChatGPTWithMemory, addUserMessage } = require('../services/openaiService');
const { transcribeAudio } = require('../services/transcriptionService');
const { analyzeImageWithOpenAI } = require('../services/imageService');
const { sendSticker } = require('../services/stickerService');
const allowedContacts = require('../configs/allowedContacts');
const allowedGroups = require('../configs/allowedGroups');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const mentionKeyword = process.env.MENTION_KEYWORD
    ? process.env.MENTION_KEYWORD.toLowerCase()
    : null;

const groupCounters = {};
const groupThresholds = {};
const lastStickerResponse = {};

function getRandomGroupThreshold() {
    return Math.floor(Math.random() * 3) + 2; // 2 to 4 messages
}

function getRandomDelay(min = 2000, max = 30000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function sendTypingAndReply(sock, msg, text) {
    const jid = msg.key.remoteJid;

    try {
        await sock.presenceSubscribe(jid);
        await sock.sendPresenceUpdate('composing', jid);

        const delayMs = getRandomDelay(2000, 30000);
        console.log(`⏳ Delay de ${delayMs}ms antes de responder`);

        await new Promise((resolve) => setTimeout(resolve, delayMs));

        await sock.sendPresenceUpdate('paused', jid);

        const shouldReply = delayMs >= 15000;

        const hasMessage = msg.message && Object.keys(msg.message).length > 0;

        const messageOptions =
            shouldReply && hasMessage
                ? { text: text, quoted: msg }
                : { text: text };

        await sock.sendMessage(jid, messageOptions);
    } catch (error) {
        console.error('❌ Erro simulando digitação:', error);
    }
}

async function handleMessage(sock, msg) {
    const from = msg.key.remoteJid;
    let content = msg.message;
    if (content.ephemeralMessage) {
        content = content.ephemeralMessage.message;
    }
    const messageType = Object.keys(content)[0];

    const quotedParticipant = content[messageType]?.contextInfo?.participant;
    const getBaseId = (jid) => jid?.split(':')[0];
    const isReplyToBot =
        quotedParticipant &&
        getBaseId(quotedParticipant) === getBaseId(sock.user?.id);

    const isGroup = from.endsWith('@g.us');
    const isAllowed =
        (isGroup && allowedGroups.includes(from)) ||
        (!isGroup && allowedContacts.includes(from));

    if (!isAllowed) {
        console.log(`🚫 Mensagem ignorada de ${from}`);
        return;
    }

    let text;

    if (messageType === 'conversation' || messageType === 'extendedTextMessage') {
        text = content.conversation || content.extendedTextMessage?.text;
    }

    if (messageType === 'audioMessage') {
        console.log('🎧 Recebeu um áudio');

        const tempDir = path.join(__dirname, '../temp');
        fs.mkdirSync(tempDir, { recursive: true });
        const filePath = path.join(tempDir, `${Date.now()}.mp3`);
        const stream = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            { logger: console, sock },
        );
        fs.writeFileSync(filePath, stream);

        try {
            text = await transcribeAudio(filePath);
            console.log(`📝 Transcrição: ${text}`);
        } catch (err) {
            console.error('❌ Erro na transcrição:', err);
            await sendTypingAndReply(
                sock,
                msg,
                'Não consegui entender o áudio, tenta de novo.',
            );
            fs.unlinkSync(filePath);
            return;
        }

        fs.unlinkSync(filePath);
    }

    if (messageType === 'imageMessage') {
        console.log('🖼️ Recebeu uma imagem');

        const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            { logger: console, sock },
        );

        try {
            text = await analyzeImageWithOpenAI(buffer);
            console.log('🧠 Análise da imagem:', text);
        } catch (err) {
            console.error('❌ Erro analisando imagem:', err);
            await sendTypingAndReply(
                sock,
                msg,
                'Não consegui entender essa imagem aí não',
            );
            return;
        }
    }

    if (messageType === 'stickerMessage') {
        console.log('🤪 Recebeu uma figurinha');

        const now = Date.now();
        const lastTime = lastStickerResponse[from] || 0;

        if (now - lastTime < 60000) {
            console.log('⌛ Ignorando figurinha para evitar loop');
            return;
        }

        await sendSticker(sock, from, 'random');
        lastStickerResponse[from] = now;
        return;
    }

    if (!text) return;

    console.log(`📥 Mensagem de ${from}: ${text}`);

    const isMention =
        mentionKeyword && text.toLowerCase().includes(mentionKeyword);

    let resposta;

    if (isReplyToBot || isMention) {
        resposta = await askChatGPTWithMemory(from, text, true);
    } else if (isGroup) {
        addUserMessage(from, text);
        groupCounters[from] = (groupCounters[from] || 0) + 1;
        if (!groupThresholds[from]) {
            groupThresholds[from] = getRandomGroupThreshold();
        }

        if (groupCounters[from] < groupThresholds[from]) {
            const restante = groupThresholds[from] - groupCounters[from];
            console.log(`⌛ Aguardando mais ${restante} mensagens para responder no grupo ${from}`);
            return;
        }

        groupCounters[from] = 0;
        groupThresholds[from] = getRandomGroupThreshold();
        resposta = await askChatGPTWithMemory(from);
    } else {
        resposta = await askChatGPTWithMemory(from, text);
    }

    if (resposta) {
        const stickerMatch = resposta.match(/\[sticker:(.*?)]/i);

        if (stickerMatch) {
            const stickerName = stickerMatch[1].trim().toLowerCase();
            const cleanText = resposta.replace(/\[sticker:.*?]/i, '').trim();

            if (cleanText) {
                await sendTypingAndReply(sock, msg, cleanText);
            }

            await sendSticker(sock, from, stickerName);
        } else {
            await sendTypingAndReply(sock, msg, resposta);
        }

        console.log(`📤 Resposta enviada para ${from}`);
    } else {
        console.log(`🛑 Não respondeu ${from} dessa vez`);
    }
}

module.exports = { handleMessage };
