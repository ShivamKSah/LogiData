import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { databaseService } from '@/services/databaseService';

(async () => {
  try {
    // 🟢 Delete logs on startup (can add condition here if needed)
    await databaseService.deleteAllAPILogs();
    console.log("✅ API logs cleared on app startup.");
  } catch (error) {
    console.error("❌ Failed to delete API logs on startup:", error);
  }

  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
})();

