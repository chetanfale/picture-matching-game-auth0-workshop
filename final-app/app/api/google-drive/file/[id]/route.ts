import { auth0 } from '@/lib/auth0'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('[v0] Fetching file from Google Drive:', id)
    
    const { token } = await auth0.getAccessTokenForConnection({
      connection: 'google-oauth2'
    })

    // Fetch the actual file bytes from Google Drive
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    if (!res.ok) {
      const errorText = await res.text()
      console.log('[v0] Google Drive file fetch failed:', res.status, errorText)
      return NextResponse.json(
        { error: 'Failed to fetch file from Google Drive' },
        { status: res.status }
      )
    }
    
    console.log('[v0] Successfully fetched file, streaming response')

    // Get the content type from the response
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    
    // Stream the file bytes through
    const blob = await res.blob()
    
    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Google Drive file fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch file from Google Drive' },
      { status: 500 }
    )
  }
}
