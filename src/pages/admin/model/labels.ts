import type { Role } from '@/entities/session'

import type { ReturnStatus, ReviewStatus } from '../api/admin-api'

export const ROLE_LABELS: Record<Role, string> = {
  CUSTOMER: 'Покупатель',
  MANAGER: 'Менеджер',
  ADMIN: 'Администратор',
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  PENDING: 'На модерации',
  PUBLISHED: 'Опубликованы',
  REJECTED: 'Отклонены',
}

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  REQUESTED: 'Новая',
  APPROVED: 'Одобрена',
  REJECTED: 'Отклонена',
  COMPLETED: 'Завершена',
}

/** Next steps a manager can take on a return request; the API enforces the same map. */
export const RETURN_ACTIONS: Record<ReturnStatus, { to: ReturnStatus; label: string }[]> = {
  REQUESTED: [
    { to: 'APPROVED', label: 'Одобрить' },
    { to: 'REJECTED', label: 'Отклонить' },
  ],
  APPROVED: [
    { to: 'COMPLETED', label: 'Товар получен, деньги вернули' },
    { to: 'REJECTED', label: 'Отклонить' },
  ],
  REJECTED: [],
  COMPLETED: [],
}

export const RETURN_REASONS: Record<string, string> = {
  none: 'Без причины',
  fit: 'Не подошёл',
  changed: 'Изменились планы',
  wrong: 'Привезли не тот товар',
  defect: 'Брак или неисправность',
}

export const AUDIT_ACTIONS: Record<string, string> = {
  'order.status': 'Статус заказа',
  'product.create': 'Новый товар',
  'product.update': 'Изменение товара',
  'product.stock': 'Остаток',
  'product.deactivate': 'Снят с продажи',
  'category.update': 'Раздел',
  'review.moderate': 'Модерация отзыва',
  'return.status': 'Статус возврата',
  'user.role': 'Роль пользователя',
}
