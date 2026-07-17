import type { Map as LeafletMap } from "leaflet"

// Leaflet Map#remove()는 container 참조를 남기지만 pane은 제거한다.
// 따라서 pane과 DOM 연결을 함께 확인해야 해제 중인 map에 API를 호출하지 않는다.
function isLeafletMapActive(map: LeafletMap): boolean {
  return map.getContainer().isConnected && map.getPane("mapPane") !== undefined
}

export { isLeafletMapActive }
