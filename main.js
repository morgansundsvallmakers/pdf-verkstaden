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

// Räkna ut en placering som bevarar sidans proportioner.
// Sida 1 bestämmer storleken på varje broschyrhalva. Andra sidformat
// skalas bara ned om det behövs och centreras utan att sträckas.
function getBookletPlacement(page, slotX, slotY, slotWidth, slotHeight, rotation = 0) {
  const pageWidth = page.getWidth()
  const pageHeight = page.getHeight()
  const scale = Math.min(1, slotWidth / pageWidth, slotHeight / pageHeight)
  const width = pageWidth * scale
  const height = pageHeight * scale

  if (rotation === 180) {
    return {
      x: slotX + (slotWidth + width) / 2,
      y: slotY + (slotHeight + height) / 2,
      width,
      height,
      rotate: PDFLib.degrees(180),
    }
  }

  return {
    x: slotX + (slotWidth - width) / 2,
    y: slotY + (slotHeight - height) / 2,
    width,
    height,
  }
}

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
    getBookletPlacement(
      originalPages[3],
      0,
      0,
      originalWidth,
      originalHeight
    )
  )

  front.drawPage(
    await bookletPdf.embedPage(originalPages[0]),
    getBookletPlacement(
      originalPages[0],
      originalWidth,
      0,
      originalWidth,
      originalHeight
    )
  )

  // Baksidan motsvarar hela arket roterat 180 grader.
  // Därför byter sida 2 och 3 plats samtidigt som båda roteras.
  // Det ger sida 3 till vänster och sida 2 till höger i PDF-filen,
  // men rätt läsordning efter duplexutskrift och vikning.
  const back = bookletPdf.addPage([sheetWidth, sheetHeight])

  back.drawPage(
    await bookletPdf.embedPage(originalPages[2]),
    getBookletPlacement(
      originalPages[2],
      0,
      0,
      originalWidth,
      originalHeight,
      180
    )
  )

  back.drawPage(
    await bookletPdf.embedPage(originalPages[1]),
    getBookletPlacement(
      originalPages[1],
      originalWidth,
      0,
      originalWidth,
      originalHeight,
      180
    )
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


// ------------------------------------------------------------
// FÖRHANDSVISNING FÖR SLÅ IHOP PDF
// ------------------------------------------------------------

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

  // I Slå ihop används previewn bara för igenkänning. En liten renderad bild
  // räcker och minskar samtidigt arbetet som webbläsaren behöver göra.
  const availableWidth = 110
  const scale = Math.min(1, availableWidth / unscaledViewport.width)
  const viewport = page.getViewport({ scale })

  const outputScale = window.devicePixelRatio || 1
  const context = canvas.getContext('2d')

  canvas.width = Math.floor(viewport.width * outputScale)
  canvas.height = Math.floor(viewport.height * outputScale)
  canvas.style.width = `${Math.floor(viewport.width)}px`
  canvas.style.height = 'auto'

  await page.render({
    canvasContext: context,
    viewport,
    transform: outputScale === 1
      ? null
      : [outputScale, 0, 0, outputScale, 0, 0],
  }).promise
}

// Fillistan och pilknapparna skapas ovan. Här kompletteras varje listpost
// med en preview av den första sidan.
async function renderMergePreviews() {
  if (!mergePreviewList) return

  const items = Array.from(mergePreviewList.querySelectorAll('li'))

  for (const [index, item] of items.entries()) {
    const file = mergePreviewFiles[index]
    if (!file) continue

    // Rita inte dubbla previews om listan redan är kompletterad.
    if (item.querySelector('.merge-preview-canvas')) continue

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

// När ↑ eller ↓ används speglas samma flyttning i preview-listan innan
// huvudlistan byggs om.
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
}, true)

// När huvudlistan byggs om försvinner canvas-elementen tillsammans med de
// gamla listposterna. Lägg då tillbaka previews i den nya ordningen.
if (mergePreviewList) {
  const mergeListObserver = new MutationObserver((mutations) => {
    const listWasRebuilt = mutations.some(
      (mutation) => mutation.target === mergePreviewList
    )

    if (listWasRebuilt) {
      renderMergePreviews()
    }
  })

  mergeListObserver.observe(mergePreviewList, {
    childList: true,
    subtree: true,
  })
}


// ------------------------------------------------------------
// FÖRHANDSVISNING FÖR GÖR BROSCHYR
// ------------------------------------------------------------

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

  // Rendera sidorna en i taget. Samtidig rendering kan bli tung för
  // skannade PDF:er med stora bilder och göra gränssnittet trögt.
  for (let index = 0; index < bookletOriginalCanvases.length; index++) {
    await renderBookletPage(
      bookletPreviewPdf,
      index + 1,
      bookletOriginalCanvases[index],
      170
    )

    // Ge webbläsaren möjlighet att uppdatera gränssnittet mellan sidorna.
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  bookletOriginalPreview.hidden = false
}

// Själva broschyrfilen skapas när filen väljs. Håll nedladdningen dold tills
// användaren har valt "Gör broschyr" och resultatpreviewn är klar.
const bookletDownloadObserver = new MutationObserver(() => {
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

// Vänta kort på att broschyrfilen ska ha färdigställts.
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
    await renderBookletPage(resultPdf, 1, bookletFrontCanvas, 360)
    await renderBookletPage(resultPdf, 2, bookletBackCanvas, 360)

    bookletPreviewCreated = true
    bookletResultPreview.hidden = false
    bookletPreviewDownload.hidden = false
  } catch (error) {
    console.error('Broschyrens resultatpreview kunde inte skapas:', error)
  }
})
