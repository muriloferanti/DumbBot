const { askChatGPTWithMemory } = require('../services/openaiService');
const { transcribeAudio } = require('../services/transcriptionService');
const allowedContacts = require('../configs/allowedContacts');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

async function handleMessage(sock, msg) {
    const from = msg.key.remoteJid;
    const messageType = Object.keys(msg.message)[0];

    if (!allowedContacts.includes(from)) {
        console.log(`🚫 Mensagem ignorada de ${from}`);
        return;
    }

    let text;

    if (messageType === 'conversation' || messageType === 'extendedTextMessage') {
        text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    }

    if (messageType === 'audioMessage') {
        console.log('🎧 Recebeu um áudio');

        const filePath = path.join(__dirname, `../temp/${Date.now()}.mp3`);

        const stream = await downloadMediaMessage(msg, 'buffer', {}, { logger: console, sock });

        fs.writeFileSync(filePath, stream);

        try {
            text = await transcribeAudio(filePath);
            console.log(`📝 Transcrição: ${text}`);
        } catch (err) {
            console.error('❌ Erro na transcrição:', err);
            await sock.sendMessage(from, { text: 'Não consegui entender o áudio, tenta de novo.' });
            fs.unlinkSync(filePath);
            return;
        }

        fs.unlinkSync(filePath);
    }

    if (messageType === 'stickerMessage') {
        console.log('🤪 Recebeu uma figurinha');
        await sock.sendMessage(from, { text: '👏 Bela figurinha 👀' });
        return;
    }

    if (!text) return;

    console.log(`📥 Mensagem de ${from}: ${text}`);

    const resposta = await askChatGPTWithMemory(from, text);

    await sock.sendMessage(from, { text: resposta });

    console.log(`📤 Resposta enviada para ${from}`);
}

module.exports = { handleMessage };
