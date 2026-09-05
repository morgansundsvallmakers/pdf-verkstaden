// ------------------------------------------------------------
// GEMENSAMT GRÄNSSNITT
// ------------------------------------------------------------

const homeView = document.querySelector('#home-view')
const toolViews = document.querySelectorAll('.tool-view')
const homeButtons = document.querySelectorAll('.home-button')

const mergeButton = document.querySelector('#merge-button')
const mergeView = document.querySelector('#merge-view')
const mergeSelectButton = document.querySelector('#merge-select-button')
const mergeInput = document.querySelector('#merge-input')
const mergeFileList = document.querySelector('#merge-file-list')
const mergeMessage = document.querySelector('#merge-message')
const mergeCreateButton = document.querySelector('#merge-create-button')
const mergeDownload = document.querySelector('#merge-download')
const mergeFilename = document.querySelector('#merge-filename')
const mergeDownloadButton = document.querySelector('#merge-download-button')

const splitButton = document.querySelector('#split-button')
const splitView = document.querySelector('#split-view')
const splitSelectButton = document.querySelector('#split-select-button')
const splitInput = document.querySelector('#split-input')
const splitMessage = document.querySelector('#split-message')
const splitPreview = document.querySelector('#split-preview')
const splitPreviewLeftCanvas = document.querySelector('#split-preview-left-canvas')
const splitPreviewRightCanvas = document.querySelector('#split-preview-right-canvas')
const splitPreviewLeftNumber = document.querySelector('#split-preview-left-number')
const splitPreviewRightNumber = document.querySelector('#split-preview-right-number')
const splitControls = document.querySelector('#split-controls')
const splitAfterPage = document.querySelector('#split-after-page')
const splitCreateButton = document.querySelector('#split-create-button')
const splitDownload = document.querySelector('#split-download')
const splitDownloadButton = document.querySelector('#split-download-button')

const bookletButton = document.querySelector('#booklet-button')
const bookletView = document.querySelector('#booklet-view')
const bookletSelectButton = document.querySelector('#booklet-select-button')
const bookletInput = document.querySelector('#booklet-input')
const bookletMessage = document.querySelector('#booklet-message')
const bookletDownload = document.querySelector('#booklet-download')
const bookletFilename = document.querySelector('#booklet-filename')
const bookletDownloadButton = document.querySelector('#booklet-download-button')

let mergedPdfUrl = null
let firstSplitPdfUrl = null
let secondSplitPdfUrl = null
let bookletPdfUrl = null

// PDF.js laddas först om en förhandsvisning faktiskt behövs.
// Biblioteket ligger lokalt i projektets pdfjs-mapp.
let pdfJsPromise = null
let selectedSplitPreviewPdf = null

// Egen lista över de valda filerna.
// Till skillnad från FileList kan en vanlig array ordnas om.
let selectedMergeFiles = []

let selectedSplitFile = null
let selectedSplitPageCount = 0

// Visa startsidan och dölj alla verktygens arbetsytor.
function showHome() {
  homeView.hidden = false

  for (const view of toolViews) {
    view.hidden = true
  }
}

// Visa en arbetsyta och dölj startsidan och övriga verktyg.
function showTool(viewToShow) {
  homeView.hidden = true

  for (const view of toolViews) {
    view.hidden = view !== viewToShow
  }
}

// Alla "Till startsidan"-knappar använder samma funktion.
for (const button of homeButtons) {
  button.addEventListener('click', showHome)
}


// ------------------------------------------------------------
// SLÅ IHOP PDF
// ------------------------------------------------------------

// Gå till arbetsytan för sammanslagning.
mergeButton?.addEventListener('click', () => {
  showTool(mergeView)
})

// Öppna filväljaren först när användaren ber om att välja filer.
mergeSelectButton?.addEventListener('click', () => {
  mergeInput?.click()
})

// Visa filerna i den ordning som kommer att användas vid sammanslagningen.
function renderMergeFileList() {
  mergeFileList.innerHTML = ''

  selectedMergeFiles.forEach((file, index) => {
    const item = document.createElement('li')

    // Visa filnamnet.
    const filename = document.createElement('span')
    filename.textContent = file.name
    item.appendChild(filename)

    // Flytta filen ett steg upp i ordningen.
    const upButton = document.createElement('button')
    upButton.type = 'button'
    upButton.textContent = '↑'
    upButton.disabled = index === 0

    upButton.addEventListener('click', () => {
      const previousFile = selectedMergeFiles[index - 1]

      selectedMergeFiles[index - 1] = selectedMergeFiles[index]
      selectedMergeFiles[index] = previousFile

      renderMergeFileList()

      // En ändrad ordning gör en tidigare skapad PDF inaktuell.
      mergeDownload.hidden = true
    })

    // Flytta filen ett steg ned i ordningen.
    const downButton = document.createElement('button')
    downButton.type = 'button'
    downButton.textContent = '↓'
    downButton.disabled = index === selectedMergeFiles.length - 1

    downButton.addEventListener('click', () => {
      const nextFile = selectedMergeFiles[index + 1]

      selectedMergeFiles[index + 1] = selectedMergeFiles[index]
      selectedMergeFiles[index] = nextFile

      renderMergeFileList()

      // En ändrad ordning gör en tidigare skapad PDF inaktuell.
      mergeDownload.hidden = true
    })

    item.appendChild(upButton)
    item.appendChild(downButton)
    mergeFileList.appendChild(item)
  })
}

// Läs de valda filerna och visa dem i listan.
mergeInput?.addEventListener('change', () => {
  if (!mergeInput.files || !mergeFileList || !mergeMessage) return

  // FileList görs om till en vanlig array så att vi kan ändra ordningen.
  selectedMergeFiles = Array.from(mergeInput.files)

  renderMergeFileList()

  // Ett tidigare resultat gäller inte längre när filvalet ändras.
  mergeDownload.hidden = true

  // Skapa-knappen behövs först när minst två filer har valts.
  if (selectedMergeFiles.length < 2) {
    mergeCreateButton.hidden = true
    mergeMessage.textContent = 'Välj minst två PDF-filer.'
  } else {
    mergeCreateButton.hidden = false
    mergeMessage.textContent = ''
  }
})

// Skapa den sammanslagna PDF-filen först när användaren ber om det.
mergeCreateButton?.addEventListener('click', async () => {
  if (selectedMergeFiles.length < 2) {
    mergeMessage.textContent = 'Välj minst två PDF-filer.'
    return
  }

  mergeMessage.textContent = ''

  const mergedPdf = await PDFLib.PDFDocument.create()

  // Kopiera in alla sidor i den ordning som visas i fillistan.
  for (const file of selectedMergeFiles) {
    const bytes = await file.arrayBuffer()
    const sourcePdf = await PDFLib.PDFDocument.load(bytes)

    const pageIndices = sourcePdf.getPageIndices()
    const copiedPages = await mergedPdf.copyPages(sourcePdf, pageIndices)

    for (const page of copiedPages) {
      mergedPdf.addPage(page)
    }
  }

  const mergedPdfBytes = await mergedPdf.save()

  if (mergedPdfUrl) {
    URL.revokeObjectURL(mergedPdfUrl)
  }

  const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' })
  mergedPdfUrl = URL.createObjectURL(blob)

  mergeDownload.hidden = false
})

// Ladda ner den färdiga PDF-filen när användaren ber om det.
mergeDownloadButton?.addEventListener('click', () => {
  if (!mergedPdfUrl) return

  const downloadLink = document.createElement('a')
  downloadLink.href = mergedPdfUrl
  downloadLink.download = mergeFilename?.value || 'sammanslagen.pdf'
  downloadLink.click()
})


// ------------------------------------------------------------
// DELA PDF
// ------------------------------------------------------------

// Gå till arbetsytan för delning.
splitButton?.addEventListener('click', () => {
  showTool(splitView)
})

// Öppna filväljaren först när användaren ber om att välja en fil.
splitSelectButton?.addEventListener('click', () => {
  splitInput?.click()
})

// Ladda vald PDF i PDF.js för lokal förhandsvisning.
async function loadSplitPreviewPdf(file) {
  if (!pdfJsPromise) {
    pdfJsPromise = import('./pdfjs/pdf.min.mjs')
  }

  const pdfjs = await pdfJsPromise
  pdfjs.GlobalWorkerOptions.workerSrc = './pdfjs/pdf.worker.min.mjs'

  const bytes = await file.arrayBuffer()

  selectedSplitPreviewPdf = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    wasmUrl: './pdfjs/wasm/',
  }).promise
}

// Rendera en sida i ett litet canvas-element.
async function renderSplitPreviewPage(pageNumber, canvas) {
  if (!selectedSplitPreviewPdf || !canvas) return

  const page = await selectedSplitPreviewPdf.getPage(pageNumber)
  const unscaledViewport = page.getViewport({ scale: 1 })

  // Två previews ska få plats bredvid varandra i den 480 px breda arbetsytan.
  const availableWidth = Math.max(120, Math.min(210, (splitView.clientWidth - 12) / 2))
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

// Visa sidan före och sidan efter den valda delningspunkten.
async function renderSplitPreviews() {
  if (
    !splitPreview ||
    !splitPreviewLeftCanvas ||
    !splitPreviewRightCanvas ||
    !selectedSplitPreviewPdf
  ) return

  const splitPage = Number(splitAfterPage.value)

  if (splitPage < 1 || splitPage >= selectedSplitPageCount) {
    splitPreview.hidden = true
    return
  }

  splitPreview.hidden = true

  splitPreviewLeftNumber.textContent = splitPage
  splitPreviewRightNumber.textContent = splitPage + 1

  await Promise.all([
    renderSplitPreviewPage(splitPage, splitPreviewLeftCanvas),
    renderSplitPreviewPage(splitPage + 1, splitPreviewRightCanvas),
  ])

  splitPreview.hidden = false
}

// Läs den valda PDF-filen och visa delningskontrollerna.
splitInput?.addEventListener('change', async () => {
  const file = splitInput.files?.[0]

  if (!file || !splitMessage) return

  // Ett gammalt resultat och en gammal preview gäller inte längre.
  splitDownload.hidden = true
  splitPreview.hidden = true
  selectedSplitPreviewPdf = null

  selectedSplitFile = file

  const bytes = await file.arrayBuffer()
  const pdf = await PDFLib.PDFDocument.load(bytes)

  selectedSplitPageCount = pdf.getPageCount()

  if (selectedSplitPageCount < 2) {
    splitMessage.textContent = 'PDF-filen måste innehålla minst 2 sidor.'
    splitControls.hidden = true
    return
  }

  splitMessage.textContent =
    `Den valda PDF-filen har ${selectedSplitPageCount} sidor.`

  // Delningspunkten får inte ligga före första eller efter sista sidan.
  splitAfterPage.max = selectedSplitPageCount - 1
  splitAfterPage.value = Math.floor(selectedSplitPageCount / 2)
  splitControls.hidden = false

  // Preview är bara ett hjälpmedel. Om den skulle misslyckas ska delning fortfarande fungera.
  try {
    await loadSplitPreviewPdf(file)
    await renderSplitPreviews()
  } catch (error) {
    splitPreview.hidden = true
    console.error('Förhandsvisningen kunde inte skapas:', error)
  }
})

// Uppdatera previewn direkt när användaren flyttar delningspunkten.
splitAfterPage?.addEventListener('input', async () => {
  splitDownload.hidden = true

  try {
    await renderSplitPreviews()
  } catch (error) {
    splitPreview.hidden = true
    console.error('Förhandsvisningen kunde inte uppdateras:', error)
  }
})

// Dela den valda PDF-filen i två delar.
splitCreateButton?.addEventListener('click', async () => {
  splitDownload.hidden = true

  if (!selectedSplitFile || !splitAfterPage || !splitMessage) return

  const splitPage = Number(splitAfterPage.value)

  // Delningspunkten måste lämna minst en sida i varje resultatfil.
  if (
    splitPage < 1 ||
    splitPage >= selectedSplitPageCount
  ) {
    splitMessage.textContent =
      `Välj en sida mellan 1 och ${selectedSplitPageCount - 1}.`
    return
  }

  const bytes = await selectedSplitFile.arrayBuffer()
  const sourcePdf = await PDFLib.PDFDocument.load(bytes)

  const firstPdf = await PDFLib.PDFDocument.create()
  const secondPdf = await PDFLib.PDFDocument.create()

  // pdf-lib räknar sidindex från 0, medan användaren räknar från 1.
  const firstPageIndices = []
  const secondPageIndices = []

  for (let i = 0; i < selectedSplitPageCount; i++) {
    if (i < splitPage) {
      firstPageIndices.push(i)
    } else {
      secondPageIndices.push(i)
    }
  }

  const firstPages = await firstPdf.copyPages(sourcePdf, firstPageIndices)
  const secondPages = await secondPdf.copyPages(sourcePdf, secondPageIndices)

  for (const page of firstPages) {
    firstPdf.addPage(page)
  }

  for (const page of secondPages) {
    secondPdf.addPage(page)
  }

  const firstPdfBytes = await firstPdf.save()
  const secondPdfBytes = await secondPdf.save()

  if (firstSplitPdfUrl) {
    URL.revokeObjectURL(firstSplitPdfUrl)
  }

  if (secondSplitPdfUrl) {
    URL.revokeObjectURL(secondSplitPdfUrl)
  }

  firstSplitPdfUrl = URL.createObjectURL(
    new Blob([firstPdfBytes], { type: 'application/pdf' })
  )

  secondSplitPdfUrl = URL.createObjectURL(
    new Blob([secondPdfBytes], { type: 'application/pdf' })
  )

  splitDownload.hidden = false
})

// Ladda ner båda delarna när användaren ber om det.
splitDownloadButton?.addEventListener('click', () => {
  if (!firstSplitPdfUrl || !secondSplitPdfUrl || !selectedSplitFile) return

  const baseName = selectedSplitFile.name.replace(/\.pdf$/i, '')

  const firstLink = document.createElement('a')
  firstLink.href = firstSplitPdfUrl
  firstLink.download = `${baseName}_del1.pdf`
  firstLink.click()

  const secondLink = document.createElement('a')
  secondLink.href = secondSplitPdfUrl
  secondLink.download = `${baseName}_del2.pdf`
  secondLink.click()
})


// ------------------------------------------------------------
// GÖR BROSCHYR
// ------------------------------------------------------------

// Gå till arbetsytan för broschyr.
bookletButton?.addEventListener('click', () => {
  showTool(bookletView)
})

// Öppna filväljaren först när användaren ber om att välja en fil.
bookletSelectButton?.addEventListener('click', () => {
  bookletInput?.click()
})

// Läs PDF-filen och gör en enkel broschyr av exakt fyra sidor.
bookletInput?.addEventListener('change', async () => {
  bookletDownload.hidden = true

  if (!bookletInput.files || !bookletMessage) return

  const file = bookletInput.files[0]

  if (!file) return

  const bytes = await file.arrayBuffer()
  const pdf = await PDFLib.PDFDocument.load(bytes)
  const pageCount = pdf.getPageCount()

  if (pageCount !== 4) {
    bookletMessage.textContent =
      `Broschyrfunktionen stöder just nu PDF-filer med exakt 4 sidor. Den valda filen har ${pageCount} sidor.`
    return
  }

  bookletMessage.textContent =
    'PDF-filen har 4 sidor och kan göras till broschyr.'

  const bookletPdf = await PDFLib.PDFDocument.create()
  const originalPages = pdf.getPages()

  const originalWidth = originalPages[0].getWidth()
  const originalHeight = originalPages[0].getHeight()

  const sheetWidth = originalWidth * 2
  const sheetHeight = originalHeight

  // Framsidan ses i sin vanliga orientering: sida 4 till vänster,
  // sida 1 till höger.
  const front = bookletPdf.addPage([sheetWidth, sheetHeight])

  front.drawPage(
    await bookletPdf.embedPage(originalPages[3]),
    {
      x: 0,
      y: 0,
      width: originalWidth,
      height: originalHeight,
    }
  )

  front.drawPage(
    await bookletPdf.embedPage(originalPages[0]),
    {
      x: originalWidth,
      y: 0,
      width: originalWidth,
      height: originalHeight,
    }
  )

  // Baksidan motsvarar hela arket roterat 180 grader.
  // Därför byter sida 2 och 3 plats samtidigt som båda roteras.
  // Det ger sida 3 till vänster och sida 2 till höger i PDF-filen,
  // men rätt läsordning efter duplexutskrift och vikning.
  const back = bookletPdf.addPage([sheetWidth, sheetHeight])

  back.drawPage(
    await bookletPdf.embedPage(originalPages[2]),
    {
      x: originalWidth,
      y: originalHeight,
      width: originalWidth,
      height: originalHeight,
      rotate: PDFLib.degrees(180),
    }
  )

  back.drawPage(
    await bookletPdf.embedPage(originalPages[1]),
    {
      x: sheetWidth,
      y: originalHeight,
      width: originalWidth,
      height: originalHeight,
      rotate: PDFLib.degrees(180),
    }
  )

  const bookletPdfBytes = await bookletPdf.save()

  if (bookletPdfUrl) {
    URL.revokeObjectURL(bookletPdfUrl)
  }

  const bookletBlob = new Blob(
    [bookletPdfBytes],
    { type: 'application/pdf' }
  )

  bookletPdfUrl = URL.createObjectURL(bookletBlob)

  bookletDownload.hidden = false
})

// Ladda ner broschyren när användaren ber om det.
bookletDownloadButton?.addEventListener('click', () => {
  if (!bookletPdfUrl) return

  const downloadLink = document.createElement('a')
  downloadLink.href = bookletPdfUrl
  downloadLink.download = bookletFilename?.value || 'broschyr.pdf'
  downloadLink.click()
})
