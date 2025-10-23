import { LoadPage } from '@/pages/load'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/load')({
  component: LoadPage,
})
