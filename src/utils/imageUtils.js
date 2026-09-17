// ── Product image helpers ─────────────────────────────────────────────────────
// Images are resized/compressed in the browser before they are uploaded so the
// storage bucket (and the DB fallback) never receives multi-megabyte files.

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export const IMAGE_ACCEPT_ATTR = 'image/jpeg,image/png,image/webp,image/gif'

// Returns an error message, or null when the file is a valid image.
export const validateImageFile = (file) => {
  if (!file) return 'Please choose an image file'
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Unsupported format. Use JPG, PNG, WEBP or GIF.'
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Image is too large. Maximum size is 5 MB.'
  }
  return null
}

const readAsDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(new Error('Could not read the image file'))
  reader.readAsDataURL(blob)
})

// Resize to fit `maxDimension` and encode as JPEG.
// Resolves with { blob, dataUrl }.
export const compressImage = (file, { maxDimension = 900, quality = 0.85 } = {}) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      try {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
        const width = Math.max(1, Math.round(img.width * scale))
        const height = Math.max(1, Math.round(img.height * scale))

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)

        canvas.toBlob(async (blob) => {
          URL.revokeObjectURL(objectUrl)
          if (!blob) {
            reject(new Error('Could not process the image'))
            return
          }
          try {
            resolve({ blob, dataUrl: await readAsDataUrl(blob) })
          } catch (err) {
            reject(err)
          }
        }, 'image/jpeg', quality)
      } catch (err) {
        URL.revokeObjectURL(objectUrl)
        reject(err)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('The selected file is not a valid image'))
    }

    img.src = objectUrl
  })
