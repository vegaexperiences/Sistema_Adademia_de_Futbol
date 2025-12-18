import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}

export const contentType = 'image/png'

export default async function Icon() {
  try {
    const faviconUrl = process.env.NEXT_PUBLIC_ACADEMY_LOGO || '/logo.png'
    const academyName = process.env.NEXT_PUBLIC_ACADEMY_NAME || 'Academia'
    
    // If it's a URL, fetch and return it
    if (faviconUrl.startsWith('http')) {
      const response = await fetch(faviconUrl)
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
      const filePath = path.join(process.cwd(), 'public', faviconUrl.replace(/^\//, ''))
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
    
    // Generate initials from academy name
    const words = academyName.trim().split(/\s+/)
    const initials = words.length > 1
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : academyName.substring(0, 2).toUpperCase()
    
    // Final fallback: return a simple icon with academy initials
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 24,
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
            fontSize: 24,
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

