import React, { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import Modal from '../shared/Modal'
import Button from '../shared/Button'

// Mounted once, including on login, to capture the browser's install event.
export default function PwaControls() {
  const [prompt, setPrompt] = useState(null)
  const [help, setHelp] = useState(false)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [installed, setInstalled] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true)

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)')
    const onInstall = event => { event.preventDefault(); setPrompt(event) }
    const onInstalled = () => { setInstalled(true); setPrompt(null); setHelp(false) }
    const onDisplay = () => setInstalled(media.matches || navigator.standalone === true)
    const onOnline = () => setOffline(false)
    const onOffline = () => setOffline(true)
    window.addEventListener('beforeinstallprompt', onInstall)
    window.addEventListener('appinstalled', onInstalled)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    media.addEventListener('change', onDisplay)
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstall)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      media.removeEventListener('change', onDisplay)
    }
  }, [])

  const install = async () => {
    if (!prompt) { setHelp(true); return }
    try {
      await prompt.prompt()
      await prompt.userChoice
    } catch {
      setHelp(true)
    } finally { setPrompt(null) }
  }

  return (
    <div className="pwa-controls">
      {offline && <div className="pwa-offline" role="alert">
        Offline — displayed data may be outdated. Reconnect and refresh before making changes. Sales cannot be submitted offline.
      </div>}
      {!installed && <button className="pwa-install" onClick={install} aria-label="Install ForgeraERP">
        <Download size={16} /> Install app
      </button>}
      <Modal open={help} onClose={() => setHelp(false)} title="Install ForgeraERP" size="sm">
        <div className="pwa-help">
          <p><strong>iPhone / iPad:</strong> open this website in Safari, tap Share, then Add to Home Screen and Add. Enable “Open as Web App” if shown.</p>
          <p><strong>Samsung / Android:</strong> open in Chrome or Samsung Internet. Open the browser menu and choose Install app or Add to Home screen.</p>
          <p>Installation requires the deployed HTTPS website. Open the new home-screen icon for the standalone app. An internet connection is required for live stock and sales.</p>
          <Button variant="secondary" icon={<X size={16} />} onClick={() => setHelp(false)}>Close</Button>
        </div>
      </Modal>
    </div>
  )
}
