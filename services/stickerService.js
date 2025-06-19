const path = require('path');
const fs = require('fs');

async function sendSticker(sock, jid, stickerName) {
    try {
        const stickerFolder = path.join(__dirname, '../stickers');
        const stickers = fs
            .readdirSync(stickerFolder)
            .filter((file) => file.endsWith('.webp'));

        if (!stickers.length) {
            console.log('❌ Nenhuma figurinha na pasta stickers');
            return;
        }

        let stickerFile;

        if (stickerName === 'random') {
            stickerFile = stickers[Math.floor(Math.random() * stickers.length)];
        } else {
            stickerFile = stickers.find((s) => s.startsWith(stickerName));
            if (!stickerFile) {
                console.log(`❌ Figurinha ${stickerName} não encontrada`);
                return;
            }
        }

        const stickerPath = path.join(stickerFolder, stickerFile);
        const buffer = fs.readFileSync(stickerPath);

        await sock.sendMessage(jid, { sticker: buffer });
    } catch (error) {
        console.error('❌ Erro enviando figurinha:', error);
    }
}

module.exports = { sendSticker };
