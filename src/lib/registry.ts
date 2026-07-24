// The tool registry — the single source of truth.
// Pages, nav, the all-tools index, homepage stages and the sitemap all
// read from here. Adding a tool = adding an entry here + a component.

export type Category = 'pdf' | 'image' | 'finance' | 'developer';

export interface FaqItem {
  q: string;
  a: string;
}

/** Below-the-fold SEO content. Renders under the tool on every page.
 *  This is what feeds organic search + satisfies AdSense's content bar,
 *  without touching the clean Apple layout above the fold. */
export interface ToolContent {
  intro: string;          // 1–2 sentence lead paragraph
  steps: string[];        // "How it works" ordered steps
  faq: FaqItem[];         // FAQ (also emitted as FAQPage structured data)
}

export interface Tool {
  slug: string;
  name: string;           // display name
  category: Category;
  /** Apple-voice one-liner shown under the title. Short. */
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
  pdf: { label: 'PDF', blurb: 'Merge, split and convert. Nothing uploaded.' },
  image: { label: 'Image', blurb: 'Compress and convert by the hundred.' },
  finance: { label: 'Calculators', blurb: 'Answers as you type.' },
  developer: { label: 'Developer', blurb: 'The small tools you reach for daily.' },
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
      title: 'Merge PDF — Combine PDF files in your browser, free & private',
      description:
        'Combine unlimited PDF files into one, right in your browser. No upload, no size limit, no sign-up. Your files never leave your device.',
      keywords: ['merge pdf', 'combine pdf', 'join pdf files', 'pdf merger', 'free pdf merge'],
    },
    content: {
      intro:
        'Combine any number of PDFs into a single document. Everything runs inside your browser using WebAssembly, so your files are never uploaded to a server — there is no file-size cap and nothing to sign up for.',
      steps: [
        'Drag your PDF files into the box, or click to choose them.',
        'Reorder them by dragging — the order top-to-bottom is the order in the final file.',
        'Click Merge. The combined PDF downloads straight to your device.',
      ],
      faq: [
        {
          q: 'Are my PDF files uploaded to a server?',
          a: 'No. Merging happens entirely on your device inside the browser tab. You can open your browser’s Network tab, or turn off your Wi-Fi, and the tool still works.',
        },
        {
          q: 'Is there a limit on the number or size of files?',
          a: 'There is no artificial limit. Because processing is local, the only ceiling is your device’s available memory.',
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
      title: 'Split PDF — Extract pages from a PDF, free & in-browser',
      description:
        'Split a PDF or extract specific pages, entirely in your browser. No upload, no limit, no sign-up. Files never leave your device.',
      keywords: ['split pdf', 'extract pdf pages', 'separate pdf', 'pdf splitter'],
    },
    content: {
      intro:
        'Pull specific pages out of a PDF, or burst every page into its own file. It all happens in your browser — nothing is uploaded, so contracts and statements stay private.',
      steps: [
        'Drop in a PDF. The page count is read instantly.',
        'Enter the pages you want (like 1-3, 5, 8-10), or choose to split every page.',
        'Download the extracted PDF, or a zip of one file per page.',
      ],
      faq: [
        { q: 'Can I extract a specific range of pages?', a: 'Yes. Enter ranges and single pages together, e.g. “1-3, 5, 8-10”, and only those pages are saved to a new PDF.' },
        { q: 'Can I split into one file per page?', a: 'Yes. Switch to “Each page” and every page is exported as its own PDF, delivered as a single zip.' },
        { q: 'Is my PDF uploaded?', a: 'No. Splitting runs entirely on your device. Turn off your Wi-Fi and it still works.' },
      ],
    },
  },
  {
    slug: 'pdf-image',
    name: 'PDF ⇄ Image',
    category: 'pdf',
    tagline: 'Pages to pictures. Pictures to pages.',
    component: 'PdfImage',
    seo: {
      title: 'PDF to Image & Image to PDF — free, private, in your browser',
      description:
        'Turn PDF pages into images, or combine images into a PDF, without uploading anything. Runs fully in your browser.',
      keywords: ['pdf to image', 'image to pdf', 'pdf to jpg', 'jpg to pdf', 'png to pdf'],
    },
    content: {
      intro:
        'Two directions, one tool. Render every page of a PDF to a high-resolution PNG, or combine a stack of images into a single PDF — all in your browser, nothing uploaded.',
      steps: [
        'Choose a direction: PDF → Image, or Image → PDF.',
        'Drop your file(s) in. For image → PDF, they are added in the order you drop them.',
        'Download your PNGs (as a zip for multi-page PDFs) or the finished PDF.',
      ],
      faq: [
        { q: 'What resolution are the exported images?', a: 'Pages render at 2× scale for crisp, print-friendly PNGs.' },
        { q: 'Which image formats can I turn into a PDF?', a: 'JPG and PNG embed directly; WebP and others are converted automatically before being placed in the PDF.' },
        { q: 'Are my documents uploaded?', a: 'No. Both directions run fully on your device — the PDF and images never leave your browser.' },
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
      title: 'Compress Images in Bulk — free, unlimited, in your browser',
      description:
        'Compress hundreds of JPG, PNG or WebP images at once, right in your browser. No upload, no limit, no sign-up. The batch tool Squoosh never had.',
      keywords: ['compress image', 'bulk image compression', 'batch compress photos', 'reduce image size', 'compress jpg png webp'],
    },
    content: {
      intro:
        'Shrink JPG, PNG and WebP images by the hundred. Every image is compressed locally in your browser — nothing is uploaded — so there is no batch limit and no file-size cap. This is the batch workflow that single-image tools like Squoosh don’t offer.',
      steps: [
        'Drop in as many images as you like — one or five hundred.',
        'Pick a quality level. A live preview shows the size saved.',
        'Download them individually, or all at once as a zip.',
      ],
      faq: [
        {
          q: 'How many images can I compress at once?',
          a: 'As many as your device can hold in memory. Because there is no server, we impose no batch limit — unlike server-based tools that cap free batches to avoid bandwidth costs.',
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
      title: 'Convert Images — PNG, JPG, WebP in bulk, free & private',
      description:
        'Convert images between PNG, JPG and WebP in your browser. Unlimited files, nothing uploaded, no sign-up.',
      keywords: ['convert image', 'png to jpg', 'jpg to webp', 'webp to png', 'image converter'],
    },
    content: {
      intro:
        'Convert images between PNG, JPG and WebP by the hundred. Each file is converted on your own device, so there is no upload, no batch cap, and no sign-up.',
      steps: [
        'Drop in as many images as you like.',
        'Pick the format to convert to, and a quality level for JPG/WebP.',
        'Download them one by one, or all together as a zip.',
      ],
      faq: [
        { q: 'Which conversions are supported?', a: 'Any mix of PNG, JPG and WebP, in either direction — for example PNG to WebP, or WebP back to JPG.' },
        { q: 'Is there a limit on how many I can convert?', a: 'No artificial limit. Files are processed locally, so the only ceiling is your device’s memory.' },
        { q: 'When should I use WebP?', a: 'WebP usually produces the smallest files for the web at the same visual quality, which is great for faster-loading pages.' },
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
      title: 'HEIC to JPG — convert iPhone photos free, in your browser',
      description:
        'Convert HEIC photos from your iPhone to JPG, in bulk, without uploading them. Runs entirely in your browser.',
      keywords: ['heic to jpg', 'heic to jpeg', 'convert iphone photos', 'heic converter'],
    },
    content: {
      intro:
        'iPhones save photos as HEIC, which many apps and Windows PCs can’t open. Convert them to universally-supported JPG (or PNG) right here — in bulk, and without uploading your photos anywhere.',
      steps: [
        'Drop in your HEIC photos — one or a whole camera roll.',
        'Choose JPG or PNG, and a quality level.',
        'Download them individually or all at once as a zip.',
      ],
      faq: [
        { q: 'Why won’t my HEIC photos open elsewhere?', a: 'HEIC is Apple’s format. Converting to JPG makes the photos open anywhere — Windows, Android, email, and every website.' },
        { q: 'Are my photos uploaded to convert them?', a: 'No. The conversion uses a WebAssembly decoder that runs inside your browser. Your photos never leave your device.' },
        { q: 'Can I convert many at once?', a: 'Yes — drop in the whole batch. They convert one after another and download together as a zip.' },
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
      title: 'Nepal Income Tax Calculator FY 2082/83 (2025/26) — free',
      description:
        'Calculate your Nepal income tax for FY 2082/83 in seconds. Latest slabs for individuals and couples, SSF, deductions and marginal rates. Runs fully in your browser.',
      keywords: ['nepal income tax calculator', 'income tax nepal 2082 83', 'salary tax nepal', 'tax slab nepal 2082', 'nepal salary calculator'],
    },
    content: {
      intro:
        'Work out your Nepal income tax for the current fiscal year, FY 2082/83 (2025/26), using the official slabs for individuals and married couples. It updates as you type, and every calculation stays on your device.',
      steps: [
        'Enter your salary (monthly or annual) and choose individual or couple.',
        'Add any retirement (SSF/EPF/CIT) and insurance contributions to see your deductions applied.',
        'Read your tax slab-by-slab, your effective rate, and your take-home.',
      ],
      faq: [
        { q: 'What are the income tax slabs in Nepal for FY 2082/83?', a: 'For an individual: 1% on the first Rs 5,00,000, 10% on the next Rs 2,00,000, 20% on the next Rs 3,00,000, 30% on the next Rs 10,00,000, 36% on the next Rs 30,00,000, and 39% above Rs 50,00,000. Married couples get a wider first slab of Rs 6,00,000. The rates are unchanged from FY 2081/82.' },
        { q: 'What is the 1% social security tax, and who is exempt?', a: 'The first slab is a 1% Social Security Tax (SST). If you contribute to the Social Security Fund (SSF), that 1% is waived — tick the SSF box to reflect this.' },
        { q: 'Which deductions can lower my taxable income?', a: 'Retirement contributions to SSF, EPF or CIT (capped at the lower of Rs 5,00,000 or one-third of income), plus life and health insurance premiums, are deducted before tax is calculated.' },
        { q: 'Is this an official figure?', a: 'It’s an accurate estimate using the published slabs, for resident individuals on employment income. Confirm your exact liability with a tax professional.' },
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
      title: 'EMI Calculator — loan monthly payment, free & instant',
      description:
        'Calculate your loan EMI, total interest and full amortization schedule instantly in your browser. For home, auto and personal loans.',
      keywords: ['emi calculator', 'loan calculator', 'home loan emi', 'monthly payment calculator', 'interest calculator'],
    },
    content: {
      intro:
        'See your exact monthly loan payment (EMI), how much of it is interest, and the full year-by-year breakdown — instantly, as you drag the sliders. Nothing is sent anywhere.',
      steps: [
        'Enter the loan amount.',
        'Set the annual interest rate and tenure with the sliders.',
        'Read your EMI, total interest, and the yearly amortization schedule.',
      ],
      faq: [
        { q: 'How is EMI calculated?', a: 'EMI = P·r·(1+r)^n / ((1+r)^n − 1), where P is the principal, r is the monthly interest rate, and n is the number of months. This tool does that for you and splits each year into principal and interest.' },
        { q: 'Does it work for home, auto and personal loans?', a: 'Yes. The math is the same for any reducing-balance loan — just enter that loan’s amount, rate and tenure.' },
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
      title: 'QR Code Generator — free, no watermark, in your browser',
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
          a: 'Yes. SVG scales to any size without blurring — ideal for print. PNG is also available for quick use online.',
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
      title: 'JSON Formatter & Validator — free, private, in your browser',
      description:
        'Format, beautify, minify and validate JSON instantly in your browser. Nothing is uploaded — safe for sensitive data.',
      keywords: ['json formatter', 'json beautifier', 'json validator', 'format json online', 'json minify'],
    },
    content: {
      intro:
        'Paste messy or minified JSON and get it cleanly formatted, validated and ready to read. Everything stays in your browser, so it is safe even for sensitive payloads and API responses.',
      steps: [
        'Paste your JSON into the box.',
        'It is validated and formatted instantly — errors are pointed out with a line.',
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
];

// ------------------------------------------------------------- helpers
export const IMPLEMENTED_TOOLS = TOOLS.filter((t) => t.component);

export function toolsByCategory(cat: Category): Tool[] {
  return TOOLS.filter((t) => t.category === cat);
}

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
