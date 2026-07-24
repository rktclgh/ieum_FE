"use client"

// 앱 전체에서 고정인 정적 마커 아이콘 3종을 SVG → 캔버스 래스터화해 MapLibre에 1회 등록한다.
// 그림자는 여기서 굽지 않는다(질문/모임 핀은 marker-shadow 공유 레이어가 대신 그린다) —
// 단, 선택 위치 티어드롭은 도형이 원이 아니라 공유 shadow 레이어를 못 쓰므로 그림자(ellipse)를
// 그대로 굽는다(설계 문서 참고).
//
// pixelRatio(기본 2)로 CSS 픽셀보다 크게 그려 등록해, addImage의 pixelRatio 옵션으로
// 레티나에서도 흐릿하지 않게 한다.

import type { Map as MaplibreMap } from "maplibre-gl"

const GRAY_900 = "#1f2324" // --color-gray-900
const GRAY_100 = "#eceeee" // --color-gray-100 (모임 썸네일 없을 때 배경)

// pin-marker.tsx QUESTION_SVG의 물음표 path(Figma node 1128:3058)와 동일.
const QUESTION_GLYPH_PATH =
  `<path d="M18.185 29.2395V29.0424C18.1853 28.0705 18.998 27.2821 20 27.2818C21.0022 27.2818 21.8147 28.0703 21.815 29.0424V29.2395C21.815 30.2118 21.0024 31 20 31C18.9979 30.9997 18.185 30.2116 18.185 29.2395ZM23.37 16.9022C23.3695 14.9978 21.8235 13.521 20 13.521C18.1768 13.5213 16.6305 14.9979 16.63 16.9022C16.63 17.8745 15.8174 18.6627 14.815 18.6627C13.8126 18.6627 13 17.8745 13 16.9022C13.0005 13.1273 16.0966 10.0003 20 10C23.9037 10 26.9995 13.1271 27 16.9022C27 20.6777 23.904 23.8067 20 23.8067C18.998 23.8064 18.1852 23.0181 18.185 22.0462C18.185 21.0741 18.9979 20.286 20 20.2857C21.8238 20.2857 23.37 18.8071 23.37 16.9022Z" fill="${GRAY_900}"/>`

// #111 디자인: 44px 흰 원 + 40px 콘텐츠 원. 물음표는 40x40 기준 좌표라 (44-40)/2=2px 오프셋.
const QUESTION_PIN_SVG = `<svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
  <circle cx="22" cy="22" r="22" fill="#ffffff"/>
  <g transform="translate(2,2)">${QUESTION_GLYPH_PATH}</g>
</svg>`

// public/icons/map/pin-no-image.svg 내용 그대로(28x28). 40px 콘텐츠 원 중앙에 오도록
// (40-28)/2=6px, 여기에 바깥 원 오프셋 2px를 더해 8px.
const NO_IMAGE_GLYPH_SVG = `<svg x="8" y="8" width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2.9165 6.91674C2.9165 4.70761 4.70736 2.91675 6.9165 2.91675H21.0832C23.2923 2.91675 25.0832 4.70761 25.0832 6.91675V21.0834C25.0832 23.2926 23.2923 25.0834 21.0832 25.0834H6.9165C4.70736 25.0834 2.9165 23.2926 2.9165 21.0834V6.91674Z" stroke="#B5BDBF" stroke-width="1.5"/>
<path d="M2.9165 16.9164L7.05534 12.7777C7.93767 11.8954 9.40363 12.0276 10.1139 13.0535L12.7663 16.8846C13.431 17.8446 14.7733 18.0335 15.6771 17.294L19.0157 14.5626C19.8109 13.9119 20.9698 13.9697 21.6963 14.6963L25.0832 18.0831" stroke="#B5BDBF" stroke-width="1.5"/>
<circle cx="19.25" cy="8.75" r="1.75" fill="#B5BDBF"/>
</svg>`

const MEETING_NO_IMAGE_PIN_SVG = `<svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
  <circle cx="22" cy="22" r="22" fill="#ffffff"/>
  <circle cx="22" cy="22" r="20" fill="${GRAY_100}"/>
  ${NO_IMAGE_GLYPH_SVG}
</svg>`

// Figma Location/XL(map-center-pin.tsx의 PIN_SHADOW_MARKUP + PIN_BODY_MARKUP과 동일 path).
// 티어드롭은 원이 아니라 공유 shadow 레이어를 못 쓰므로 그림자(ellipse)를 그대로 굽는다.
const SELECTED_LOCATION_PIN_SVG =
  `<svg width="40" height="47" viewBox="0 0 24 28" xmlns="http://www.w3.org/2000/svg">` +
  `<ellipse cx="12" cy="24.3" rx="4.5" ry="1.5" fill="#9AA5A8" fill-opacity="0.5"/>` +
  `<path d="M12 1.5C7.03 1.5 3 5.53 3 10.5c0 6.02 6.44 12.02 8.28 13.62.41.36 1.03.36 1.44 0C14.56 22.52 21 16.52 21 10.5 21 5.53 16.97 1.5 12 1.5Z" fill="#FC7045"/>` +
  `<circle cx="12" cy="10.5" r="3.25" fill="#ffffff"/></svg>`

const PIN_QUESTION_ICON_ID = "pin-question"
const PIN_MEETING_NO_IMAGE_ICON_ID = "pin-meeting-no-image"
const SELECTED_LOCATION_ICON_ID = "selected-location-pin"

async function rasterizeSvg(
  svg: string,
  cssWidth: number,
  cssHeight: number,
  pixelRatio = 2
): Promise<{ imageData: ImageData; pixelRatio: number }> {
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  const image = new Image()
  image.src = url
  await image.decode()

  const width = cssWidth * pixelRatio
  const height = cssHeight * pixelRatio
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("2d context를 만들 수 없습니다")
  ctx.drawImage(image, 0, 0, width, height)

  return { imageData: ctx.getImageData(0, 0, width, height), pixelRatio }
}

async function registerIcon(
  map: MaplibreMap,
  id: string,
  svg: string,
  width: number,
  height: number
): Promise<void> {
  if (map.hasImage(id)) return
  const { imageData, pixelRatio } = await rasterizeSvg(svg, width, height)
  map.addImage(id, imageData, { pixelRatio })
}

async function registerStaticIcons(map: MaplibreMap): Promise<void> {
  await Promise.all([
    registerIcon(map, PIN_QUESTION_ICON_ID, QUESTION_PIN_SVG, 44, 44),
    registerIcon(map, PIN_MEETING_NO_IMAGE_ICON_ID, MEETING_NO_IMAGE_PIN_SVG, 44, 44),
    registerIcon(map, SELECTED_LOCATION_ICON_ID, SELECTED_LOCATION_PIN_SVG, 40, 47),
  ])
}

export {
  registerStaticIcons,
  rasterizeSvg,
  PIN_QUESTION_ICON_ID,
  PIN_MEETING_NO_IMAGE_ICON_ID,
  SELECTED_LOCATION_ICON_ID,
}
