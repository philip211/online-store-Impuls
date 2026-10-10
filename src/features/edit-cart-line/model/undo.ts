import { toast, useToastStore, type ToastAction } from '@/shared/lib'

/** Longest delay setTimeout accepts: the undo stays until replaced, used or dismissed. */
const UNTIL_DISMISSED = 2 ** 31 - 1

let heldToastId: number | null = null

/** Shows the removal toast; a keyboard user gets one that waits for them to Tab to it. */
export function showUndoToast(message: string, action: ToastAction, hold: boolean) {
  toast(message, { action, duration: hold ? UNTIL_DISMISSED : undefined })
  heldToastId = hold ? (useToastStore.getState().current?.id ?? null) : null
}

/** Drops a held undo toast so it does not follow the user to another page. */
export function dismissCartUndo() {
  const { current, dismiss } = useToastStore.getState()
  if (current && current.id === heldToastId) dismiss()
  heldToastId = null
}
