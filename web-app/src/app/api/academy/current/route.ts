import { NextResponse } from 'next/server'
import { getCurrentAcademy } from '@/lib/utils/academy'

export async function GET() {
  try {
    const academy = await getCurrentAcademy()
    
    if (!academy) {
      return NextResponse.json(
        { error: 'Academy not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ academy })
  } catch (error: any) {
    console.error('Error fetching current academy:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

