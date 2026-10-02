import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function analyzeImage() {
  const zai = await ZAI.create()

  const imagePath = '/home/z/my-project/upload/pasted_image_1789654961210.png'
  const imageBuffer = fs.readFileSync(imagePath)
  const base64Image = imageBuffer.toString('base64')
  const dataUrl = `data:image/png;base64,${base64Image}`

  const prompt = `Проанализируй скриншот экрана пользователя подробно. Опиши:
1. Какой сайт/страница открыта?
2. Что видно на экране — элементы интерфейса, тексты, кнопки, формы
3. Есть ли сообщения об ошибках? Если да — какие именно?
4. Что пытался сделать пользователь и что получилось/не получилось?
5. Это страница входа Netlify, страница приложения, или что-то другое?
6. Виден ли список проектов или страница авторизации?
7. Любые URL в адресной строке, если видны

Дай максимально подробное описание на русском языке.`

  const response = await zai.chat.completions.create({
    model: 'glm-4.5v',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } },
        ] as any,
      },
    ],
    thinking: { type: 'disabled' },
  } as any)

  console.log(response?.choices?.[0]?.message?.content || 'no content')
}

analyzeImage().catch(console.error)
