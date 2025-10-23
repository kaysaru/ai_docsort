import { ProcessingPage } from '@/pages/processing'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/processing')({
  component: ProcessingPage,
})
