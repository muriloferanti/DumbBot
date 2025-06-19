const axios = require('axios');
const fs = require('fs');
const sharp = require('sharp');

async function analyzeImageWithOpenAI(filePath) {
    const processedPath = filePath.replace(/\.[^.]+$/, '.jpeg');

    await sharp(filePath)
        .rotate()
        .resize({ width: 1024, height: 1024, fit: 'inside' })
        .jpeg({ quality: 80 })
        .toFile(processedPath);

    const imageData = fs.readFileSync(processedPath, { encoding: 'base64' });

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Descreve o que tem nessa imagem como se fosse eu olhando ela, de forma simples, direta e objetiva, sem formalidade.',
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${imageData}`,
                                    detail: 'auto',
                                },
                            },
                        ],
                    },
                ],
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            },
        );

        return response.data.choices[0].message.content.trim();
    } finally {
        fs.unlink(processedPath, () => {});
    }
}

module.exports = { analyzeImageWithOpenAI };
