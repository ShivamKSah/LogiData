# Record Insight API

A modern, full-stack dashboard for uploading, validating, and analyzing CSV datasets with real-time API logging, analytics, and AI-powered insights.

[![Live Demo](https://img.shields.io/badge/Live-Demo-green)](YOUR_LIVE_LINK_HERE)

---

## 🚀 Features
- **CSV Upload & Validation**: Drag-and-drop CSV upload with instant validation and feedback.
- **Data Records Table**: View, search, and manage uploaded records.
- **API Logs**: Real-time API request/response logs, auto-cleared per session/upload.
- **Analytics**: Visualize your data with interactive charts.
- **AI Assistant**: Ask questions about your data using natural language.
- **Supabase Integration**: Secure, scalable backend for data and logs.
- **Modern UI**: Built with React, TailwindCSS, and best UX practices.

---

## 🗺️ Application Flow

### Main Flowchart
```mermaid
flowchart TD
    A[User uploads CSV file] --> B[FileUpload Component]
    B --> C[CSV Validation]
    C --> D[Store in Supabase]
    D --> E[RecordsTable updates]
    D --> F[ApiLogs updates]
    E --> G[DataVisualization]
    E --> H[AiAssistant]
    F --> I[ApiLogs Tab]
    G --> J[Analytics Tab]
    H --> K[AI Assistant Tab]
```

### Architecture Diagram
```mermaid
flowchart LR
    U[User] -- Upload CSV --> FU[FileUpload]
    FU -- Validates --> V[CSVValidation]
    V -- Stores Data --> DB[(Supabase DB)]
    DB -- Fetches Records --> RT[RecordsTable]
    DB -- Fetches Logs --> AL[ApiLogs]
    RT -- Shows Data --> UI1[Records Tab]
    AL -- Shows Logs --> UI2[API Logs Tab]
    DB -- Data for Charts --> DV[DataVisualization]
    DB -- Data for AI --> AI[AiAssistant]
    DV -- Shows Analytics --> UI3[Analytics Tab]
    AI -- Answers Questions --> UI4[AI Assistant Tab]
```

### Sequence Diagram
```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend (React)
    participant BE as Backend (Supabase)
    U->>FE: Upload CSV
    FE->>FE: Validate CSV
    FE->>BE: Store CSV data
    FE->>BE: Store API logs
    FE->>BE: Fetch records/logs for display
    BE-->>FE: Return records/logs
    FE->>U: Show records, logs, analytics, AI answers
```

---

## 🛠️ Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/record-insight-api.git
cd record-insight-api
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Supabase
- Create a [Supabase](https://supabase.com/) project.
- Copy your Supabase credentials to `src/integrations/supabase/client.ts`.
- Run any migrations in `supabase/migrations/` if needed.

### 4. Start the development server
```bash
npm run dev
```

### 5. Open in your browser
Visit [http://localhost:8080](http://localhost:8080)

---

## 📖 Usage Guide
- **Upload Tab**: Drag and drop your CSV files to upload and validate.
- **Records Tab**: View and search your uploaded data. Blank until a file is uploaded.
- **Analytics Tab**: Visualize your data with charts.
- **AI Assistant Tab**: Ask questions about your data in plain English.
- **API Logs Tab**: Monitor API requests and responses. Logs are cleared on refresh or new upload.

---

## 🧩 Technologies Used
- **Frontend**: React, TypeScript, TailwindCSS, Vite
- **Backend**: Supabase (Postgres, Auth, Storage)
- **Visualization**: Chart.js
- **AI**: OpenAI API (optional, for AI Assistant)

---

## 🤝 Contributing
1. Fork this repo
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

---

## 📄 License
This project is licensed under the MIT License.

---

