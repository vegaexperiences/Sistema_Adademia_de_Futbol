import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

function getAcademyInitials(academyName: string): string {
  // Get first letter of each word, up to 2 letters
  const words = academyName.trim().split(/\s+/)
  if (words.length === 0) return 'A'
  
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase()
  }
  
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

export default async function AppleIcon() {
  try {
    const iconUrl = await getAcademyAppleTouchIcon()
    
    // If it's a URL, fetch and return it
    if (iconUrl.startsWith('http')) {
      const response = await fetch(iconUrl)
      if (response.ok) {
        const buffer = await response.arrayBuffer()
        return new Response(buffer, {
          headers: {
            'Content-Type': 'image/png',
          },
        })
      }
    }
    
    // Fallback: try to read from public folder
    try {
      const fs = await import('fs')
      const path = await import('path')
      const filePath = path.join(process.cwd(), 'public', iconUrl.replace(/^\//, ''))
      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath)
        return new Response(fileBuffer, {
          headers: {
            'Content-Type': 'image/png',
          },
        })
      }
    } catch (e) {
      // Ignore file system errors
    }
    
    // Get academy for initials
    let initials = 'SA'
    try {
      const academy = await getCurrentAcademy()
      if (academy) {
        const academyName = academy.display_name || academy.name || 'Suarez Academy'
        initials = getAcademyInitials(academyName)
      }
    } catch (e) {
      // Use default initials
    }
    
    // Final fallback: return a simple icon with academy initials
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 72,
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
          }}
        >
          {initials}
        </div>
      ),
      {
        ...size,
      }
    )
  } catch (e: any) {
    // Fallback icon with default initials
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 72,
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
          }}
        >
          SA
        </div>
      ),
      {
        ...size,
      }
    )
  }
}

