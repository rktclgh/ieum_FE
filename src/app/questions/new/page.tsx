import { Suspense } from "react"

import { QuestionCreateForm } from "@/features/question/components/question-create-form"

export default function QuestionCreatePage() {
  return (
    <Suspense>
      <QuestionCreateForm />
    </Suspense>
  )
}
