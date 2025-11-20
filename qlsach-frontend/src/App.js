import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import SachTable from './components/SachTable';
import './App.css';

function App() {
  return (
    <div className="App">
      <div className="bg-primary text-white py-3 mb-4">
        <div className="container">
          <h1 className="mb-0"> Blockchain Book Management System</h1>
          <p className="mb-0">Powered by Hyperledger Fabric & React.js</p>
        </div>
      </div>
      
      <SachTable />
      
      <footer className="bg-dark text-white text-center py-3 mt-5">
        <div className="container">
          <p className="mb-0">© 2024 QLSach Blockchain App - Hyperledger Fabric</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
