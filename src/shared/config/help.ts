/**
 * Service ("non-product") topics. Shared by the help pages and by search, so a
 * query like "возврат" or "статус заказа" lands on an answer instead of
 * "nothing found" (Baymard: 66% of sites fail non-product queries).
 */
export const HELP_TOPICS = [
  {
    id: 'delivery',
    title: 'Доставка',
    summary: 'Сроки, стоимость и способы получения',
    keywords: [
      'доставка',
      'доставить',
      'курьер',
      'привезти',
      'сроки',
      'пункт выдачи',
      'самовывоз',
      'когда привезут',
    ],
  },
  {
    id: 'returns',
    title: 'Возврат и обмен',
    summary: '30 дней на возврат без объяснения причин',
    keywords: [
      'возврат',
      'вернуть',
      'обмен',
      'обменять',
      'отказ',
      'отказаться',
      'не подошло',
      'деньги назад',
    ],
  },
  {
    id: 'warranty',
    title: 'Гарантия и ремонт',
    summary: 'Официальная гарантия и сервисные центры',
    keywords: ['гарантия', 'гарантийный', 'ремонт', 'сломалось', 'сервис', 'брак', 'не работает'],
  },
  {
    id: 'payment',
    title: 'Оплата',
    summary: 'Карты, СБП и оплата при получении',
    keywords: [
      'оплата',
      'оплатить',
      'карта',
      'сбп',
      'наличные',
      'рассрочка',
      'чек',
      'безопасность',
    ],
  },
  {
    id: 'order-status',
    title: 'Статус заказа',
    summary: 'Где мой заказ и как его изменить',
    keywords: [
      'статус',
      'заказ',
      'где заказ',
      'отследить',
      'трек',
      'отменить заказ',
      'изменить заказ',
    ],
  },
  {
    id: 'contacts',
    title: 'Связаться с нами',
    summary: 'Консультант ответит в течение 5 минут',
    keywords: [
      'контакты',
      'телефон',
      'позвонить',
      'консультант',
      'поддержка',
      'помощь',
      'связаться',
      'чат',
      'telegram',
    ],
  },
  {
    id: 'seller',
    title: 'Сведения о продавце',
    summary: 'Реквизиты и юридическая информация',
    keywords: ['продавец', 'реквизиты', 'инн', 'огрн', 'юридический', 'адрес', 'компания', 'о нас'],
  },
] as const

export type HelpTopicId = (typeof HELP_TOPICS)[number]['id']
export type HelpTopic = (typeof HELP_TOPICS)[number]

export const isHelpTopicId = (v: unknown): v is HelpTopicId => HELP_TOPICS.some((t) => t.id === v)
