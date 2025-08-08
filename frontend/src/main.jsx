import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';

document.body.classList.add('theme-basilisk'); // default accent class if you want to swap later
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
