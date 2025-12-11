'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { getAcademyIdFromCookies, getAcademySlugFromCookies } from '@/lib/utils/academy-client'
import type { Academy } from '@/lib/utils/academy-types'

interface AcademyContextType {
  academy: Academy | null
  academyId: string | null
  academySlug: string | null
  isLoading: boolean
}

const AcademyContext = createContext<AcademyContextType>({
  academy: null,
  academyId: null,
  academySlug: null,
  isLoading: true,
})

export function AcademyProvider({ children }: { children: ReactNode }) {
  const [academy, setAcademy] = useState<Academy | null>(null)
  const [academyId, setAcademyId] = useState<string | null>(null)
  const [academySlug, setAcademySlug] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    // Prevent multiple simultaneous fetches
    if (hasFetchedRef.current) {
      return
    }

    // Get academy info from cookies (set by middleware)
    const id = getAcademyIdFromCookies()
    const slug = getAcademySlugFromCookies()
    
    setAcademyId(id)
    setAcademySlug(slug)
    
    // Fetch full academy data if we have ID or slug
    // Skip fetch on login/auth/dashboard pages to avoid unnecessary requests
    if (id || slug) {
      // Use typeof window check to prevent SSR issues
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname
        const isAuthPage = currentPath.startsWith('/login') || 
                          currentPath.startsWith('/auth') ||
                          currentPath.startsWith('/enrollment') ||
                          currentPath.startsWith('/dashboard')
        
        if (!isAuthPage) {
          hasFetchedRef.current = true
          fetch(`/api/academy/current`)
            .then(res => {
              if (!res.ok) {
                throw new Error('Failed to fetch academy')
              }
              return res.json()
            })
            .then(data => {
              if (data.academy) {
                setAcademy(data.academy)
              }
              setIsLoading(false)
            })
            .catch((error) => {
              console.error('[AcademyProvider] Error fetching academy:', error)
              setIsLoading(false)
            })
        } else {
          setIsLoading(false)
        }
      } else {
        // SSR: just set loading to false
        setIsLoading(false)
      }
    } else {
      setIsLoading(false)
    }
  }, [])

  return (
    <AcademyContext.Provider value={{ academy, academyId, academySlug, isLoading }}>
      {children}
    </AcademyContext.Provider>
  )
}

export function useAcademy() {
  const context = useContext(AcademyContext)
  if (!context) {
    throw new Error('useAcademy must be used within AcademyProvider')
  }
  return context
}

