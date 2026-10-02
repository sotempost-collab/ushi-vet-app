import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function analyzeImage() {
  const zai = await ZAI.create()
  const imagePath = '/home/z/my-project/upload/2026-09-30_19-48-01.png'
  const imageBuffer = fs.readFileSync(imagePath)
  const base64Image = imageBuffer.toString('base64')
  const dataUrl = `data:image/png;base64,${base64Image}`

  const prompt = `Это скриншот экрана пользователя. Подробно опиши:
1) Какой URL открыт в адресной строке браузера?
2) Что показывает экран — ошибка, белый экран, страница входа, приложение?
3) Есть ли сообщения об ошибках? Какие именно?
4) Какой браузер используется?
5) Что видно в консоли разработчика (если открыта)?
6) Виден ли текст "Failed to fetch" или "Не удалось" или "ошибка"?`

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
