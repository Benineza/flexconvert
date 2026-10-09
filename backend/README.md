# FlexConvert - Spring Boot Backend Conversion Service

A high-performance, production-ready file conversion backend built with **Java 21**, **Spring Boot 4.x**, **Apache PDFBox 3.0**, **Apache POI 5.4**, **TwelveMonkeys ImageIO**, **Apache Batik**, and **FFmpeg**.

---

## Architecture Overview

FlexConvert uses a modular, service-oriented converter architecture:

```text
               HTTP Multipart Request
                         │
                         ▼
             ConversionController (REST)
                         │
                         ▼
                 ConversionService
                         │
         ┌───────────────┼───────────────┬────────────────┐
         ▼               ▼               ▼                ▼
DocumentToPdf     PdfToDocument     PdfToImage       ImageToPdf / Image
(TXT, DOCX, PPTX) (TXT, DOCX, PPTX) (PNG, JPG, WebP) (PNG, JPG, TIFF, SVG...)
         │               │               │                │
         └───────────────┼───────────────┴────────────────┘
                         ▼
                   VideoConverter
                (MP4, MOV, MKV, WebM via FFmpeg)
                         │
                         ▼
             StreamingResponseBody + Cleanup
```

### Conversion Capabilities

| Category | Input Formats | Target Formats | Engine |
| :--- | :--- | :--- | :--- |
| **Documents → PDF** | `TXT`, `DOCX`, `PPTX` | `PDF` | Apache PDFBox, Apache POI (with LibreOffice fallback if installed) |
| **PDF → Documents** | `PDF` | `TXT`, `DOCX`, `PPTX` | Apache PDFBox, Apache POI |
| **PDF → Images** | `PDF` | `PNG`, `JPG`, `JPEG`, `WebP`, `AVIF`, `TIFF` | Apache PDFBox (`PDFRenderer`) + ZIP archiving for multi-page |
| **Images → PDF** | `PNG`, `JPG`, `JPEG`, `WebP`, `AVIF`, `TIFF`, `SVG`, `ICO`, `GIF` | `PDF` | Apache PDFBox + Batik + TwelveMonkeys (single or multi-image compilation) |
| **Images → Images** | `PNG`, `JPG`, `JPEG`, `WebP`, `AVIF`, `TIFF`, `SVG`, `ICO`, `GIF` | `PNG`, `JPG`, `JPEG`, `WebP`, `AVIF`, `TIFF`, `SVG`, `ICO`, `GIF` | Java ImageIO, TwelveMonkeys, Batik Transcoder, FFmpeg |
| **Videos → Videos** | `MP4`, `MOV`, `MKV`, `WebM`, `AVI` | `MP4`, `MOV`, `MKV`, `WebM`, `AVI` | FFmpeg |

---

## System Requirements

- **Java Development Kit (JDK):** Version 21 or higher (Tested with Java 21 & Java 24)
- **Apache Maven:** Version 3.8+ (or use the included `./mvnw`)
- **FFmpeg (Optional for video and AVIF encoding):**
  - Auto-detected if installed on system `PATH` or at known Windows/Linux paths (e.g. `C:\Program Files\Shotcut\ffmpeg.exe`, `/usr/bin/ffmpeg`).
  - Or configure custom path in `application.properties`: `app.ffmpeg.path=...`
- **LibreOffice (Optional):**
  - If installed (`soffice`), will be used for native office-to-PDF rendering.
  - If not installed, pure Java POI + PDFBox engines are used automatically.

---

## Quick Start

### 1. Build and Run the Backend

```bash
cd backend

# Compile and package
mvn clean package

# Run the executable JAR
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

Or run directly with Maven:
```bash
mvn spring-boot:run
```

The server starts on `http://localhost:8080`.

### 2. Run the React Frontend

```bash
cd frontend

# Install dependencies (if not already installed)
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:5173` and automatically communicate with the backend on `http://localhost:8080`.

---

## Configuration (`application.properties`)

```properties
# Server port
server.port=8080

# Upload limits (Default: 100MB)
spring.servlet.multipart.max-file-size=100MB
spring.servlet.multipart.max-request-size=100MB

# Allowed CORS origins
app.cors.allowed-origins=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173

# External tool paths
app.ffmpeg.path=C:/Program Files/Shotcut/ffmpeg.exe
app.libreoffice.path=

# Temporary conversion scratch directory
app.conversion.temp-dir=${java.io.tmpdir}/flexconvert
```

---

## API Reference

### 1. Health Check
`GET /api/health`

**Response:**
```json
{
  "status": "UP",
  "ffmpegAvailable": true,
  "libreOfficeAvailable": false
}
```

### 2. File Conversion
`POST /api/convert`
`Content-Type: multipart/form-data`

#### Parameters:
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `file` | File | Conditional | The single file to convert (or use `files` for multi-file). |
| `files` | File[] | Conditional | Array of images when compiling multiple images into one PDF. |
| `targetFormat` | String | Yes | Target extension (e.g. `pdf`, `png`, `docx`, `mp4`, `webp`). |
| `pageSelection` | String | No | `all` (default) or `range` (for PDF page selection). |
| `pageStart` | Integer | No | Starting page (1-indexed, default 1). |
| `pageEnd` | Integer | No | Ending page (default 1). |
| `quality` | Integer | No | Image quality (1-100, default 90). |
| `dpi` | Integer | No | Resolution DPI for PDF rendering (default 150). |
| `pageSize` | String | No | `a4` (default) or `letter` (for Image-to-PDF). |
| `orientation` | String | No | `portrait` (default) or `landscape`. |
| `imageFit` | String | No | `fit` (default), `stretch`, or `original`. |

#### Response:
- **HTTP 200 OK** with stream of the converted file.
- Header `Content-Disposition: attachment; filename="document.pdf"`
- Header `Content-Type: application/pdf` (or target MIME type)
- Multi-page PDF to images returns `application/zip` containing all rendered pages.

#### Error Responses:
Standardized JSON error contract:
```json
{
  "success": false,
  "message": "Conversion from 'xyz' to 'pdf' is not supported.",
  "error": "UNSUPPORTED_CONVERSION",
  "timestamp": 1789550521345
}
```

---

## Running Automated Tests

The test suite validates all converters with real sample files:

```bash
cd backend
mvn test
```

Test coverage includes:
- `BackendApplicationTests`: Spring Boot context initialization.
- `HealthControllerTest`: Health endpoint status verification.
- `DocumentConversionTest`: TXT → PDF, DOCX → PDF, PPTX → PDF, PDF → TXT, PDF → DOCX, PDF → PPTX.
- `ImageConversionTest`: PNG → JPG, JPG → PNG, PNG → WebP, PNG → TIFF, Multi-image → PDF, PDF → Images ZIP.
- `VideoConversionTest`: Synthetic video generation and MP4 → WebM → MOV transcoding via FFmpeg.
- `ValidationAndErrorTest`: Invalid files, empty uploads, and unsupported conversions.
