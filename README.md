# 🏠 Boomerang — Real Estate Platform

<p align="center">
  <strong>A polished real-estate product concept focused on property discovery, exploration, comparison, and agent workflows.</strong><br />
  Built as a responsive React application with a premium editorial visual direction.
</p>

<p align="center">
  <a href="https://boomerangrealestate.netlify.app/">🌐 Live Demo</a> ·
  <a href="https://github.com/harshitdev-wq/Boomerang-Real-Estate-Website/issues">🐛 Report an issue</a> ·
  <a href="https://github.com/harshitdev-wq/Boomerang-Real-Estate-Website/issues">💡 Suggest an improvement</a>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

---

## ✦ What is Boomerang?

Boomerang is a frontend-heavy real-estate platform concept built around one idea:

> **Make property discovery feel as considered as the properties themselves.**

The interface combines a premium visual system with practical product flows for buyers, renters, agents, and administrators.

**Demo notice:** listings, agents, inquiries, statistics, and marketplace information are sample data. This is not a real property marketplace.

## 🚀 Product Experience

### For property seekers

- 🔎 Browse and search property listings
- 🗺️ Explore properties through a map view
- 🏡 Open detailed property pages
- 📸 Explore property media and gallery experiences
- ⚖️ Compare properties side by side
- ❤️ Save properties for later
- 📅 Interact with visit/request flows

### For agents

- ➕ Create and manage property listings
- 💬 Work with inquiries
- 📅 Review visit requests
- 📊 Access a dashboard-style workspace

### Platform

- 🛠️ Admin console concept
- 📚 API documentation interface
- 🔔 Global toast feedback
- 🧭 Client-side route handling
- 🧩 Reusable React architecture
- 📱 Responsive desktop, tablet, and mobile layouts

## 🎨 Design Direction

The visual language intentionally moves away from the typical real-estate template:

- Editorial typography hierarchy
- Restrained neutral palette
- Fine borders instead of heavy shadows
- Large imagery with controlled aspect ratios
- Generous whitespace
- Subtle interaction states
- Strong responsive spacing discipline

The goal is **premium without becoming visually noisy**.

## 🧱 Architecture

```text
src/
├── assets/              # Images and static visual assets
├── components/          # Reusable interface components
├── context/             # Shared application state
├── data/                # Demo property and platform data
├── lib/                 # Routing and utility logic
├── pages/               # Product-level screens
│   ├── HomePage
│   ├── BrowsePage
│   ├── PropertyPage
│   ├── ComparePage
│   ├── DashboardPage
│   ├── ListingForm
│   ├── AdminPanel
│   └── ApiDocsPage
├── App.tsx              # Application shell and routing
├── index.css            # Global styles
└── main.tsx             # React entry point

index.html
package.json
vite.config.ts
tsconfig.json
```

The application shell composes navigation, routing, shared state, comparison UI, authentication UI, footer, and toast feedback. The source confirms these are part of the current app structure.

## 🛠️ Tech Stack

| Technology | Role |
| --- | --- |
| **React 19** | Component-driven UI |
| **TypeScript 5.9** | Type-safe application development |
| **Vite 7** | Development and production tooling |
| **Tailwind CSS 4** | Responsive styling |
| **Leaflet** | Interactive map experience |
| **Lucide React** | Interface icons |
| **clsx** | Conditional class composition |
| **tailwind-merge** | Tailwind utility merging |

## ⚡ Getting Started

### Requirements

- Node.js 18+
- npm

### Clone

```bash
git clone https://github.com/harshitdev-wq/Boomerang-Real-Estate-Website.git
cd Boomerang-Real-Estate-Website
```

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

### Production build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## 🌐 Live Demo

**[Open Boomerang](https://boomerangrealestate.netlify.app/)**

## 🧠 Engineering Focus

This project was built to practise the parts of frontend development that matter once a page grows beyond a single landing screen:

- Reusable React components
- Shared application state
- Route-driven page composition
- Responsive layout systems
- Interactive property workflows
- Modal and drawer interactions
- Feedback/toast states
- Map-based exploration
- Comparison flows
- Dashboard-style interfaces
- Maintainable TypeScript structure

## 📱 Responsive Strategy

The interface is designed around real device constraints rather than a single desktop canvas. Particular attention is given to fluid gutters, responsive grids, image sizing, text wrapping, touch-friendly controls, mobile navigation, horizontal-overflow prevention, and consistent section spacing.

## 🔭 Roadmap

- [ ] Real property API integration
- [ ] Production authentication/backend
- [ ] Persistent user accounts and saved homes
- [ ] Real-time inquiry messaging
- [ ] Production map/search services
- [ ] Image upload pipeline
- [ ] Agent verification workflow
- [ ] Automated testing and CI

## ⚠️ Demo Data Notice

Boomerang is a portfolio/demo project. Property listings, agents, inquiries, statistics, and other marketplace information are sample data and should not be treated as real estate listings or financial information.

## 🤝 Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the contribution workflow.

## 📄 License

This project is released under the **MIT License**. See [`LICENSE`](./LICENSE) for details.

---

<p align="center">
  Built by <strong>Harshit Singh</strong> · Designed to learn by building real product interfaces.
</p>
