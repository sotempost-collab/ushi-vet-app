import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function analyzeImage() {
  const zai = await ZAI.create()

  const imagePath = '/home/z/my-project/upload/pasted_image_1789736088677.png'
  const imageBuffer = fs.readFileSync(imagePath)
  const base64Image = imageBuffer.toString('base64')
  const dataUrl = `data:image/png;base64,${base64Image}`

  const prompt = `Это скриншот экрана пользователя в ветеринарном приложении. Опиши подробно что ты видишь — какие сообщения об ошибках, какой интерфейс, какие файлы загружены. Особенно обрати внимание на сообщения "Не удалось распознать текст" или "Failed to fetch" или "PDF".`

  const response = await zai.chat.completions.createVision({
    model: 'glm-4.5v',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  })

  console.log(response?.choices?.[0]?.message?.content || 'no content')
}

analyzeImage().catch(console.error)
