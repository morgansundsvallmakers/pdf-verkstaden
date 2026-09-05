// ------------------------------------------------------------
// PREVIEW FÖR GÖR BROSCHYR
// ------------------------------------------------------------

// Den här filen är separat från main.js medan preview-idén testas.
// Först visas originalets fyra sidor. När användaren väljer "Gör broschyr"
// visas sedan de två verkliga arken från den skapade broschyr-PDF:en.

const bookletPreviewInput = document.querySelector('#booklet-input')
const bookletOriginalPreview = document.querySelector('#booklet-original-preview')
const bookletCreateButton = document.querySelector('#booklet-create-button')
const bookletResultPreview = document.querySelector('#booklet-result-preview')
const bookletPreviewDownload = document.querySelector('#booklet-download')

const bookletOriginalCanvases = [
  document.querySelector('#booklet-original-1'),
  document.querySelector('#booklet-original-2'),
  document.querySelector('#booklet-original-3'),
  document.querySelector('#booklet-original-4'),
]

const bookletFrontCanvas = document.querySelector('#booklet-front-canvas')
const bookletBackCanvas = document.querySelector('#booklet-back-canvas')

let bookletPdfJsPromise = null
let bookletPreviewPdf = null
let bookletPreviewCreated = false
let bookletPreviousResultUrl = null

async function getBookletPdfJs() {
  if (!bookletPdfJsPromise) {
    bookletPdfJsPromise = import('./pdfjs/pdf.min.mjs')
  }

  const pdfjs = await bookletPdfJsPromise
  pdfjs.GlobalWorkerOptions.workerSrc = './pdfjs/pdf.worker.min.mjs'
  return pdfjs
}

async function loadBookletPreviewPdf(file) {
  const pdfjs = await getBookletPdfJs()
  const bytes = await file.arrayBuffer()

  return pdfjs.getDocument({
    data: new Uint8Array(bytes),
    wasmUrl: './pdfjs/wasm/',
  }).promise
}

// Rendera en PDF-sida till angivet canvas med en bestämd maxbredd.
async function renderBookletPage(pdf, pageNumber, canvas, maxWidth) {
  if (!pdf || !canvas) return

  const page = await pdf.getPage(pageNumber)
  const unscaledViewport = page.getViewport({ scale: 1 })
  const scale = Math.min(1, maxWidth / unscaledViewport.width)
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

async function renderBookletOriginal() {
  if (!bookletPreviewPdf) return

  // Rendera sidorna en i taget. Fyra samtidiga renderingar kan bli tungt,
  // särskilt för skannade PDF:er med stora bilder.
  for (let index = 0; index < bookletOriginalCanvases.length; index++) {
    await renderBookletPage(
      bookletPreviewPdf,
      index + 1,
      bookletOriginalCanvases[index],
      210
    )

    // Ge webbläsaren en chans att uppdatera gränssnittet mellan sidorna.
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  bookletOriginalPreview.hidden = false
}

// main.js skapar fortfarande själva broschyrfilen. Medan vi testar det nya
// gränssnittet håller vi nedladdningen dold tills användaren klickar på
// "Gör broschyr", så att före- och efterstegen blir tydliga.
const bookletDownloadObserver = new MutationObserver(() => {
  // Ändra bara attributet om main.js faktiskt har visat nedladdningen.
  // Annars skulle observern reagera på sin egen ändring om och om igen.
  if (
    !bookletPreviewCreated &&
    bookletPreviewDownload &&
    !bookletPreviewDownload.hidden
  ) {
    bookletPreviewDownload.hidden = true
  }
})

if (bookletPreviewDownload) {
  bookletDownloadObserver.observe(bookletPreviewDownload, {
    attributes: true,
    attributeFilter: ['hidden'],
  })
}

bookletPreviewInput?.addEventListener('change', async () => {
  const file = bookletPreviewInput.files?.[0]

  bookletPreviewCreated = false
  bookletPreviousResultUrl = bookletPdfUrl
  bookletPreviewPdf = null

  bookletOriginalPreview.hidden = true
  bookletResultPreview.hidden = true
  bookletCreateButton.hidden = true
  bookletPreviewDownload.hidden = true

  if (!file) return

  try {
    bookletPreviewPdf = await loadBookletPreviewPdf(file)

    // Broschyrfunktionen stöder fortfarande bara exakt fyra sidor.
    if (bookletPreviewPdf.numPages !== 4) return

    await renderBookletOriginal()
    bookletCreateButton.hidden = false
  } catch (error) {
    bookletOriginalPreview.hidden = true
    bookletCreateButton.hidden = true
    console.error('Broschyrens originalpreview kunde inte skapas:', error)
  }
})

// Vänta kort på att main.js ska ha färdigställt den nya broschyrfilen.
async function waitForNewBookletUrl() {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (bookletPdfUrl && bookletPdfUrl !== bookletPreviousResultUrl) {
      return bookletPdfUrl
    }

    await new Promise(resolve => setTimeout(resolve, 20))
  }

  return null
}

bookletCreateButton?.addEventListener('click', async () => {
  bookletResultPreview.hidden = true
  bookletPreviewDownload.hidden = true

  const resultUrl = await waitForNewBookletUrl()

  if (!resultUrl) {
    console.error('Broschyrresultatet hann inte bli färdigt för preview.')
    return
  }

  try {
    const pdfjs = await getBookletPdfJs()
    const response = await fetch(resultUrl)
    const bytes = await response.arrayBuffer()

    const resultPdf = await pdfjs.getDocument({
      data: new Uint8Array(bytes),
      wasmUrl: './pdfjs/wasm/',
    }).promise

    // Resultat-PDF:ens sida 1 är arkets framsida och sida 2 är baksidan.
    await renderBookletPage(resultPdf, 1, bookletFrontCanvas, 440)
    await renderBookletPage(resultPdf, 2, bookletBackCanvas, 440)

    bookletPreviewCreated = true
    bookletResultPreview.hidden = false
    bookletPreviewDownload.hidden = false
  } catch (error) {
    console.error('Broschyrens resultatpreview kunde inte skapas:', error)
  }
})
