import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient, getCurrentAcademyId } from '@/lib/supabase/server'
import { uploadFileToStorage } from '@/lib/utils/storage-server'
import { isSuperAdmin } from '@/lib/utils/academy'

const BUCKET_NAME = 'documents'

interface LogoVersions {
  logo_url: string | null
  logo_small_url: string | null
  logo_medium_url: string | null
  logo_large_url: string | null
  favicon_16_url: string | null
  favicon_32_url: string | null
  apple_touch_icon_url: string | null
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Check if user is super admin
    const isAdmin = await isSuperAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'No autorizado: Se requiere acceso de super admin' },
        { status: 403 }
      )
    }

    // Get academy ID
    const academyId = await getCurrentAcademyId()
    if (!academyId) {
      return NextResponse.json(
        { success: false, error: 'No se pudo determinar la academia actual' },
        { status: 400 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('image') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó ninguna imagen' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'El archivo debe ser una imagen' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Process image with sharp
    const image = sharp(buffer)
    const metadata = await image.metadata()
    
    // Generate timestamp for unique filenames
    const timestamp = Date.now()
    const basePath = `academies/${academyId}/logos`

    const versions: LogoVersions = {
      logo_url: null,
      logo_small_url: null,
      logo_medium_url: null,
      logo_large_url: null,
      favicon_16_url: null,
      favicon_32_url: null,
      apple_touch_icon_url: null,
    }

    // Generate all versions
    const uploadPromises: Promise<void>[] = []

    // 1. Logo principal (máx 1024x1024, mantener aspect ratio)
    uploadPromises.push(
      image
        .clone()
        .resize(1024, 1024, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .png({ quality: 90 })
        .toBuffer()
        .then(async (logoBuffer) => {
          const path = `${basePath}/logo-main-${timestamp}.png`
          const result = await uploadFileToStorage(logoBuffer, path, 'image/png')
          if (result.url) {
            versions.logo_url = result.url
          }
        })
    )

    // 2. Logo pequeño (32x32)
    uploadPromises.push(
      image
        .clone()
        .resize(32, 32, {
          fit: 'cover',
          position: 'center',
        })
        .png({ quality: 90 })
        .toBuffer()
        .then(async (buffer) => {
          const path = `${basePath}/logo-small-${timestamp}.png`
          const result = await uploadFileToStorage(buffer, path, 'image/png')
          if (result.url) {
            versions.logo_small_url = result.url
          }
        })
    )

    // 3. Logo mediano (128x128)
    uploadPromises.push(
      image
        .clone()
        .resize(128, 128, {
          fit: 'cover',
          position: 'center',
        })
        .png({ quality: 90 })
        .toBuffer()
        .then(async (buffer) => {
          const path = `${basePath}/logo-medium-${timestamp}.png`
          const result = await uploadFileToStorage(buffer, path, 'image/png')
          if (result.url) {
            versions.logo_medium_url = result.url
          }
        })
    )

    // 4. Logo grande (512x512)
    uploadPromises.push(
      image
        .clone()
        .resize(512, 512, {
          fit: 'cover',
          position: 'center',
        })
        .png({ quality: 90 })
        .toBuffer()
        .then(async (buffer) => {
          const path = `${basePath}/logo-large-${timestamp}.png`
          const result = await uploadFileToStorage(buffer, path, 'image/png')
          if (result.url) {
            versions.logo_large_url = result.url
          }
        })
    )

    // 5. Favicon 16x16
    uploadPromises.push(
      image
        .clone()
        .resize(16, 16, {
          fit: 'cover',
          position: 'center',
        })
        .png({ quality: 90 })
        .toBuffer()
        .then(async (buffer) => {
          const path = `${basePath}/favicon-16-${timestamp}.png`
          const result = await uploadFileToStorage(buffer, path, 'image/png')
          if (result.url) {
            versions.favicon_16_url = result.url
          }
        })
    )

    // 6. Favicon 32x32
    uploadPromises.push(
      image
        .clone()
        .resize(32, 32, {
          fit: 'cover',
          position: 'center',
        })
        .png({ quality: 90 })
        .toBuffer()
        .then(async (buffer) => {
          const path = `${basePath}/favicon-32-${timestamp}.png`
          const result = await uploadFileToStorage(buffer, path, 'image/png')
          if (result.url) {
            versions.favicon_32_url = result.url
          }
        })
    )

    // 7. Apple Touch Icon (180x180)
    uploadPromises.push(
      image
        .clone()
        .resize(180, 180, {
          fit: 'cover',
          position: 'center',
        })
        .png({ quality: 90 })
        .toBuffer()
        .then(async (buffer) => {
          const path = `${basePath}/apple-touch-${timestamp}.png`
          const result = await uploadFileToStorage(buffer, path, 'image/png')
          if (result.url) {
            versions.apple_touch_icon_url = result.url
          }
        })
    )

    // Wait for all uploads to complete
    await Promise.all(uploadPromises)

    // Check if all versions were uploaded successfully
    const hasErrors = Object.values(versions).some(url => url === null)
    
    if (hasErrors) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Algunas versiones no se pudieron generar correctamente',
          urls: versions
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      urls: versions,
    })
  } catch (error: any) {
    console.error('Error processing logos:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error al procesar la imagen' 
      },
      { status: 500 }
    )
  }
}

