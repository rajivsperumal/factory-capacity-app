# Factory Capacity Management App

Vendor capacity tracking system for Quince with Google Sheets backend.

## Quick Start - Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API URL

Open `src/App.jsx` and update line 13:

```javascript
const SHEETS_API_URL = 'YOUR_APPS_SCRIPT_URL_HERE';
```

Replace with your actual Google Apps Script Web App URL.

### 3. Run Locally

```bash
npm run dev
```

Visit http://localhost:5173

## Project Structure

```
factory-capacity-app/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── App.jsx             # Main app (all 5 parts combined)
│   └── main.jsx            # React entry point
├── package.json            # Dependencies
├── vite.config.js          # Vite configuration
└── .gitignore              # Git ignore rules
```

## Building for Production

```bash
npm run build
```

This creates a `dist/` folder ready for deployment.

## Deployment

See `CLOUDFLARE_DEPLOYMENT_GUIDE.md` for complete deployment instructions.

### Quick Deploy to Cloudflare Pages:

1. Push to GitHub
2. Connect GitHub to Cloudflare Pages
3. Build command: `npm run build`
4. Build output: `dist`
5. Deploy!

## Features

### Vendor Interface
- ✅ Vendor-specific login
- ✅ 52-week capacity calendar
- ✅ Week overrides (single & range)
- ✅ Sub-department capacity
- ✅ Dollar value limits
- ✅ Bulk CSV upload
- ✅ Submission history

### Production Team Interface
- ✅ Pending approvals workflow
- ✅ Vendor management
- ✅ Team member management
- ✅ Submission details viewer

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **Lucide React** - Icons
- **Google Sheets** - Database
- **Apps Script** - API backend

## Support

See the following guides:
- `CLOUDFLARE_DEPLOYMENT_GUIDE.md` - Deployment instructions
- `ASSEMBLY_GUIDE.md` - How the app is structured
- `IMPLEMENTATION_GUIDE.md` - Google Sheets setup

## License

Private - Quince Internal Use Only
