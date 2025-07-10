import React from 'react';
import { AppBar, Toolbar, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function Header() {
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem('auth');
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar style={{ justifyContent: 'space-between' }}>
        <div>
          <Button color="inherit" onClick={() => navigate('/dashboard')}>Home</Button>
          <Button color="inherit" onClick={() => navigate('/reconciliation/add')}>Add</Button>
          <Button color="inherit" onClick={() => navigate('/reconciliation/edit')}>Edit</Button>
          <Button color="inherit" onClick={() => navigate('/reconciliation/check')}>As Of Check</Button>
          <Button color="inherit" onClick={() => navigate('/reconciliation/search')}>Search</Button>
        </div>
        <Button color="inherit" onClick={logout}>Logout</Button>
      </Toolbar>
    </AppBar>
  );
}

export default Header;