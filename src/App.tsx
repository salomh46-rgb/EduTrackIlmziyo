import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from '@/app/routes'
import { AuthProvider } from '@/lib/auth/auth'
import { ThemeProvider } from '@/lib/theme'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
