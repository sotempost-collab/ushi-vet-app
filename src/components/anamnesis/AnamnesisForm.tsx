'use client'

import { useVetStore } from '@/store/vetStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { VoiceInput } from '@/components/ui/voice-input'
import {
  Home,
  UtensilsCrossed,
  ShieldCheck,
  Stethoscope,
  Layers,
  AlertTriangle,
  History,
  Heart,
} from 'lucide-react'

const sections = [
  { id: 1, title: 'Содержание и образ жизни', icon: Home, color: 'text-emerald-600' },
  { id: 2, title: 'Кормление и вода', icon: UtensilsCrossed, color: 'text-amber-600' },
  { id: 3, title: 'Профилактика', icon: ShieldCheck, color: 'text-sky-600' },
  { id: 4, title: 'Главная жалоба и история заболевания', icon: AlertTriangle, color: 'text-rose-600' },
  { id: 5, title: 'Опрос по системам', icon: Layers, color: 'text-violet-600' },
  { id: 6, title: 'Эпидемиологические риски', icon: Stethoscope, color: 'text-cyan-600' },
  { id: 7, title: 'Предыдущие болезни и лекарства', icon: History, color: 'text-orange-600' },
  { id: 8, title: 'Репродуктивный анамнез', icon: Heart, color: 'text-pink-600' },
]

export function AnamnesisForm() {
  const anamnesis = useVetStore((s) => s.anamnesis)
  const setAnamnesis = useVetStore((s) => s.setAnamnesis)

  const update = (field: keyof typeof anamnesis, value: string) => {
    setAnamnesis({ [field]: value } as Partial<typeof anamnesis>)
  }

  return (
    <div className="space-y-6">
      {/* Раздел 1 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-emerald-600" />
            1. Содержание и образ жизни
          </CardTitle>
          <CardDescription>Условия содержания, окружение, физическая активность</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Где живёт</Label>
            <Select
              value={anamnesis.livingConditions}
              onValueChange={(v) => update('livingConditions', v)}
            >
              <SelectTrigger><SelectValue placeholder="Квартира / дом / улица" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="apartment">Квартира</SelectItem>
                <SelectItem value="house">Частный дом</SelectItem>
                <SelectItem value="aviary">Вольер</SelectItem>
                <SelectItem value="street">Уличное содержание</SelectItem>
                <SelectItem value="shelter">Приют</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Доступ на улицу / режим прогулок</Label>
            <Textarea
              placeholder="Напр.: выгул 2 раза в день, без привязи"
              value={anamnesis.outdoorAccess}
              onChange={(e) => update('outdoorAccess', e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Другие животные дома</Label>
            <Input
              placeholder="Напр.: 1 кошка, 2 собаки"
              value={anamnesis.otherAnimals}
              onChange={(e) => update('otherAnimals', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Контакты с чужими животными</Label>
            <Textarea
              placeholder="Напр.: контакт с бездомными собаками на прогулке"
              value={anamnesis.contactsStrangers}
              onChange={(e) => update('contactsStrangers', e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Кто ухаживает</Label>
            <Input
              placeholder="Напр.: владелец"
              value={anamnesis.caretaker}
              onChange={(e) => update('caretaker', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Кто принимает решения по лечению</Label>
            <Input
              placeholder="Напр.: владелец"
              value={anamnesis.decisionMaker}
              onChange={(e) => update('decisionMaker', e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Физическая нагрузка</Label>
            <Textarea
              placeholder="Напр.: 2 прогулки по 30 мин, игры с мячом"
              value={anamnesis.physicalActivity}
              onChange={(e) => update('physicalActivity', e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Раздел 2 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-amber-600" />
            2. Кормление и вода
          </CardTitle>
          <CardDescription>Тип рациона, частота, доступ к нежелательному</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Тип рациона</Label>
            <Select
              value={anamnesis.dietType}
              onValueChange={(v) => update('dietType', v)}
            >
              <SelectTrigger><SelectValue placeholder="Выберите тип" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="commercial">Промышленный корм</SelectItem>
                <SelectItem value="natural">Натуральное кормление</SelectItem>
                <SelectItem value="mixed">Смешанный</SelectItem>
                <SelectItem value="raw">RAW / BARF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Бренд / линейка корма</Label>
            <Input
              placeholder="Напр.: Royal Canin Adult Medium"
              value={anamnesis.dietBrand}
              onChange={(e) => update('dietBrand', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Частота кормления</Label>
            <Select
              value={anamnesis.feedingFreq}
              onValueChange={(v) => update('feedingFreq', v)}
            >
              <SelectTrigger><SelectValue placeholder="Сколько раз в день" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 раз в день</SelectItem>
                <SelectItem value="2">2 раза в день</SelectItem>
                <SelectItem value="3">3 раза в день</SelectItem>
                <SelectItem value="free">Свободный доступ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Объём кормления</Label>
            <Input
              placeholder="Напр.: 300 г/день"
              value={anamnesis.feedingVolume}
              onChange={(e) => update('feedingVolume', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Лакомства</Label>
            <Input
              placeholder="Напр.: жевательные кости, кошачьи лакомства"
              value={anamnesis.treats}
              onChange={(e) => update('treats', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Добавки / витамины</Label>
            <Input
              placeholder="Напр.: омега-3, пробиотики"
              value={anamnesis.supplements}
              onChange={(e) => update('supplements', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Изменения рациона недавно</Label>
            <Textarea
              placeholder="Напр.: сменили корм 2 недели назад"
              value={anamnesis.dietChanges}
              onChange={(e) => update('dietChanges', e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Доступ к корму со стола</Label>
            <Select
              value={anamnesis.tableFoodAccess}
              onValueChange={(v) => update('tableFoodAccess', v)}
            >
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no">Нет</SelectItem>
                <SelectItem value="yes">Да</SelectItem>
                <SelectItem value="occasionally">Иногда</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Доступ к мусору</Label>
            <Select
              value={anamnesis.trashAccess}
              onValueChange={(v) => update('trashAccess', v)}
            >
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no">Нет</SelectItem>
                <SelectItem value="yes">Да</SelectItem>
                <SelectItem value="sometimes">Иногда</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Источник воды</Label>
            <Input
              placeholder="Напр.: фильтрованная вода, миска"
              value={anamnesis.waterSource}
              onChange={(e) => update('waterSource', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Как часто меняют воду</Label>
            <Input
              placeholder="Напр.: 1 раз в день"
              value={anamnesis.waterChangeFreq}
              onChange={(e) => update('waterChangeFreq', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Сколько пьёт (оценка владельца)</Label>
            <Input
              placeholder="Напр.: ~500 мл/день"
              value={anamnesis.waterIntake}
              onChange={(e) => update('waterIntake', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Раздел 3 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-sky-600" />
            3. Профилактика
          </CardTitle>
          <CardDescription>Вакцинация, обработки, кастрация/стерилизация</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Вакцинация (препарат)</Label>
            <Input
              placeholder="Напр.: Nobivac DHPPi + R"
              value={anamnesis.vaccination}
              onChange={(e) => update('vaccination', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Дата последней вакцинации</Label>
            <Input
              type="date"
              value={anamnesis.vaccinationDate}
              onChange={(e) => update('vaccinationDate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Обработка от блох/клещей (препарат)</Label>
            <Input
              placeholder="Напр.: Бравекто, Фронтлайн"
              value={anamnesis.fleaTickTreatment}
              onChange={(e) => update('fleaTickTreatment', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Дата последней обработки</Label>
            <Input
              type="date"
              value={anamnesis.fleaTickDate}
              onChange={(e) => update('fleaTickDate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Дегельминтизация (препарат)</Label>
            <Input
              placeholder="Напр.: Дронтал, Мильбемакс"
              value={anamnesis.deworming}
              onChange={(e) => update('deworming', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Дата последней дегельминтизации</Label>
            <Input
              type="date"
              value={anamnesis.dewormingDate}
              onChange={(e) => update('dewormingDate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Кастрация / стерилизация</Label>
            <RadioGroup
              value={anamnesis.neutered || ''}
              onValueChange={(v) => update('neutered', v)}
              className="flex gap-6 pt-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="neut-yes" value="yes" />
                <Label htmlFor="neut-yes">Да</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="neut-no" value="no" />
                <Label htmlFor="neut-no">Нет</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label>Дата операции</Label>
            <Input
              type="date"
              value={anamnesis.neuteredDate}
              onChange={(e) => update('neuteredDate', e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Осложнения после операции</Label>
            <Textarea
              placeholder="Напр.: без осложнений / нагноение шва"
              value={anamnesis.neuteredComplications}
              onChange={(e) => update('neuteredComplications', e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Раздел 4 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            4. Главная жалоба и история текущего заболевания
          </CardTitle>
          <CardDescription>Что беспокоит, когда началось, чем лечили</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Что именно беспокоит? С чего началось? 🎤</Label>
            <VoiceInput
              placeholder="Напр.: отказ от корма, рвота 3 раза за день, вялость"
              value={anamnesis.mainComplaint}
              onChange={(v) => update('mainComplaint', v)}
              rows={3}
              fieldId="mainComplaint"
            />
          </div>
          <div className="space-y-2">
            <Label>Когда заметили первые признаки</Label>
            <VoiceInput
              placeholder="Напр.: 3 дня назад"
              value={anamnesis.complaintOnset}
              onChange={(v) => update('complaintOnset', v)}
              rows={2}
              fieldId="complaintOnset"
            />
          </div>
          <div className="space-y-2">
            <Label>Как развивались симптомы</Label>
            <VoiceInput
              placeholder="Напр.: постепенно нарастали"
              value={anamnesis.complaintDevelopment}
              onChange={(v) => update('complaintDevelopment', v)}
              rows={2}
              fieldId="complaintDevelopment"
            />
          </div>
          <div className="space-y-2">
            <Label>С чем владелец связывает начало</Label>
            <VoiceInput
              placeholder="Напр.: стресс, новый корм, укус клеща, травма"
              value={anamnesis.associatedFactors}
              onChange={(v) => update('associatedFactors', v)}
              rows={2}
              fieldId="associatedFactors"
            />
          </div>
          <div className="space-y-2">
            <Label>Была ли такая проблема раньше, исход</Label>
            <VoiceInput
              placeholder="Напр.: 2 года назад, лечение помогло"
              value={anamnesis.previousEpisodes}
              onChange={(v) => update('previousEpisodes', v)}
              rows={2}
              fieldId="previousEpisodes"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Какая помощь уже оказана по текущей проблеме 🎤</Label>
            <VoiceInput
              placeholder="Напр.: дал Метоклопрамид 0.5 мг, эффект через 30 мин"
              value={anamnesis.currentTreatment}
              onChange={(v) => update('currentTreatment', v)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Раздел 5 — Опрос по системам */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-violet-600" />
            5. Опрос по системам (кратко)
          </CardTitle>
          <CardDescription>Скрининг всех систем для выявления сопутствующих жалоб</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Общее: активность, вес, лихорадка, поведение 🎤</Label>
            <VoiceInput
              rows={3}
              value={anamnesis.generalStatus}
              onChange={(v) => update('generalStatus', v)}
              fieldId="generalStatus"
            />
          </div>
          <div className="space-y-2">
            <Label>Кашель / одышка: характер, при нагрузке/ночью, выделения 🎤</Label>
            <VoiceInput
              rows={3}
              value={anamnesis.coughDyspnea}
              onChange={(v) => update('coughDyspnea', v)}
              fieldId="coughDyspnea"
            />
          </div>
          <div className="space-y-2">
            <Label>Полиурия / полидипсия 🎤</Label>
            <VoiceInput
              placeholder="Сколько пьёт/мочится, ночные мочеиспускания, сопутствующие симптомы"
              rows={3}
              value={anamnesis.polyuriaPolydipsia}
              onChange={(v) => update('polyuriaPolydipsia', v)}
              fieldId="polyuriaPolydipsia"
            />
          </div>
          <div className="space-y-2">
            <Label>Аппетит / ЖКТ: аппетит, рвота, стул, доступ к инородному 🎤</Label>
            <VoiceInput
              rows={3}
              value={anamnesis.appetiteGi}
              onChange={(v) => update('appetiteGi', v)}
              fieldId="appetiteGi"
            />
          </div>
          <div className="space-y-2">
            <Label>Мочеполовая: частота, характер, цвет, недержание, течки 🎤</Label>
            <VoiceInput
              rows={3}
              value={anamnesis.urogenital}
              onChange={(v) => update('urogenital', v)}
              fieldId="urogenital"
            />
          </div>
          <div className="space-y-2">
            <Label>Кожа / шерсть: зуд, расчёсы, алопеция, перхоть, паразиты 🎤</Label>
            <VoiceInput
              rows={3}
              value={anamnesis.skin}
              onChange={(v) => update('skin', v)}
              fieldId="skin"
            />
          </div>
          <div className="space-y-2">
            <Label>Нервная / органы чувств: судороги, шаткость, наклон головы, глаза 🎤</Label>
            <VoiceInput
              rows={3}
              value={anamnesis.nervous}
              onChange={(v) => update('nervous', v)}
              fieldId="nervous"
            />
          </div>
          <div className="space-y-2">
            <Label>Опорно-двигательный: хромота, нежелание прыгать, травмы 🎤</Label>
            <VoiceInput
              rows={3}
              value={anamnesis.musculoskeletal}
              onChange={(v) => update('musculoskeletal', v)}
              fieldId="musculoskeletal"
            />
          </div>
        </CardContent>
      </Card>

      {/* Раздел 6 — Эпидемиологические риски */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-cyan-600" />
            6. Эпидемиологические риски
          </CardTitle>
          <CardDescription>Поездки, контакты, специфика содержания</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Поездки, выставки, передержки, груминг</Label>
            <Textarea
              rows={2}
              value={anamnesis.travel}
              onChange={(e) => update('travel', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Больные животные в доме/подъезде</Label>
            <Textarea
              rows={2}
              value={anamnesis.sickAnimalsNearby}
              onChange={(e) => update('sickAnimalsNearby', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Для собак: где гуляет, контакт с дикими/падалью/грызунами</Label>
            <Textarea
              rows={2}
              value={anamnesis.walkingArea}
              onChange={(e) => update('walkingArea', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Для кошек: охота, вода из луж/туалета</Label>
            <Textarea
              rows={2}
              value={anamnesis.huntingBehavior}
              onChange={(e) => update('huntingBehavior', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Выставки</Label>
            <Input
              value={anamnesis.exhibitions}
              onChange={(e) => update('exhibitions', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Передержки</Label>
            <Input
              value={anamnesis.boarding}
              onChange={(e) => update('boarding', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Груминг</Label>
            <Input
              value={anamnesis.grooming}
              onChange={(e) => update('grooming', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Контакт с дикими животными</Label>
            <Input
              value={anamnesis.wildlifeContact}
              onChange={(e) => update('wildlifeContact', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Раздел 7 — Предыдущие болезни и лекарства */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-orange-600" />
            7. Предыдущие болезни и лекарства
          </CardTitle>
          <CardDescription>Анамнез жизни, хронические диагнозы, аллергии</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Перенесённые заболевания</Label>
            <Textarea
              rows={3}
              value={anamnesis.previousDiseases}
              onChange={(e) => update('previousDiseases', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Операции и травмы</Label>
            <Textarea
              rows={3}
              value={anamnesis.surgeries}
              onChange={(e) => update('surgeries', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Хронические диагнозы</Label>
            <Textarea
              rows={3}
              value={anamnesis.chronicDiseases}
              onChange={(e) => update('chronicDiseases', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Постоянные препараты (название, доза, длительность)</Label>
            <Textarea
              rows={3}
              value={anamnesis.permanentMedications}
              onChange={(e) => update('permanentMedications', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Аллергии / непереносимости (препараты, корма, укусы)</Label>
            <Textarea
              rows={3}
              value={anamnesis.allergies}
              onChange={(e) => update('allergies', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Проблемы при прошлых анестезиях/седациях</Label>
            <Textarea
              rows={3}
              value={anamnesis.anesthesiaIssues}
              onChange={(e) => update('anesthesiaIssues', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Раздел 8 — Репродуктивный анамнез */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-600" />
            8. Репродуктивный анамнез
          </CardTitle>
          <CardDescription>Заполняется при необходимости</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Самки: возраст первой течки</Label>
            <Input
              value={anamnesis.firstEstrus}
              onChange={(e) => update('firstEstrus', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Регулярность и длительность течки</Label>
            <Input
              placeholder="Напр.: регулярная, 7 дней"
              value={anamnesis.estrusRegularity}
              onChange={(e) => update('estrusRegularity', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Ложные беременности</Label>
            <Input
              value={anamnesis.falsePregnancies}
              onChange={(e) => update('falsePregnancies', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Пиометра в анамнезе</Label>
            <Input
              value={anamnesis.pyometra}
              onChange={(e) => update('pyometra', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Роды (количество, исход)</Label>
            <Input
              value={anamnesis.births}
              onChange={(e) => update('births', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Самцы: использование в разведении</Label>
            <Input
              value={anamnesis.breedingMales}
              onChange={(e) => update('breedingMales', e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Проблемы с семенниками / простатой</Label>
            <Textarea
              rows={2}
              value={anamnesis.prostateIssues}
              onChange={(e) => update('prostateIssues', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
