const { askChatGPT } = require('../services/openaiService');
const allowedContacts = require('../configs/allowedContacts');

async function handleMessage(sock, msg) {
    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

    if (!text) return;

    if (allowedContacts.includes(from)) {
        console.log(`📥 Mensagem de ${from}: ${text}`);

        const resposta = await askChatGPT(text);

        await sock.sendMessage(from, { text: resposta });

        console.log(`📤 Resposta enviada para ${from}`);
    } else {
        console.log(`🚫 Mensagem ignorada de ${from}`);
    }
}

module.exports = { handleMessage };
