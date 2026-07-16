interface ChatSystemMessageProps {
  content: string
}

function ChatSystemMessage({ content }: ChatSystemMessageProps) {
  return (
    <div className="flex w-full justify-center py-2">
      <p className="max-w-[calc(100%-2rem)] break-words rounded-full bg-gray-700 px-3 py-1 text-center text-body-regular-12 text-white">
        {content}
      </p>
    </div>
  )
}

export { ChatSystemMessage }
