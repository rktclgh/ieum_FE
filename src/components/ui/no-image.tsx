import { cn } from "@/lib/utils"

const NO_IMAGE_SRC = "/icons/common/no-image.svg"
const NO_IMAGE_PROFILE_SRC = "/icons/common/no-image-profile.svg"

interface NoImageProps {
  className?: string
}

/**
 * 모임·질문 리스트 썸네일이 없을 때의 기본 이미지.
 * 부모(정사각형·rounded)를 채우도록 size-full 로 렌더한다.
 */
function NoImage({ className }: NoImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={NO_IMAGE_SRC} alt="" className={cn("size-full object-cover", className)} />
  )
}

/**
 * 프로필 사진이 없을 때의 기본 아바타.
 * 부모(원형) 박스를 채우도록 size-full 로 렌더한다.
 */
function NoImageProfile({ className }: NoImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={NO_IMAGE_PROFILE_SRC} alt="" className={cn("size-full object-cover", className)} />
  )
}

export { NoImage, NoImageProfile }
