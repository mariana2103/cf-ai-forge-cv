"use client"

import { useState } from "react"
import { X, FlaskConical } from "lucide-react"
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
  const [previewMode, setPreviewMode] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  return (
    <ResumeStoreProvider>
      <div className="flex h-dvh flex-col bg-background">
        <WorkspaceHeader
          previewMode={previewMode}
          onTogglePreview={() => setPreviewMode((p) => !p)}
        />

        {/* Dev disclaimer banner */}
        {!bannerDismissed && (
          <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 border-b border-primary/20 text-xs text-foreground/80">
            <FlaskConical className="size-3.5 text-primary shrink-0" />
            <p className="flex-1">
              <span className="font-semibold text-foreground">Work in progress.</span>
              {" "}The live editor, templates, and PDF export are fully functional. AI parsing and tailoring are live on Cloudflare Workers AI but still undergoing prompt fine-tuning — results may vary.
            </p>
            <button
              onClick={() => setBannerDismissed(true)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
          <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
            <LeftPanel />
          </ResizablePanel>
          <ResizableHandle className="bg-border hover:bg-primary/20 transition-colors" />
          <ResizablePanel defaultSize={65} minSize={40}>
            <ResumeCanvas previewMode={previewMode} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </ResumeStoreProvider>
  )
}
