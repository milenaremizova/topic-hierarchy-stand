import { randomInt } from 'node:crypto'

/**
 * Генератор случайных ФИО для учёток операторов.
 * Фамилии выбраны с окончаниями -ов/-ев/-ин, чтобы женская форма строилась добавлением «а».
 */

const SURNAMES = [
  'Воронов',
  'Соколов',
  'Лебедев',
  'Морозов',
  'Волков',
  'Зайцев',
  'Павлов',
  'Семёнов',
  'Голубев',
  'Виноградов',
  'Богданов',
  'Воробьёв',
  'Фёдоров',
  'Михайлов',
  'Беляев',
  'Тарасов',
  'Белов',
  'Комаров',
  'Орлов',
  'Киселёв',
  'Макаров',
  'Андреев',
  'Ковалёв',
  'Ильин',
  'Гусев',
  'Титов',
  'Кузьмин',
  'Кудрявцев',
  'Баранов',
  'Куликов',
  'Алексеев',
  'Степанов',
]

const MALE_NAMES = [
  'Александр',
  'Дмитрий',
  'Максим',
  'Сергей',
  'Андрей',
  'Алексей',
  'Артём',
  'Илья',
  'Кирилл',
  'Михаил',
  'Никита',
  'Матвей',
  'Роман',
  'Егор',
  'Арсений',
  'Иван',
]

const FEMALE_NAMES = [
  'Анастасия',
  'Мария',
  'Анна',
  'Виктория',
  'Екатерина',
  'Наталья',
  'Марина',
  'Полина',
  'Дарья',
  'Алина',
  'Ксения',
  'Елизавета',
  'Софья',
  'Вероника',
  'Ольга',
  'Юлия',
]

// [мужское, женское]
const PATRONYMICS: [string, string][] = [
  ['Александрович', 'Александровна'],
  ['Дмитриевич', 'Дмитриевна'],
  ['Сергеевич', 'Сергеевна'],
  ['Андреевич', 'Андреевна'],
  ['Алексеевич', 'Алексеевна'],
  ['Михайлович', 'Михайловна'],
  ['Игоревич', 'Игоревна'],
  ['Владимирович', 'Владимировна'],
  ['Николаевич', 'Николаевна'],
  ['Павлович', 'Павловна'],
  ['Викторович', 'Викторовна'],
  ['Олегович', 'Олеговна'],
]

const pick = <T>(list: readonly T[]): T => list[randomInt(list.length)]!

export function randomFio(): string {
  const female = randomInt(2) === 1
  const surname = pick(SURNAMES)
  const [mp, fp] = pick(PATRONYMICS)
  return female ? `${surname}а ${pick(FEMALE_NAMES)} ${fp}` : `${surname} ${pick(MALE_NAMES)} ${mp}`
}

/** count уникальных ФИО, не пересекающихся с уже занятыми */
export function uniqueFios(count: number, taken: Iterable<string> = []): string[] {
  const used = new Set(taken)
  const out: string[] = []
  let guard = 0
  while (out.length < count) {
    if (++guard > count * 1000) throw new Error('Не удалось подобрать уникальные ФИО')
    const fio = randomFio()
    if (used.has(fio)) continue
    used.add(fio)
    out.push(fio)
  }
  return out
}

/** «Воронова Анна Сергеевна» → «Воронова А. С.» — для системных строк в ленте */
export function shortFio(full: string): string {
  const [surname, name, patronymic] = full.split(' ')
  return [surname, name && `${name[0]}.`, patronymic && `${patronymic[0]}.`]
    .filter(Boolean)
    .join(' ')
}
