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

  const fetchAcademy = () => {
    // Get academy info from cookies (set by middleware)
    const id = getAcademyIdFromCookies()
    const slug = getAcademySlugFromCookies()
    
    setAcademyId(id)
    setAcademySlug(slug)
    
    // Fetch full academy data if we have ID or slug
    if (id || slug) {
      // Use typeof window check to prevent SSR issues
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname
        const isAuthPage = currentPath.startsWith('/login') || 
                          currentPath.startsWith('/auth') ||
                          currentPath.startsWith('/enrollment')
        
        // Always fetch on dashboard pages to get latest data
        if (!isAuthPage) {
          // Add cache busting to ensure fresh data
          fetch(`/api/academy/current?t=${Date.now()}`)
            .then(res => {
              if (!res.ok) {
                // Don't throw error, just log it and continue
                console.warn('[AcademyProvider] Failed to fetch academy:', res.status, res.statusText)
                return res.json().then(data => {
                  console.warn('[AcademyProvider] Error response:', data)
                  return null
                })
              }
              return res.json()
            })
            .then(data => {
              if (data && data.academy) {
                console.log('[AcademyProvider] ✅ Academy data updated:', data.academy.display_name || data.academy.name)
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
  }

  useEffect(() => {
    // Initial fetch
    fetchAcademy()
    
    // Listen for storage events (when academy changes in another tab/window)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'academy-updated') {
        console.log('[AcademyProvider] Academy updated in another tab, refreshing...')
        hasFetchedRef.current = false
        fetchAcademy()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Also listen for custom events (when academy changes in same tab)
    const handleAcademyUpdate = () => {
      console.log('[AcademyProvider] Academy update event received, refreshing...')
      hasFetchedRef.current = false
      fetchAcademy()
    }
    
    window.addEventListener('academy-updated', handleAcademyUpdate)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('academy-updated', handleAcademyUpdate)
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

