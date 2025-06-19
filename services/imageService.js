const axios = require('axios');
const fs = require('fs');

async function analyzeImageWithOpenAI(filePath) {
    const imageData = fs.readFileSync(filePath, { encoding: 'base64' });

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
                            image_url: `data:image/jpeg;base64,${imageData}`,
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
}

module.exports = { analyzeImageWithOpenAI };
