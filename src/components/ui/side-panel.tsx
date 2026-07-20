import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"

import { cn } from "@/lib/utils"

function SidePanel(props: DrawerPrimitive.Root.Props) {
  return (
    <DrawerPrimitive.Root
      data-slot="side-panel"
      swipeDirection="right"
      // 바깥(백드롭) 탭으로는 닫히지 않도록 한다. AppBar의 뒤로가기 버튼으로만 닫는다.
      // (Figma node 1349-5916: 패널 AppBar에 뒤로가기 chevron만 존재, 별도의 바깥 탭 닫힘 동작 없음)
      disablePointerDismissal
      {...props}
    />
  )
}

function SidePanelPortal(props: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="side-panel-portal" {...props} />
}

function SidePanelBackdrop({ className, ...props }: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="side-panel-backdrop"
      className={cn(
        "fixed inset-0 z-50 min-h-dvh bg-black/20 opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-base ease-base data-ending-style:opacity-0 data-starting-style:opacity-0",
        className
      )}
      {...props}
    />
  )
}

function SidePanelViewport({ className, ...props }: DrawerPrimitive.Viewport.Props) {
  return (
    <DrawerPrimitive.Viewport
      data-slot="side-panel-viewport"
      className={cn("fixed inset-0 z-50 flex items-stretch justify-end", className)}
      {...props}
    />
  )
}

function SidePanelPopup({ className, children, ...props }: DrawerPrimitive.Popup.Props) {
  return (
    <DrawerPrimitive.Popup
      data-slot="side-panel-popup"
      className={cn(
        "flex h-dvh w-full flex-col bg-white outline-none sm:max-w-(--app-column) [transform:translateX(var(--drawer-swipe-movement-x))] transition-transform duration-base ease-base data-ending-style:translate-x-full data-starting-style:translate-x-full",
        className
      )}
      {...props}
    >
      {children}
    </DrawerPrimitive.Popup>
  )
}

function SidePanelContent({ className, ...props }: DrawerPrimitive.Content.Props) {
  return (
    <DrawerPrimitive.Content
      data-slot="side-panel-content"
      className={cn("flex w-full flex-1 flex-col overflow-y-auto", className)}
      {...props}
    />
  )
}

export {
  SidePanel,
  SidePanelPortal,
  SidePanelBackdrop,
  SidePanelViewport,
  SidePanelPopup,
  SidePanelContent,
}
