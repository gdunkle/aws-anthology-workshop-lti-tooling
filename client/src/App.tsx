import React from 'react';
import './App.css';
import LTIToolExample from './components/LTIToolExample';

let full_name = '';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        Welcome {full_name}
      </header>
      <LTIToolExample />
    </div>
  );
}

export default App;
