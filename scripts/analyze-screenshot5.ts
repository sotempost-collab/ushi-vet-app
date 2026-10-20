import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function analyzeImage() {
  const zai = await ZAI.create()
  const imagePath = '/home/z/my-project/upload/pasted_image_1790864404039.png'
  const imageBuffer = fs.readFileSync(imagePath)
  const base64Image = imageBuffer.toString('base64')
  const dataUrl = `data:image/png;base64,${base64Image}`

  const prompt = `Это скриншот экрана пользователя. Опиши МАКСИМАЛЬНО подробно:
1) Какой URL в адресной строке?
2) Что показывает экран — ошибка, белый экран, страница входа?
3) Какие сообщения об ошибках видны? Точный текст ошибки.
4) Какой браузер?
5) Что видно в консоли разработчика?
6) Есть ли текст ERR_CONNECTION_RESET, Failed to fetch, "Не удаётся"?`

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
