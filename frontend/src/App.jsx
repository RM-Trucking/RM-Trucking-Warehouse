import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Router from './routes';
import { setNavigator } from './utils/axios';

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    setNavigator(navigate);
  }, [navigate]);

  return (
    <>
     <Router/>
    </>
  )
}

export default App
