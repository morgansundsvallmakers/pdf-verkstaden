// ------------------------------------------------------------
// PREVIEW FÖR SLÅ IHOP PDF
// ------------------------------------------------------------

// Den här filen är medvetet separat från main.js medan preview-idén testas.
// PDF.js laddas lokalt och bara när användaren väljer filer att slå ihop.

const mergePreviewInput = document.querySelector('#merge-input')
const mergePreviewList = document.querySelector('#merge-file-list')

let mergePreviewFiles = []
let mergePdfJsPromise = null

async function getMergePdfJs() {
  if (!mergePdfJsPromise) {
    mergePdfJsPromise = import('./pdfjs/pdf.min.mjs')
  }

  const pdfjs = await mergePdfJsPromise
  pdfjs.GlobalWorkerOptions.workerSrc = './pdfjs/pdf.worker.min.mjs'
  return pdfjs
}

// Rendera första sidan av en fil som en liten bild i fillistan.
async function renderMergePreview(file, canvas) {
  const pdfjs = await getMergePdfJs()
  const bytes = await file.arrayBuffer()

  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    wasmUrl: './pdfjs/wasm/',
  }).promise

  const page = await pdf.getPage(1)
  const unscaledViewport = page.getViewport({ scale: 1 })

  // Samma ungefärliga bredd som previews i Dela PDF.
  const availableWidth = 210
  const scale = Math.min(1, availableWidth / unscaledViewport.width)
  const viewport = page.getViewport({ scale })

  const outputScale = window.devicePixelRatio || 1
  const context = canvas.getContext('2d')

  canvas.width = Math.floor(viewport.width * outputScale)
  canvas.height = Math.floor(viewport.height * outputScale)
  canvas.style.width = `${Math.floor(viewport.width)}px`
  canvas.style.height = `${Math.floor(viewport.height)}px`

  await page.render({
    canvasContext: context,
    viewport,
    transform: outputScale === 1
      ? null
      : [outputScale, 0, 0, outputScale, 0, 0],
  }).promise
}

// main.js skapar själva listan och pilknapparna. Här kompletterar vi
// varje listpost med en preview av första sidan.
async function renderMergePreviews() {
  if (!mergePreviewList) return

  const items = Array.from(mergePreviewList.querySelectorAll('li'))

  for (const [index, item] of items.entries()) {
    const file = mergePreviewFiles[index]
    if (!file) continue

    const canvas = document.createElement('canvas')
    canvas.className = 'merge-preview-canvas'
    item.prepend(canvas)

    try {
      await renderMergePreview(file, canvas)
    } catch (error) {
      canvas.remove()
      console.error(`Förhandsvisningen av ${file.name} kunde inte skapas:`, error)
    }
  }
}

// Vid ett nytt filval börjar preview-ordningen om från FileListens ordning.
mergePreviewInput?.addEventListener('change', () => {
  mergePreviewFiles = Array.from(mergePreviewInput.files || [])
  renderMergePreviews()
})

// main.js flyttar filerna när ↑ eller ↓ används. Vi speglar samma flyttning
// i vår preview-lista och ritar sedan om korten i den nya ordningen.
mergePreviewList?.addEventListener('click', (event) => {
  const button = event.target.closest('button')
  const item = event.target.closest('li')

  if (!button || !item) return

  const items = Array.from(mergePreviewList.querySelectorAll('li'))
  const index = items.indexOf(item)
  const direction = button.textContent

  if (direction === '↑' && index > 0) {
    ;[mergePreviewFiles[index - 1], mergePreviewFiles[index]] =
      [mergePreviewFiles[index], mergePreviewFiles[index - 1]]
  }

  if (direction === '↓' && index < mergePreviewFiles.length - 1) {
    ;[mergePreviewFiles[index + 1], mergePreviewFiles[index]] =
      [mergePreviewFiles[index], mergePreviewFiles[index + 1]]
  }

  // main.js hinner först bygga om listan efter klicket.
  queueMicrotask(renderMergePreviews)
}, true)
