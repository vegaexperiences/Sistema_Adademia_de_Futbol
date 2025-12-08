'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getAcademyIdFromCookies, getAcademySlugFromCookies } from '@/lib/utils/academy'

interface Academy {
  id: string
  name: string
  slug: string
  domain: string | null
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  settings: Record<string, any>
}

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

  useEffect(() => {
    // Get academy info from cookies (set by middleware)
    const id = getAcademyIdFromCookies()
    const slug = getAcademySlugFromCookies()
    
    setAcademyId(id)
    setAcademySlug(slug)
    
    // Fetch full academy data if we have ID or slug
    if (id || slug) {
      fetch(`/api/academy/current`)
        .then(res => res.json())
        .then(data => {
          if (data.academy) {
            setAcademy(data.academy)
          }
          setIsLoading(false)
        })
        .catch(() => {
          setIsLoading(false)
        })
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

