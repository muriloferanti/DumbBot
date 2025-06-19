const axios = require('axios');
const sharp = require('sharp');

/**
 * Process an image buffer and send it to the OpenAI Chat API using GPT-4o
 * for analysis. The image is rotated, resized to fit within 1024x1024 and
 * converted to JPEG to keep the payload small.
 *
 * @param {Buffer} buffer Raw image data
 * @returns {Promise<string>} Description returned by OpenAI
 */
async function analyzeImageWithOpenAI(buffer) {
    const processedBuffer = await sharp(buffer)
        .rotate()
        .resize({ width: 1024, height: 1024, fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();

    const imageData = processedBuffer.toString('base64');

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
                            text: 'Descreve o que tem nessa imagem como se fosse eu olhando ela, de forma simples, direta e objetiva, sem formalidade.'
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${imageData}`,
                                detail: 'auto'
                            }
                        }
                    ]
                }
            ]
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        }
    );

    return response.data.choices[0].message.content.trim();
}

module.exports = { analyzeImageWithOpenAI };
