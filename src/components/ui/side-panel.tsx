import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"

import { cn } from "@/lib/utils"

function SidePanel(props: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root data-slot="side-panel" swipeDirection="right" {...props} />
}

function SidePanelPortal(props: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="side-panel-portal" {...props} />
}

function SidePanelBackdrop({ className, ...props }: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="side-panel-backdrop"
      className={cn(
        "fixed inset-0 z-50 min-h-dvh bg-black/20 opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-starting-style:opacity-0",
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
        "flex h-dvh w-full flex-col bg-white outline-none sm:max-w-(--app-column) [transform:translateX(var(--drawer-swipe-movement-x))] transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:translate-x-full data-starting-style:translate-x-full",
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
