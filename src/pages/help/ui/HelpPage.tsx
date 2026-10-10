import { useParams } from 'react-router'

import { isHelpTopicId } from '@/shared/config'

import { HelpIndex } from './HelpIndex'
import { HelpTopicView } from './HelpTopicView'

export function HelpPage() {
  const { topic } = useParams()
  if (topic && isHelpTopicId(topic)) return <HelpTopicView key={topic} id={topic} />
  return <HelpIndex unknown={topic} />
}
