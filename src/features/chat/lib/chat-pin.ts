interface PinRequest {
  roomId: number
  pinned: boolean
  /** 고정 시 함께 해제할 기존 고정 방 */
  replacingRoomId?: number
}

interface PinOperation {
  roomId: number
  pinned: boolean
}

interface SetPinnedTransport {
  setPinned: (roomId: number, pinned: boolean) => Promise<void>
}

// 고정은 전체 채팅방 중 1개만 허용된다. 백엔드가 이 제한을 강제하지 않으므로 FE가 보장한다.
// 기존 고정 해제를 먼저 보내고 그 다음에 새 방을 고정한다. 순서를 뒤집으면 두 번째 요청이
// 실패했을 때 두 방이 고정된 채 남아 불변식이 깨지지만, 이 순서면 최악의 경우 고정이
// 0개가 되므로 "고정은 1개 이하"가 항상 유지된다.
function resolvePinOperations({ roomId, pinned, replacingRoomId }: PinRequest): PinOperation[] {
  const replacesAnotherRoom =
    pinned && replacingRoomId !== undefined && replacingRoomId !== roomId

  return replacesAnotherRoom
    ? [
        { roomId: replacingRoomId, pinned: false },
        { roomId, pinned: true },
      ]
    : [{ roomId, pinned }]
}

async function executeSetPinned(
  request: PinRequest,
  transport: SetPinnedTransport
): Promise<void> {
  for (const operation of resolvePinOperations(request)) {
    await transport.setPinned(operation.roomId, operation.pinned)
  }
}

export { executeSetPinned, resolvePinOperations }
export type { PinOperation, PinRequest, SetPinnedTransport }
