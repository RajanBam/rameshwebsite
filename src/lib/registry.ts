// The tool registry, the single source of truth.
// Pages, nav, the all-tools index, homepage stages and the sitemap all
// read from here. Adding a tool = adding an entry here + a component.

export type Category = 'pdf' | 'image' | 'media' | 'finance' | 'developer' | 'text';

export interface FaqItem {
  q: string;
  a: string;
}

/** Below-the-fold SEO content. Renders under the tool on every page.
 *  This is what feeds organic search and satisfies the content bar for
 *  ads, without touching the clean layout above the fold. */
export interface ToolContent {
  intro: string;          // 1 to 2 sentence lead paragraph
  steps: string[];        // "How it works" ordered steps
  faq: FaqItem[];         // FAQ (also emitted as FAQPage structured data)
}

export interface Tool {
  slug: string;
  name: string;           // display name
  category: Category;
  /** Short one-liner shown under the title. */
  tagline: string;
  /** The interactive island component id. undefined => not built yet
   *  (kept out of nav / routes so we never ship a thin "coming soon" page). */
  component?: string;
  /** Batch tool? Drives the "unlimited files" copy + queue UI. */
  batch?: boolean;
  seo: {
    title: string;        // <title>
    description: string;   // meta description
    keywords: string[];
  };
  content?: ToolContent;  // required once implemented
}

export const CATEGORIES: Record<Category, { label: string; blurb: string }> = {
  pdf: { label: 'PDF', blurb: 'Merge, split, compress and convert. Nothing uploaded.' },
  image: { label: 'Image', blurb: 'Compress, resize and convert by the hundred.' },
  media: { label: 'Video & Audio', blurb: 'Compress video and audio on your own device.' },
  finance: { label: 'Calculators', blurb: 'Answers as you type.' },
  developer: { label: 'Developer', blurb: 'The small tools you reach for daily.' },
  text: { label: 'Text', blurb: 'Count, convert and compare text instantly.' },
};

export const TOOLS: Tool[] = [
  // ---------------------------------------------------------------- PDF
  {
    slug: 'pdf-merge',
    name: 'Merge PDF',
    category: 'pdf',
    tagline: 'Merge anything. Upload nothing.',
    component: 'PdfMerge',
    batch: true,
    seo: {
      title: 'Merge PDF: Combine PDF files in your browser, free and private',
      description:
        'Combine unlimited PDF files into one, right in your browser. No upload, no size limit, no sign-up. Your files never leave your device.',
      keywords: ['merge pdf', 'combine pdf', 'join pdf files', 'pdf merger', 'free pdf merge'],
    },
    content: {
      intro:
        'Combine any number of PDFs into a single document. Everything runs inside your browser, so your files are never uploaded to a server. There is no file-size cap and nothing to sign up for.',
      steps: [
        'Drag your PDF files into the box, or click to choose them.',
        'Reorder them by dragging. The order top-to-bottom is the order in the final file.',
        'Click Merge. The combined PDF downloads straight to your device.',
      ],
      faq: [
        {
          q: 'Are my PDF files uploaded to a server?',
          a: 'No. Merging happens entirely on your device inside the browser tab. You can open your browser Network tab, or turn off your Wi-Fi, and the tool still works.',
        },
        {
          q: 'Is there a limit on the number or size of files?',
          a: 'There is no artificial limit. Because processing is local, the only ceiling is your device available memory.',
        },
        {
          q: 'Does the order of files matter?',
          a: 'Yes. Files are merged in the order shown. Drag them up or down to reorder before merging.',
        },
      ],
    },
  },
  {
    slug: 'pdf-split',
    name: 'Split PDF',
    category: 'pdf',
    tagline: 'One file in. The pages you want out.',
    component: 'PdfSplit',
    seo: {
      title: 'Split PDF: Extract pages from a PDF, free and in-browser',
      description:
        'Split a PDF or extract specific pages, entirely in your browser. No upload, no limit, no sign-up. Files never leave your device.',
      keywords: ['split pdf', 'extract pdf pages', 'separate pdf', 'pdf splitter'],
    },
    content: {
      intro:
        'Pull specific pages out of a PDF, or burst every page into its own file. It all happens in your browser, so nothing is uploaded and your contracts and statements stay private.',
      steps: [
        'Drop in a PDF. The page count is read instantly.',
        'Enter the pages you want (like 1-3, 5, 8-10), or choose to split every page.',
        'Download the extracted PDF, or a zip of one file per page.',
      ],
      faq: [
        { q: 'Can I extract a specific range of pages?', a: 'Yes. Enter ranges and single pages together, for example "1-3, 5, 8-10", and only those pages are saved to a new PDF.' },
        { q: 'Can I split into one file per page?', a: 'Yes. Switch to "Each page" and every page is exported as its own PDF, delivered as a single zip.' },
        { q: 'Is my PDF uploaded?', a: 'No. Splitting runs entirely on your device. Turn off your Wi-Fi and it still works.' },
      ],
    },
  },
  {
    slug: 'pdf-compress',
    name: 'Compress PDF',
    category: 'pdf',
    tagline: 'A lighter PDF, in one click.',
    component: 'PdfCompress',
    seo: {
      title: 'Compress PDF: Reduce PDF file size free, in your browser',
      description:
        'Shrink PDF file size right in your browser. Choose a quality level and download a smaller PDF. No upload, no sign-up, nothing leaves your device.',
      keywords: ['compress pdf', 'reduce pdf size', 'pdf compressor', 'shrink pdf', 'make pdf smaller'],
    },
    content: {
      intro:
        'Make a PDF smaller so it is easy to email or upload to a form. The same engine class that professional PDF services run on their servers runs here inside your browser, so your document is never uploaded. Text stays selectable; embedded images are downsampled to the quality you choose.',
      steps: [
        'Drop in your PDF. It is compressed at every quality level on your device.',
        'Each level shows its exact resulting size and saving before you choose.',
        'Pick a level and download the smaller PDF.',
      ],
      faq: [
        { q: 'How much smaller will my PDF get?', a: 'It depends on the file. Image-heavy and scanned PDFs often shrink by well over half. The exact resulting size for every quality level is shown before you commit, and an option that would enlarge your file is never offered.' },
        { q: 'Is my PDF uploaded to compress it?', a: 'No. The whole process runs in your browser tab. Your document never leaves your device.' },
        { q: 'Will the text still be selectable?', a: 'Yes. Compression rewrites the PDF structure and downsamples embedded images, but text remains real text: selectable, searchable and crisp at any zoom.' },
      ],
    },
  },
  {
    slug: 'pdf-image',
    name: 'PDF to Image',
    category: 'pdf',
    tagline: 'Pages to pictures. Pictures to pages.',
    component: 'PdfImage',
    seo: {
      title: 'PDF to Image and Image to PDF: free, private, in your browser',
      description:
        'Turn PDF pages into images, or combine images into a PDF, without uploading anything. Runs fully in your browser.',
      keywords: ['pdf to image', 'image to pdf', 'pdf to jpg', 'jpg to pdf', 'png to pdf'],
    },
    content: {
      intro:
        'Two directions, one tool. Render every page of a PDF to a high-resolution PNG, or combine a stack of images into a single PDF. It all runs in your browser, nothing uploaded.',
      steps: [
        'Choose a direction: PDF to Image, or Image to PDF.',
        'Drop your files in. For image to PDF, they are added in the order you drop them.',
        'Download your PNGs (as a zip for multi-page PDFs) or the finished PDF.',
      ],
      faq: [
        { q: 'What resolution are the exported images?', a: 'Pages render at 2x scale for crisp, print-friendly PNGs.' },
        { q: 'Which image formats can I turn into a PDF?', a: 'JPG and PNG embed directly. WebP and others are converted automatically before being placed in the PDF.' },
        { q: 'Are my documents uploaded?', a: 'No. Both directions run fully on your device. The PDF and images never leave your browser.' },
      ],
    },
  },
  // -------------------------------------------------------------- Image
  {
    slug: 'image-compress',
    name: 'Compress Image',
    category: 'image',
    tagline: '500 photos at once.',
    component: 'ImageCompress',
    batch: true,
    seo: {
      title: 'Compress Images in Bulk: free, unlimited, in your browser',
      description:
        'Compress hundreds of JPG, PNG or WebP images at once, right in your browser. No upload, no limit, no sign-up. The batch tool other compressors never had.',
      keywords: ['compress image', 'bulk image compression', 'batch compress photos', 'reduce image size', 'compress jpg png webp'],
    },
    content: {
      intro:
        'Shrink JPG, PNG and WebP images by the hundred. Every image is compressed locally in your browser, so nothing is uploaded, there is no batch limit and no file-size cap. This is the batch workflow that single-image tools do not offer.',
      steps: [
        'Drop in as many images as you like, one or five hundred.',
        'Pick a quality level. A live preview shows the size saved.',
        'Download them individually, or all at once as a zip.',
      ],
      faq: [
        {
          q: 'How many images can I compress at once?',
          a: 'As many as your device can hold in memory. Because there is no server, we impose no batch limit, unlike server-based tools that cap free batches to save bandwidth costs.',
        },
        {
          q: 'Which formats are supported?',
          a: 'JPG, PNG and WebP in and out. You can also convert between them while compressing.',
        },
        {
          q: 'Will compression ruin my image quality?',
          a: 'You control the quality level and see the result before downloading. For most photos a small reduction in quality cuts the file size dramatically.',
        },
      ],
    },
  },
  {
    slug: 'image-convert',
    name: 'Convert Image',
    category: 'image',
    tagline: 'PNG, JPG, WebP. Any way you like.',
    component: 'ImageConvert',
    batch: true,
    seo: {
      title: 'Convert Images: PNG, JPG, WebP in bulk, free and private',
      description:
        'Convert images between PNG, JPG and WebP in your browser. Unlimited files, nothing uploaded, no sign-up.',
      keywords: ['convert image', 'png to jpg', 'jpg to webp', 'webp to png', 'image converter'],
    },
    content: {
      intro:
        'Convert images between PNG, JPG and WebP by the hundred. Each file is converted on your own device, so there is no upload, no batch cap, and no sign-up.',
      steps: [
        'Drop in as many images as you like.',
        'Pick the format to convert to, and a quality level for JPG or WebP.',
        'Download them one by one, or all together as a zip.',
      ],
      faq: [
        { q: 'Which conversions are supported?', a: 'Any mix of PNG, JPG and WebP, in either direction, for example PNG to WebP, or WebP back to JPG.' },
        { q: 'Is there a limit on how many I can convert?', a: 'No artificial limit. Files are processed locally, so the only ceiling is your device memory.' },
        { q: 'When should I use WebP?', a: 'WebP usually produces the smallest files for the web at the same visual quality, which is great for faster-loading pages.' },
      ],
    },
  },
  {
    slug: 'image-resize',
    name: 'Resize Image',
    category: 'image',
    tagline: 'Any width. Aspect kept.',
    component: 'ImageResize',
    batch: true,
    seo: {
      title: 'Resize Images in Bulk: free, private, in your browser',
      description:
        'Resize one image or hundreds to any width in your browser. Aspect ratio is kept automatically. No upload, no sign-up, nothing leaves your device.',
      keywords: ['resize image', 'bulk image resize', 'resize photo', 'image resizer', 'batch resize images'],
    },
    content: {
      intro:
        'Resize a single image or a whole batch to the exact width you need. Height is adjusted automatically to keep the aspect ratio. Every image is resized on your device, so nothing is uploaded.',
      steps: [
        'Drop in one image or a hundred.',
        'Set the target width with the slider.',
        'Click Resize and download one file or a zip of all of them.',
      ],
      faq: [
        { q: 'Does resizing keep the aspect ratio?', a: 'Yes. You set the width and the height is calculated for you, so images never look stretched.' },
        { q: 'Are my images uploaded?', a: 'No. Resizing runs entirely in your browser. Turn off your Wi-Fi and it still works.' },
        { q: 'Can I resize many images at once?', a: 'Yes. Drop in a whole batch and a progress ring shows the work as each image is resized.' },
      ],
    },
  },
  {
    slug: 'heic-to-jpg',
    name: 'HEIC to JPG',
    category: 'image',
    tagline: 'iPhone photos, everywhere.',
    component: 'HeicToJpg',
    batch: true,
    seo: {
      title: 'HEIC to JPG: convert iPhone photos free, in your browser',
      description:
        'Convert HEIC photos from your iPhone to JPG, in bulk, without uploading them. Runs entirely in your browser.',
      keywords: ['heic to jpg', 'heic to jpeg', 'convert iphone photos', 'heic converter'],
    },
    content: {
      intro:
        'iPhones save photos as HEIC, which many apps and Windows PCs cannot open. Convert them to universally-supported JPG (or PNG) right here, in bulk, and without uploading your photos anywhere.',
      steps: [
        'Drop in your HEIC photos, one or a whole camera roll.',
        'Choose JPG or PNG, and a quality level.',
        'Download them individually or all at once as a zip.',
      ],
      faq: [
        { q: 'Why will my HEIC photos not open elsewhere?', a: 'HEIC is Apple format. Converting to JPG makes the photos open anywhere: Windows, Android, email, and every website.' },
        { q: 'Are my photos uploaded to convert them?', a: 'No. The conversion runs inside your browser. Your photos never leave your device.' },
        { q: 'Can I convert many at once?', a: 'Yes, drop in the whole batch. They convert one after another and download together as a zip.' },
      ],
    },
  },
  // -------------------------------------------------------------- Media
  {
    slug: 'video-compress',
    name: 'Compress Video',
    category: 'media',
    tagline: 'Smaller videos. Same device.',
    component: 'VideoCompress',
    seo: {
      title: 'Compress Video: reduce video file size free, in your browser',
      description:
        'Shrink MP4, MOV and WebM videos right in your browser. See the expected size before you start. No upload, no watermark, nothing leaves your device.',
      keywords: ['compress video', 'video compressor', 'reduce video size', 'compress mp4', 'video size reducer'],
    },
    content: {
      intro:
        'Make a video small enough to send or upload, without sending it anywhere yourself. The encoder runs inside your browser, and the expected output size for every quality level is shown from the moment you drop the file in.',
      steps: [
        'Drop in a video. Its length is read and the expected size appears on each quality option.',
        'Pick Small (480p), Medium (720p) or High (1080p).',
        'Click Compress and watch the progress ring, then download the MP4.',
      ],
      faq: [
        { q: 'Is my video uploaded to a server?', a: 'No. The encoder itself runs in your browser, so the video never leaves your device. The first use downloads the encoding engine once, about 31 MB, and it is cached after that.' },
        { q: 'How do I know the output size before compressing?', a: 'Compression targets a fixed bitrate, so the expected size is the bitrate multiplied by the video length. That estimate is shown on each quality option as soon as your file is loaded.' },
        { q: 'Why is it slower than an online converter?', a: 'Everything is computed by your own processor rather than a server farm. Short clips take moments; long, high-resolution videos take longer. The trade is privacy: nothing is uploaded.' },
        { q: 'Which formats can I compress?', a: 'MP4, MOV, WebM, MKV and AVI inputs are supported, and the output is a widely compatible MP4 (H.264 with AAC audio).' },
      ],
    },
  },
  {
    slug: 'audio-compress',
    name: 'Compress Audio',
    category: 'media',
    tagline: 'Lighter audio, chosen bitrate.',
    component: 'AudioCompress',
    seo: {
      title: 'Compress Audio: reduce MP3, WAV, M4A size free, in your browser',
      description:
        'Shrink audio files to MP3 at the bitrate you choose, right in your browser. See the expected size before you start. No upload, nothing leaves your device.',
      keywords: ['compress audio', 'audio compressor', 'reduce mp3 size', 'wav to mp3', 'compress audio online'],
    },
    content: {
      intro:
        'Convert big WAV, FLAC or M4A files, or oversized MP3s, into a lean MP3 at the bitrate you pick. The expected output size appears as soon as you drop the file in, and the encoding happens entirely on your device.',
      steps: [
        'Drop in an audio file. Its length is read and the expected size appears on each quality option.',
        'Pick Voice (64 kbps), Standard (128 kbps) or High (192 kbps).',
        'Click Compress, then download the MP3.',
      ],
      faq: [
        { q: 'Is my audio uploaded?', a: 'No. Encoding runs in your browser using a locally loaded engine. Your recordings never leave your device, which matters for voice notes and interviews.' },
        { q: 'How accurate is the size estimate?', a: 'MP3 at a fixed bitrate has a predictable size: bitrate times duration. The number shown next to each option is what you will get, within about a percent.' },
        { q: 'Which bitrate should I choose?', a: 'For spoken voice, 64 kbps is clear and small. For everyday music listening, 128 kbps is the standard. Choose 192 kbps when quality matters more than size.' },
        { q: 'Which input formats work?', a: 'MP3, WAV, M4A, AAC, OGG and FLAC all convert. The output is MP3, which plays everywhere.' },
      ],
    },
  },
  // ------------------------------------------------------------ Finance
  {
    slug: 'nepal-income-tax',
    name: 'Nepal Income Tax',
    category: 'finance',
    tagline: 'Your tax for 2082/83. As you type.',
    component: 'NepalIncomeTax',
    seo: {
      title: 'Nepal Income Tax Calculator FY 2082/83 (2025/26), free',
      description:
        'Calculate your Nepal income tax for FY 2082/83 in seconds. Latest slabs for individuals and couples, SSF, deductions and marginal rates. Runs fully in your browser.',
      keywords: ['nepal income tax calculator', 'income tax nepal 2082 83', 'salary tax nepal', 'tax slab nepal 2082', 'nepal salary calculator'],
    },
    content: {
      intro:
        'Work out your Nepal income tax for the current fiscal year, FY 2082/83 (2025/26), using the official slabs for individuals and married couples. It updates as you type, and every calculation stays on your device.',
      steps: [
        'Enter your salary (monthly or annual) and choose individual or couple.',
        'Add any retirement (SSF, EPF or CIT) and insurance contributions to see your deductions applied.',
        'Read your tax slab by slab, your effective rate, and your take-home.',
      ],
      faq: [
        { q: 'What are the income tax slabs in Nepal for FY 2082/83?', a: 'For an individual: 1% on the first Rs 5,00,000, 10% on the next Rs 2,00,000, 20% on the next Rs 3,00,000, 30% on the next Rs 10,00,000, 36% on the next Rs 30,00,000, and 39% above Rs 50,00,000. Married couples get a wider first slab of Rs 6,00,000. The rates are unchanged from FY 2081/82.' },
        { q: 'What is the 1% social security tax, and who is exempt?', a: 'The first slab is a 1% Social Security Tax (SST). If you contribute to the Social Security Fund (SSF), that 1% is waived. Tick the SSF box to reflect this.' },
        { q: 'Which deductions can lower my taxable income?', a: 'Retirement contributions to SSF, EPF or CIT (capped at the lower of Rs 5,00,000 or one-third of income), plus life and health insurance premiums, are deducted before tax is calculated.' },
        { q: 'Is this an official figure?', a: 'It is an accurate estimate using the published slabs, for resident individuals on employment income. Confirm your exact liability with a tax professional.' },
      ],
    },
  },
  {
    slug: 'emi-calculator',
    name: 'EMI Calculator',
    category: 'finance',
    tagline: 'Every month, to the rupee.',
    component: 'EmiCalculator',
    seo: {
      title: 'EMI Calculator: loan monthly payment, free and instant',
      description:
        'Calculate your loan EMI, total interest and full amortization schedule instantly in your browser. For home, auto and personal loans.',
      keywords: ['emi calculator', 'loan calculator', 'home loan emi', 'monthly payment calculator', 'interest calculator'],
    },
    content: {
      intro:
        'See your exact monthly loan payment (EMI), how much of it is interest, and the full year-by-year breakdown, instantly, as you drag the sliders. Nothing is sent anywhere.',
      steps: [
        'Enter the loan amount.',
        'Set the annual interest rate and tenure with the sliders.',
        'Read your EMI, total interest, and the yearly amortization schedule.',
      ],
      faq: [
        { q: 'How is EMI calculated?', a: 'EMI uses the standard reducing-balance formula from the principal, the monthly interest rate, and the number of months. This tool does that for you and splits each year into principal and interest.' },
        { q: 'Does it work for home, auto and personal loans?', a: 'Yes. The math is the same for any reducing-balance loan. Just enter that loan amount, rate and tenure.' },
        { q: 'Why does early EMI go mostly to interest?', a: 'Interest is charged on the outstanding balance, which is highest at the start. The yearly breakdown shows how the split shifts toward principal over time.' },
      ],
    },
  },
  // ---------------------------------------------------------- Developer
  {
    slug: 'qr-generator',
    name: 'QR Code Generator',
    category: 'developer',
    tagline: 'A link becomes a square.',
    component: 'QrGenerator',
    seo: {
      title: 'QR Code Generator: free, no watermark, in your browser',
      description:
        'Generate QR codes for links, text, Wi-Fi and more. Download as PNG or SVG. No watermark, no sign-up, nothing uploaded.',
      keywords: ['qr code generator', 'free qr code', 'qr code no watermark', 'create qr code'],
    },
    content: {
      intro:
        'Turn any link or text into a QR code and download it as a crisp PNG or scalable SVG. It is generated on your device, with no watermark and no account.',
      steps: [
        'Type or paste the link or text you want to encode.',
        'Adjust the size and colors if you like.',
        'Download the QR code as PNG or SVG.',
      ],
      faq: [
        {
          q: 'Is there a watermark or a limit?',
          a: 'No watermark, no limit, no sign-up. The QR code is generated locally in your browser and is yours to use anywhere.',
        },
        {
          q: 'Can I download a vector (SVG) QR code?',
          a: 'Yes. SVG scales to any size without blurring, ideal for print. PNG is also available for quick use online.',
        },
        {
          q: 'Do QR codes expire?',
          a: 'No. A QR code is just an encoded version of your text or link. It works as long as the link it points to works.',
        },
      ],
    },
  },
  {
    slug: 'json-formatter',
    name: 'JSON Formatter',
    category: 'developer',
    tagline: 'Messy in. Readable out.',
    component: 'JsonFormatter',
    seo: {
      title: 'JSON Formatter and Validator: free, private, in your browser',
      description:
        'Format, beautify, minify and validate JSON instantly in your browser. Nothing is uploaded, safe for sensitive data.',
      keywords: ['json formatter', 'json beautifier', 'json validator', 'format json online', 'json minify'],
    },
    content: {
      intro:
        'Paste messy or minified JSON and get it cleanly formatted, validated and ready to read. Everything stays in your browser, so it is safe even for sensitive payloads and API responses.',
      steps: [
        'Paste your JSON into the box.',
        'It is validated and formatted instantly. Errors are pointed out with a line.',
        'Copy the result, or minify it back down to one line.',
      ],
      faq: [
        {
          q: 'Is my JSON sent anywhere?',
          a: 'No. Formatting and validation run entirely in your browser. Nothing is uploaded, which makes it safe for internal API responses and sensitive data.',
        },
        {
          q: 'Can it both beautify and minify?',
          a: 'Yes. Format with proper indentation for reading, or minify to a single compact line for shipping.',
        },
        {
          q: 'What happens if my JSON is invalid?',
          a: 'The tool shows the parse error and the position, so you can find the missing comma or bracket quickly.',
        },
      ],
    },
  },
  {
    slug: 'base64',
    name: 'Base64 Encode/Decode',
    category: 'developer',
    tagline: 'Text to Base64 and back.',
    component: 'Base64Tool',
    seo: {
      title: 'Base64 Encode and Decode: free, private, in your browser',
      description:
        'Encode text to Base64 or decode Base64 back to text, instantly in your browser. UTF-8 safe, nothing uploaded, no sign-up.',
      keywords: ['base64 encode', 'base64 decode', 'base64 converter', 'text to base64', 'base64 to text'],
    },
    content: {
      intro:
        'Convert text to Base64 or decode Base64 back to plain text. It is fully Unicode-aware and runs on your device, so even sensitive strings never leave your browser.',
      steps: [
        'Choose Encode or Decode.',
        'Type or paste your text.',
        'Copy the result with one click.',
      ],
      faq: [
        { q: 'Does this handle emoji and non-English text?', a: 'Yes. Encoding and decoding are UTF-8 safe, so emoji and any language convert correctly.' },
        { q: 'Is my text uploaded?', a: 'No. The conversion runs entirely in your browser tab. Nothing is sent to a server.' },
        { q: 'What is Base64 used for?', a: 'It encodes data as plain text, which is handy for embedding images in HTML or CSS, sending data in URLs, and storing binary content in text-only fields.' },
      ],
    },
  },
  {
    slug: 'url-encode',
    name: 'URL Encode/Decode',
    category: 'developer',
    tagline: 'Safe for the address bar.',
    component: 'UrlEncoder',
    seo: {
      title: 'URL Encode and Decode: free, private, in your browser',
      description:
        'Encode or decode URLs and query strings instantly in your browser. Component-safe, nothing uploaded, no sign-up.',
      keywords: ['url encode', 'url decode', 'percent encoding', 'url encoder', 'encode query string'],
    },
    content: {
      intro:
        'Encode text so it is safe to place in a URL, or decode a percent-encoded URL back to readable text. It runs locally, with nothing uploaded.',
      steps: [
        'Choose Encode or Decode.',
        'Paste your URL or text.',
        'Copy the converted result.',
      ],
      faq: [
        { q: 'What does URL encoding do?', a: 'It replaces characters that are not safe in a URL, such as spaces and symbols, with percent-encoded equivalents so links and query strings work reliably.' },
        { q: 'Is my URL uploaded?', a: 'No. Encoding and decoding happen entirely in your browser.' },
        { q: 'Does it encode the whole URL or just a part?', a: 'It uses component encoding, which is right for a single value like a query parameter. Encode each part separately for a full link.' },
      ],
    },
  },
  {
    slug: 'hash-generator',
    name: 'Hash Generator',
    category: 'developer',
    tagline: 'SHA-256 and friends.',
    component: 'HashGenerator',
    seo: {
      title: 'Hash Generator: SHA-256, SHA-1, SHA-512, free and private',
      description:
        'Generate SHA-1, SHA-256, SHA-384 and SHA-512 hashes from any text, instantly in your browser. Nothing uploaded, no sign-up.',
      keywords: ['hash generator', 'sha256 generator', 'sha1 hash', 'sha512', 'online hash tool'],
    },
    content: {
      intro:
        'Generate a cryptographic hash of any text using the SHA family. It uses your browser built-in Web Crypto, so the input never leaves your device.',
      steps: [
        'Type or paste your text.',
        'Pick an algorithm: SHA-1, SHA-256, SHA-384 or SHA-512.',
        'Copy the resulting hash.',
      ],
      faq: [
        { q: 'Which hash algorithms are supported?', a: 'SHA-1, SHA-256, SHA-384 and SHA-512, all computed by your browser Web Crypto API.' },
        { q: 'Is my input sent to a server?', a: 'No. Hashing runs entirely on your device, which is important when you are hashing sensitive values.' },
        { q: 'Why is MD5 not included?', a: 'The Web Crypto API does not include MD5 because it is considered broken for security. The SHA-2 options here are the modern, safe choice.' },
      ],
    },
  },
  {
    slug: 'uuid-generator',
    name: 'UUID Generator',
    category: 'developer',
    tagline: 'Unique IDs, on demand.',
    component: 'UuidGenerator',
    seo: {
      title: 'UUID Generator: free v4 UUIDs, private, in your browser',
      description:
        'Generate one or many random version 4 UUIDs instantly in your browser. Cryptographically random, nothing uploaded, no sign-up.',
      keywords: ['uuid generator', 'guid generator', 'uuid v4', 'generate uuid', 'random id generator'],
    },
    content: {
      intro:
        'Generate random version 4 UUIDs, one at a time or in a batch. They are created with your browser cryptographic random source, entirely on your device.',
      steps: [
        'Choose how many UUIDs you need.',
        'Click Generate.',
        'Copy them all with one click.',
      ],
      faq: [
        { q: 'Are these UUIDs truly random?', a: 'Yes. They are version 4 UUIDs generated from your browser cryptographic random number generator.' },
        { q: 'Can I generate many at once?', a: 'Yes. Use the slider to create up to fifty at a time and copy the whole list.' },
        { q: 'Is anything uploaded?', a: 'No. UUIDs are generated locally and never touch a server.' },
      ],
    },
  },
  {
    slug: 'password-generator',
    name: 'Password Generator',
    category: 'developer',
    tagline: 'Strong. Random. Yours.',
    component: 'PasswordGenerator',
    seo: {
      title: 'Password Generator: strong random passwords, free and private',
      description:
        'Generate strong, random passwords in your browser. Choose length and character types. Cryptographically random, nothing uploaded, no sign-up.',
      keywords: ['password generator', 'strong password', 'random password', 'secure password generator'],
    },
    content: {
      intro:
        'Create strong, random passwords with the length and character mix you choose. Each password is generated with your browser cryptographic random source and never leaves your device.',
      steps: [
        'Set the length and pick which character types to include.',
        'A password is generated instantly, with a strength readout.',
        'Copy it, or regenerate for a new one.',
      ],
      faq: [
        { q: 'Are the passwords safe to use?', a: 'Yes. They are generated with cryptographic randomness in your browser, and nothing is transmitted or stored anywhere.' },
        { q: 'Is the password sent to a server?', a: 'No. Generation happens entirely on your device, which is exactly what you want for a password.' },
        { q: 'What makes a strong password?', a: 'Length matters most. Sixteen or more characters mixing upper case, lower case, numbers and symbols is a strong choice.' },
      ],
    },
  },
  {
    slug: 'csv-json',
    name: 'CSV to JSON',
    category: 'developer',
    tagline: 'CSV and JSON, both ways.',
    component: 'CsvJson',
    seo: {
      title: 'CSV to JSON and JSON to CSV: free, private, in your browser',
      description:
        'Convert CSV to JSON or JSON to CSV instantly in your browser. Handles quoted fields, downloads the result, nothing uploaded.',
      keywords: ['csv to json', 'json to csv', 'convert csv', 'csv converter', 'csv json tool'],
    },
    content: {
      intro:
        'Convert a CSV table into JSON, or turn an array of JSON objects back into CSV. It handles quoted fields and commas, and runs entirely in your browser.',
      steps: [
        'Choose CSV to JSON or JSON to CSV.',
        'Paste your data. The first CSV row is treated as the headers.',
        'Copy or download the converted file.',
      ],
      faq: [
        { q: 'Does it handle commas and quotes inside fields?', a: 'Yes. The parser understands quoted fields, escaped quotes, and line breaks, so real-world CSV converts correctly.' },
        { q: 'Is my data uploaded?', a: 'No. The conversion runs on your device, so spreadsheets and exports stay private.' },
        { q: 'What JSON shape does it expect?', a: 'An array of flat objects, where each object becomes a row and the keys become the columns.' },
      ],
    },
  },
  {
    slug: 'timestamp',
    name: 'Timestamp Converter',
    category: 'developer',
    tagline: 'Unix time, made human.',
    component: 'TimestampConverter',
    seo: {
      title: 'Unix Timestamp Converter: free, private, in your browser',
      description:
        'Convert Unix timestamps to human dates and back, in your browser. Shows local time, UTC and ISO 8601. Nothing uploaded, no sign-up.',
      keywords: ['unix timestamp converter', 'epoch converter', 'timestamp to date', 'date to timestamp', 'epoch time'],
    },
    content: {
      intro:
        'Convert a Unix timestamp into a readable date, or pick a date to get its timestamp. It shows your local time, UTC and ISO 8601, and updates the live current time as you watch.',
      steps: [
        'Enter a Unix timestamp in seconds or milliseconds.',
        'Read the local, UTC and ISO versions instantly.',
        'Or pick a date and time to get its timestamp.',
      ],
      faq: [
        { q: 'Does it accept milliseconds as well as seconds?', a: 'Yes. Longer values are treated as milliseconds automatically, so both formats work.' },
        { q: 'Which timezones does it show?', a: 'Your local timezone plus UTC, along with the ISO 8601 string that many systems use.' },
        { q: 'Is anything uploaded?', a: 'No. All conversion happens in your browser.' },
      ],
    },
  },
  {
    slug: 'color-picker',
    name: 'Color Picker',
    category: 'developer',
    tagline: 'HEX, RGB, HSL. Copied.',
    component: 'ColorPicker',
    seo: {
      title: 'Color Picker and Converter: HEX, RGB, HSL, free and private',
      description:
        'Pick a color and copy it as HEX, RGB or HSL, instantly in your browser. No sign-up, nothing uploaded.',
      keywords: ['color picker', 'hex to rgb', 'rgb to hsl', 'color converter', 'hex color code'],
    },
    content: {
      intro:
        'Pick any color and read it as HEX, RGB and HSL at the same time. Copy the format you need with one click. It runs entirely in your browser.',
      steps: [
        'Pick a color with the swatch, or type a HEX value.',
        'See it converted to HEX, RGB and HSL.',
        'Copy the format you need.',
      ],
      faq: [
        { q: 'Which color formats does it show?', a: 'HEX, RGB and HSL, all updated together as you change the color.' },
        { q: 'Is this useful for CSS?', a: 'Yes. Copy the exact HEX, RGB or HSL string and paste it straight into your stylesheet.' },
        { q: 'Is anything uploaded?', a: 'No. The tool works completely offline in your browser.' },
      ],
    },
  },
  // --------------------------------------------------------------- Text
  {
    slug: 'word-counter',
    name: 'Word Counter',
    category: 'text',
    tagline: 'Counts as you type.',
    component: 'WordCounter',
    seo: {
      title: 'Word Counter: words, characters and read time, free',
      description:
        'Count words, characters, sentences, paragraphs and reading time as you type. Runs in your browser, nothing uploaded, no sign-up.',
      keywords: ['word counter', 'character counter', 'count words', 'word count tool', 'reading time calculator'],
    },
    content: {
      intro:
        'Count words, characters, sentences, paragraphs and estimated reading time as you type. It runs in your browser, so your writing stays private.',
      steps: [
        'Type or paste your text.',
        'The counts update live as you write.',
        'Use them to hit a word target or a character limit.',
      ],
      faq: [
        { q: 'Does it count characters with and without spaces?', a: 'Yes. It shows total characters and characters excluding spaces, which is handy for strict limits.' },
        { q: 'How is reading time estimated?', a: 'Reading time is based on an average of about 200 words per minute.' },
        { q: 'Is my text uploaded?', a: 'No. Counting happens entirely in your browser as you type.' },
      ],
    },
  },
  {
    slug: 'case-converter',
    name: 'Case Converter',
    category: 'text',
    tagline: 'Any case you need.',
    component: 'CaseConverter',
    seo: {
      title: 'Case Converter: sentence, title, upper, camel, snake case, free',
      description:
        'Convert text between sentence case, title case, UPPERCASE, lowercase, camelCase, snake_case and kebab-case. Runs in your browser, nothing uploaded.',
      keywords: ['case converter', 'title case', 'uppercase lowercase', 'camelcase converter', 'snake case'],
    },
    content: {
      intro:
        'Convert text between sentence case, title case, upper and lower case, and developer styles like camelCase, snake_case and kebab-case. Copy any result with one click.',
      steps: [
        'Type or paste your text.',
        'See it converted to every case at once.',
        'Copy the one you need.',
      ],
      faq: [
        { q: 'Which cases can it produce?', a: 'Sentence case, Title Case, UPPERCASE, lowercase, camelCase, snake_case and kebab-case.' },
        { q: 'Is my text uploaded?', a: 'No. Every conversion runs in your browser.' },
        { q: 'Is this useful for coding?', a: 'Yes. camelCase, snake_case and kebab-case are common in code, so you can convert names quickly.' },
      ],
    },
  },
  {
    slug: 'lorem-ipsum',
    name: 'Lorem Ipsum',
    category: 'text',
    tagline: 'Placeholder text, instantly.',
    component: 'LoremIpsum',
    seo: {
      title: 'Lorem Ipsum Generator: placeholder text, free and private',
      description:
        'Generate lorem ipsum placeholder text by paragraphs, sentences or words. Copy with one click. Runs in your browser, no sign-up.',
      keywords: ['lorem ipsum generator', 'placeholder text', 'dummy text', 'lipsum', 'filler text'],
    },
    content: {
      intro:
        'Generate classic lorem ipsum placeholder text to fill a design or a layout. Choose how much you need by paragraphs, sentences or words, then copy it.',
      steps: [
        'Pick paragraphs, sentences or words.',
        'Choose how many you want.',
        'Copy the generated text, or regenerate for a fresh set.',
      ],
      faq: [
        { q: 'What is lorem ipsum for?', a: 'It is placeholder text used by designers and developers to fill a layout so you can judge the look without real content.' },
        { q: 'Can I control the amount?', a: 'Yes. Generate by paragraphs, sentences or words, and set the exact count.' },
        { q: 'Is anything uploaded?', a: 'No. The text is generated in your browser.' },
      ],
    },
  },
  {
    slug: 'text-diff',
    name: 'Text Diff',
    category: 'text',
    tagline: 'Spot every change.',
    component: 'TextDiff',
    seo: {
      title: 'Text Diff Checker: compare two texts, free and private',
      description:
        'Compare two blocks of text and see exactly what was added or removed, line by line. Runs in your browser, nothing uploaded, no sign-up.',
      keywords: ['text diff', 'compare text', 'diff checker', 'text comparison', 'find differences'],
    },
    content: {
      intro:
        'Paste two versions of a text and see exactly what changed, line by line, with additions and removals highlighted. It all runs in your browser, so private documents stay private.',
      steps: [
        'Paste the original text on the left.',
        'Paste the changed text on the right.',
        'Read the highlighted differences and the added or removed counts.',
      ],
      faq: [
        { q: 'How does it show the differences?', a: 'It compares line by line, marking added lines in green and removed lines in red, so changes are easy to scan.' },
        { q: 'Is my text uploaded?', a: 'No. The comparison runs entirely in your browser, which matters for contracts, code and other private text.' },
        { q: 'Can it compare code?', a: 'Yes. Any text works, including source code, configuration and prose.' },
      ],
    },
  },
];

// ------------------------------------------------------------- helpers
export const IMPLEMENTED_TOOLS = TOOLS.filter((t) => t.component);

export function toolsByCategory(cat: Category): Tool[] {
  return TOOLS.filter((t) => t.category === cat);
}

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
