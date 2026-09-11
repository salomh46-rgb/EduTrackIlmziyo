import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/app/shell/Sidebar'
import { Topbar } from '@/app/shell/Topbar'
import { PageContainer } from '@/components/PageContainer'
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="min-h-screen md:pl-[290px]">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />

        <main>
          <PageContainer>
            <Outlet />
          </PageContainer>
        </main>
      </div>

      <PWAInstallPrompt />
    </div>
  )
}
