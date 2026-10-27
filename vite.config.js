import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'google-drive-proxy-plugin',
      configureServer(server) {
        const handleDriveRequest = async (req, res) => {
          try {
            const urlObj = new URL(req.url, `http://${req.headers.host}`)
            const targetUrl = urlObj.searchParams.get('url') || urlObj.searchParams.get('id')
            const scriptUrl = urlObj.searchParams.get('script') || 'https://script.google.com/macros/s/AKfycbzXPTAniFsixG52cJ8j7eujRu3cQaDmfgh93b0F1255K-BTf8Yovtotc0XIKPJfeJfi/exec'

            if (!targetUrl) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ status: 'error', message: 'Missing url parameter' }))
              return
            }

            const fetchUrl = `${scriptUrl}?url=${encodeURIComponent(targetUrl)}`
            const response = await fetch(fetchUrl)
            const text = await response.text()

            res.statusCode = response.status
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.end(text)
          } catch (err) {
            console.error('Proxy error:', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ status: 'error', message: err.message }))
          }
        }

        server.middlewares.use('/api/drive-json', handleDriveRequest)
        server.middlewares.use('/api/drive-proxy', handleDriveRequest)
      }
    }
  ],
})

