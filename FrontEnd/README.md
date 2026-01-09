# StockPredict AI - Frontend

A React-based web application for stock market prediction using deep learning models integrated with sentiment analysis of financial news.

## Features

- **Dashboard**: Real-time stock market dashboard with interactive charts
- **Authentication**: Sign in/Sign up functionality
- **Stock Analysis**: View stock prices, market cap, volume, and sentiment scores
- **News Integration**: Latest financial news with sentiment analysis
- **AI Predictions**: 24-hour trend forecasts using machine learning
- **Responsive Design**: Mobile-friendly interface

## Project Structure

```
src/
├── components/          # Reusable React components
│   ├── Header.jsx      # App header with navigation
│   ├── Sidebar.jsx     # Stock watchlist and navigation
│   ├── StatsCards.jsx  # Stock statistics cards
│   ├── StockChart.jsx  # Stock price chart component
│   ├── NewsPanel.jsx   # Financial news panel
│   └── PredictionPanel.jsx # AI prediction results
├── pages/              # Main page components
│   ├── Dashboard.jsx   # Main dashboard page
│   ├── SignIn.jsx      # User authentication
│   └── SignUp.jsx      # User registration
├── styles/             # CSS stylesheets
│   ├── global.css      # Global styles and utilities
│   ├── auth.css        # Authentication page styles
│   ├── dashboard.css   # Dashboard layout styles
│   ├── sidebar.css     # Sidebar component styles
│   └── header.css      # Header component styles
└── utils/              # Utility functions
    └── helpers.js      # Common helper functions
```

## Installation

1. Navigate to the project directory:
   ```bash
   cd FrontEnd
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm eject` - Ejects from Create React App (one-way operation)

## Technology Stack

- **React 18** - Frontend framework
- **React Router** - Client-side routing
- **CSS3** - Custom styling (no external CSS frameworks)
- **JavaScript ES6+** - Modern JavaScript features

## Components Overview

### Authentication
- **SignIn**: User login with email/password
- **SignUp**: User registration with form validation

### Dashboard
- **Header**: App navigation and user menu
- **Sidebar**: Stock watchlist and menu navigation
- **StatsCards**: Key metrics display (price, market cap, volume, sentiment)
- **StockChart**: Interactive stock price visualization
- **NewsPanel**: Financial news with sentiment analysis
- **PredictionPanel**: AI-powered trend predictions

## Styling Approach

- Custom CSS without external frameworks (no Tailwind/Bootstrap)
- Responsive design for mobile and desktop
- Modern UI with gradients and animations
- Consistent color scheme and typography

## Mock Data

Currently uses mock data for demonstration. In production, this will be replaced with:
- Real-time stock data API
- Financial news API with sentiment analysis
- Machine learning prediction endpoints

## Future Enhancements

1. Integration with real stock market APIs
2. Advanced charting with technical indicators
3. Portfolio management features
4. Real-time WebSocket connections
5. Advanced filtering and search
6. Export functionality for reports
7. Dark mode support

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Follow the existing code structure
2. Use semantic component names
3. Maintain responsive design
4. Write clean, commented code
5. Test on multiple screen sizes

## License

This project is part of a deep learning stock prediction system.