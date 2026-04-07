import { auth0 } from '@/lib/auth0'
import { SettingsContent } from '@/components/settings-content'

async function isGoogleConnected() {
  try {
    const sampleToken = await auth0.getAccessTokenForConnection({ connection: 'google-oauth2' })
    console.log('the sample token, sample', sampleToken)
    return true
  } catch {
    return false
  }
}

export default async function SettingsPage() {
  const isGoogleDriveConnected = await isGoogleConnected()

  return <SettingsContent isGoogleConnected={isGoogleDriveConnected} />
}
