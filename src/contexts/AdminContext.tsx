import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { AdminUser } from '../services/adminService'
import { authenticateAdmin } from '../services/adminService'

interface AdminContextType {
  admin: AdminUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Verificar se há admin logado no localStorage
  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin_user')
    if (storedAdmin) {
      try {
        setAdmin(JSON.parse(storedAdmin))
      } catch (error) {
        console.error('Erro ao carregar admin do localStorage:', error)
        localStorage.removeItem('admin_user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const adminUser = await authenticateAdmin(email, password)
      
      if (adminUser) {
        setAdmin(adminUser)
        localStorage.setItem('admin_user', JSON.stringify(adminUser))
        return true
      }
      
      return false
    } catch (error) {
      console.error('Erro ao fazer login:', error)
      return false
    }
  }

  const logout = () => {
    setAdmin(null)
    localStorage.removeItem('admin_user')
  }

  return (
    <AdminContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
        login,
        logout
      }}
    >
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}
