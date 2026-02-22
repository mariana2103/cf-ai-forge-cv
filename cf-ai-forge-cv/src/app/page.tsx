"use client"

import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { ResumeStoreProvider } from "@/lib/resume-store"
import { WorkspaceHeader } from "@/components/workspace-header"
import { LeftPanel } from "@/components/left-panel"
import { ResumeCanvas } from "@/components/resume-canvas"

export default function WorkspacePage() {
  return (
    <ResumeStoreProvider>
      <div className="flex h-dvh flex-col bg-background">
        <WorkspaceHeader />
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
            <LeftPanel />
          </ResizablePanel>
          <ResizableHandle className="bg-border hover:bg-primary/20 transition-colors" />
          <ResizablePanel defaultSize={65} minSize={40}>
            <ResumeCanvas />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </ResumeStoreProvider>
  )
}
